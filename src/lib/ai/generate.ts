import { z } from "zod";
import { toFile } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  AI_IMAGE_TIMEOUT_MS,
  AI_TEXT_TIMEOUT_MS,
  getImageModel,
  getOpenAI,
  getTextModel,
  isAiConfigured,
} from "./client";
import {
  buildCopySystemPrompt,
  buildCopyUserPrompt,
  buildImageBackgroundPrompt,
  buildImagePlanSystemPrompt,
  buildImagePlanUserPrompt,
  buildNoticeSystemPrompt,
  buildNoticeUserPrompt,
} from "./prompts";
import { sampleCopy, sampleImage, sampleNotice } from "./samples";
import { mobileMsg } from "@/lib/mobile-messages";
import { downloadUpload, publicUploadUrl, uploadImageBuffer } from "@/lib/storage";
import {
  copyOptionSchema,
  noticeOptionSchema,
  purposeLabels,
  type CafeProfile,
  type CopyGenerationInput,
  type CopyGenerationOutput,
  type ImageGenerationInput,
  type ImageGenerationOutput,
  type ImageOption,
  type NoticeGenerationInput,
  type NoticeGenerationOutput,
} from "@/lib/schemas";

export type GenerationResult<T> = {
  output: T;
  isSample: boolean;
};

async function callStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  optionSchema: z.ZodType<T>,
  expectedCount: number,
  schemaName: string,
): Promise<{ options: T[] }> {
  const openai = getOpenAI();
  const responseSchema = z.object({ options: z.array(optionSchema) });
  const base = {
    model: getTextModel(),
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
    response_format: zodResponseFormat(responseSchema, schemaName),
    max_completion_tokens: 1200,
  };

  let completion;
  try {
    completion = await openai.chat.completions.parse(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { ...base, reasoning_effort: "minimal" } as any,
      { timeout: AI_TEXT_TIMEOUT_MS },
    );
  } catch (firstError) {
    console.error("[safil structured retry]", firstError);
    completion = await openai.chat.completions.parse(base, {
      timeout: AI_TEXT_TIMEOUT_MS,
    });
  }

  const parsed = completion.choices[0]?.message.parsed as
    | { options: T[] }
    | null
    | undefined;
  if (!parsed || parsed.options.length < expectedCount) {
    throw new Error(mobileMsg.ai.insufficient);
  }
  return { options: parsed.options.slice(0, expectedCount) };
}

export async function generateCopy(
  input: CopyGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<CopyGenerationOutput>> {
  if (!isAiConfigured()) {
    return { output: sampleCopy(input, profile), isSample: true };
  }
  try {
    const output = await callStructured(
      buildCopySystemPrompt(profile),
      buildCopyUserPrompt(input),
      copyOptionSchema,
      3,
      "promo_copy",
    );
    return { output, isSample: false };
  } catch (error) {
    console.error("[safil copy fallback]", error);
    return { output: sampleCopy(input, profile), isSample: true };
  }
}

// ---------------------------------------------------------------------------
// Promotional image
// 1) 비전으로 사진 분위기·문구 기획 → 2) 글자 없는 배경 2장 병렬 생성
// 한글 문구는 클라이언트 캔버스에서 얹으므로 AI 한글 깨짐이 없다.
// ---------------------------------------------------------------------------

type ImagePlan = {
  scene: string;
  suggestedTitle: string;
  options: { headline: string; subline: string }[];
};

const imagePlanSchema = z.object({
  scene: z.string().describe("영어 한 문장, 사진의 피사체와 분위기"),
  suggestedTitle: z.string().describe("12자 이내 한글 제목 제안"),
  options: z
    .array(
      z.object({
        headline: z.string().describe("12자 이내 한글 헤드라인"),
        subline: z.string().describe("18자 이내 보조 문구, 없으면 빈 문자열"),
      }),
    )
    .describe("서로 다른 두 안"),
});

function fallbackPlan(input: ImageGenerationInput): ImagePlan {
  const title = input.title || purposeLabels[input.purpose];
  return {
    scene: "",
    suggestedTitle: title,
    options: [
      { headline: title, subline: input.message.slice(0, 18) },
      { headline: title, subline: "" },
    ],
  };
}

async function planImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<ImagePlan> {
  const openai = getOpenAI();
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" } };
  const content: ContentPart[] = [
    { type: "text", text: buildImagePlanUserPrompt(input) },
  ];
  for (const path of input.photoPaths.slice(0, 3)) {
    content.push({
      type: "image_url",
      image_url: { url: publicUploadUrl(path), detail: "low" },
    });
  }

  const completion = await openai.chat.completions.parse(
    {
      model: getTextModel(),
      messages: [
        { role: "system", content: buildImagePlanSystemPrompt(profile) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: content as any },
      ],
      response_format: zodResponseFormat(imagePlanSchema, "image_plan"),
      max_completion_tokens: 400,
      reasoning_effort: "minimal",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { timeout: 15_000 },
  );
  const parsed = completion.choices[0]?.message.parsed as ImagePlan | null;
  if (!parsed || parsed.options.length < 2) throw new Error("PLAN_FAILED");
  return parsed;
}

type ReferenceFile = Awaited<ReturnType<typeof toFile>>;

async function loadReferenceFiles(photoPaths: string[]): Promise<ReferenceFile[]> {
  const files: ReferenceFile[] = [];
  for (const path of photoPaths) {
    const { buffer, contentType } = await downloadUpload(path);
    files.push(await toFile(buffer, path, { type: contentType }));
  }
  return files;
}

async function generateBackground(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  scene: string,
  variant: "clean" | "warm",
  referenceFiles: ReferenceFile[],
): Promise<{ storedName: string; url: string; usedReferencePhotos: boolean }> {
  const openai = getOpenAI();
  const prompt = buildImageBackgroundPrompt(input, profile, scene, variant);
  const model = getImageModel();
  let b64: string | undefined;
  let usedReferencePhotos = false;

  if (referenceFiles.length > 0) {
    try {
      const files = referenceFiles;
      const edited = await openai.images.edit(
        {
          model,
          image: files.length === 1 ? files[0]! : files,
          prompt,
          size: "1024x1024",
          quality: "medium",
        },
        { timeout: AI_IMAGE_TIMEOUT_MS },
      );
      b64 = edited.data?.[0]?.b64_json ?? undefined;
      usedReferencePhotos = Boolean(b64);
    } catch (error) {
      console.error("[safil image edit fallback]", error);
    }
  }

  if (!b64) {
    const generated = await openai.images.generate(
      {
        model,
        prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
      },
      { timeout: AI_IMAGE_TIMEOUT_MS },
    );
    b64 = generated.data?.[0]?.b64_json ?? undefined;
  }

  if (!b64) throw new Error(mobileMsg.image.generateFailed);
  const uploaded = await uploadImageBuffer(Buffer.from(b64, "base64"), "image/png");
  return {
    storedName: uploaded.storedName,
    url: publicUploadUrl(uploaded.storedName),
    usedReferencePhotos,
  };
}

export async function generateImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<ImageGenerationOutput>> {
  if (!isAiConfigured()) {
    return { output: sampleImage(input, profile), isSample: true };
  }
  // 런타임 실패는 체험용으로 숨기지 않고 그대로 에러를 올린다 (정직한 안내)
  let plan: ImagePlan;
  try {
    plan = await planImage(input, profile);
  } catch (planError) {
    console.error("[safil image plan fallback]", planError);
    plan = fallbackPlan(input);
  }

  const referenceFiles =
    input.photoPaths.length > 0 ? await loadReferenceFiles(input.photoPaths) : [];

  const [clean, warm] = await Promise.all([
    generateBackground(input, profile, plan.scene, "clean", referenceFiles),
    generateBackground(input, profile, plan.scene, "warm", referenceFiles),
  ]);

  const headlineA = input.title || plan.options[0]?.headline || plan.suggestedTitle;
  const headlineB = input.title || plan.options[1]?.headline || plan.suggestedTitle;
  const photoNoteFor = (used: boolean) =>
    used
      ? "올려주신 사진을 바탕으로 "
      : input.photoPaths.length > 0
        ? "사진 반영이 어려워 새로 그렸고, "
        : "";

  const options: ImageOption[] = [
    {
      imagePath: clean.storedName,
      imageUrl: clean.url,
      headline: headlineA.slice(0, 16),
      subline: plan.options[0]?.subline?.slice(0, 18) ?? "",
      dateText: input.dateText,
      templateId: "bottom_band",
      palette: "cream",
      usedReferencePhotos: clean.usedReferencePhotos,
      reason: `${photoNoteFor(clean.usedReferencePhotos)}밝고 깔끔한 분위기로 만들었어요. 글자는 아래에서 바로 고칠 수 있어요.`,
    },
    {
      imagePath: warm.storedName,
      imageUrl: warm.url,
      headline: headlineB.slice(0, 16),
      subline: plan.options[1]?.subline?.slice(0, 18) ?? "",
      dateText: input.dateText,
      templateId: "bottom_band",
      palette: "espresso",
      usedReferencePhotos: warm.usedReferencePhotos,
      reason: `${photoNoteFor(warm.usedReferencePhotos)}따뜻하고 아늑한 분위기로 만들었어요. 글자는 아래에서 바로 고칠 수 있어요.`,
    },
  ];

  return { output: { options }, isSample: false };
}

export async function generateNotice(
  input: NoticeGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<NoticeGenerationOutput>> {
  if (!isAiConfigured()) {
    return { output: sampleNotice(input, profile), isSample: true };
  }
  const output = await callStructured(
    buildNoticeSystemPrompt(profile),
    buildNoticeUserPrompt(input),
    noticeOptionSchema,
    2,
    "store_notice",
  );
  return { output, isSample: false };
}
