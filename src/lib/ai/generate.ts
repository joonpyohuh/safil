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
  type ImageShotBrief,
} from "./prompts";
import { buildCafeLearningContext } from "./cafe-context";
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
    const learning = await buildCafeLearningContext(profile);
    const output = await callStructured(
      buildCopySystemPrompt(profile, learning),
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

const PLAN_TEMPLATES = [
  "fade_bottom",
  "story_chip",
  "glass_center",
  "frame_border",
  "side_rail",
  "bottom_card",
  "bold_cover",
  "minimal_bar",
] as const;

const PLAN_COMPOSITIONS = [
  "hero_closeup",
  "atmosphere_wide",
  "detail_macro",
  "tabletop_story",
  "overhead_flatlay",
  "offcenter_portrait",
] as const;

type PlanTemplate = (typeof PLAN_TEMPLATES)[number];
type PlanComposition = (typeof PLAN_COMPOSITIONS)[number];

type ImagePlanOption = {
  headline: string;
  subline: string;
  templateId: PlanTemplate;
  composition: PlanComposition;
  heroSubject: string;
  shotBrief: string;
};

type ImagePlan = {
  cafeSymbol: string;
  suggestedTitle: string;
  options: ImagePlanOption[];
};

const COMPOSITION_HINTS: Record<PlanComposition, string> = {
  hero_closeup:
    "Tight hero close-up, shallow depth of field, subject fills center-upper frame, soft bokeh background.",
  atmosphere_wide:
    "Wider atmospheric shot of the cafe space or table setting, inviting depth, window light, room to breathe.",
  detail_macro:
    "Macro detail focus (foam texture, beans, wood grain, pour), intimate and tactile, strong focal point.",
  tabletop_story:
    "Styled tabletop arrangement with the hero item and natural cafe props, storytelling angle ~45 degrees.",
  overhead_flatlay:
    "Clean overhead flat-lay, symmetric or rule-of-thirds, neat negative space for caption.",
  offcenter_portrait:
    "Subject placed off-center (rule of thirds), generous empty space on one side for caption overlay.",
};

const imagePlanSchema = z.object({
  cafeSymbol: z
    .string()
    .describe("사진에서 찾은 카페 상징/홍보 포인트 한 줄 한글"),
  suggestedTitle: z.string().describe("12자 이내 한글 제목 제안"),
  options: z
    .array(
      z.object({
        headline: z.string().describe("12자 이내 한글 헤드라인"),
        subline: z.string().describe("18자 이내 보조 문구, 없으면 빈 문자열"),
        templateId: z.enum(PLAN_TEMPLATES),
        composition: z.enum(PLAN_COMPOSITIONS),
        heroSubject: z.string().describe("영어, 강조할 피사체"),
        shotBrief: z
          .string()
          .describe("영어 2~3문장 촬영 지시. 평면 배경 금지, 재구도 명시"),
      }),
    )
    .describe("서로 다른 구도·템플릿 두 안"),
});

function fallbackPlan(input: ImageGenerationInput): ImagePlan {
  const title = input.title || purposeLabels[input.purpose];
  const subject = input.message || title || "signature cafe drink";
  return {
    cafeSymbol: input.message || "카페의 시그니처 분위기",
    suggestedTitle: title,
    options: [
      {
        headline: title,
        subline: input.message.slice(0, 18),
        templateId: "fade_bottom",
        composition: "hero_closeup",
        heroSubject: subject,
        shotBrief:
          "Recompose as a hero close-up promotional photo. Do not use the reference as a flat background. Emphasize the signature item with shallow depth of field.",
      },
      {
        headline: title,
        subline: "",
        templateId: "glass_center",
        composition: "atmosphere_wide",
        heroSubject: subject,
        shotBrief:
          "Recompose as a wider atmospheric cafe scene. Different angle from a product close-up. Keep the space inviting with soft natural light.",
      },
    ],
  };
}

function toShotBrief(plan: ImagePlan, index: 0 | 1): ImageShotBrief {
  const option = plan.options[index] ?? plan.options[0]!;
  const composition = option.composition ?? (index === 0 ? "hero_closeup" : "atmosphere_wide");
  return {
    cafeSymbol: plan.cafeSymbol,
    heroSubject: option.heroSubject || plan.cafeSymbol,
    composition: `${composition}. ${COMPOSITION_HINTS[composition]}`,
    shotBrief: option.shotBrief || COMPOSITION_HINTS[composition],
  };
}

async function planImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  learning: string,
): Promise<ImagePlan> {
  const openai = getOpenAI();
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" } };
  const content: ContentPart[] = [
    { type: "text", text: buildImagePlanUserPrompt(input) },
  ];
  // 첫 장은 high로 상징 요소를 더 잘 보고, 나머지는 low (비용 균형)
  input.photoPaths.slice(0, 3).forEach((path, index) => {
    content.push({
      type: "image_url",
      image_url: {
        url: publicUploadUrl(path),
        detail: index === 0 ? "high" : "low",
      },
    });
  });

  const completion = await openai.chat.completions.parse(
    {
      model: getTextModel(),
      messages: [
        { role: "system", content: buildImagePlanSystemPrompt(profile, learning) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: content as any },
      ],
      response_format: zodResponseFormat(imagePlanSchema, "image_plan"),
      max_completion_tokens: 700,
      reasoning_effort: "minimal",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { timeout: 22_000 },
  );
  const parsed = completion.choices[0]?.message.parsed as ImagePlan | null;
  if (!parsed || parsed.options.length < 2) throw new Error("PLAN_FAILED");
  // 구도가 같으면 두 번째를 강제 분기
  if (parsed.options[0]?.composition === parsed.options[1]?.composition) {
    parsed.options[1]!.composition =
      parsed.options[0]!.composition === "hero_closeup"
        ? "atmosphere_wide"
        : "hero_closeup";
  }
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
  shot: ImageShotBrief,
  variant: "clean" | "warm",
  referenceFiles: ReferenceFile[],
): Promise<{ storedName: string; url: string; usedReferencePhotos: boolean }> {
  const openai = getOpenAI();
  const prompt = buildImageBackgroundPrompt(input, profile, shot, variant);
  const model = getImageModel();
  let b64: string | undefined;
  let usedReferencePhotos = false;

  // 구도 다양성: 참고 사진은 최대 2장만 전달 (너무 많으면 edit이 평면 합성으로  degenerates)
  const editFiles = referenceFiles.slice(0, 2);

  if (editFiles.length > 0) {
    try {
      const edited = await openai.images.edit(
        {
          model,
          image: editFiles.length === 1 ? editFiles[0]! : editFiles,
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
  const learning = await buildCafeLearningContext(profile);
  let plan: ImagePlan;
  try {
    plan = await planImage(input, profile, learning);
  } catch (planError) {
    console.error("[safil image plan fallback]", planError);
    plan = fallbackPlan(input);
  }

  const referenceFiles =
    input.photoPaths.length > 0 ? await loadReferenceFiles(input.photoPaths) : [];

  const shotA = toShotBrief(plan, 0);
  const shotB = toShotBrief(plan, 1);

  // 안마다 다른 구도 브리프로 병렬 생성 (같은 사진을 평면 배경으로 쓰지 않음)
  const [clean, warm] = await Promise.all([
    generateBackground(input, profile, shotA, "clean", referenceFiles),
    generateBackground(input, profile, shotB, "warm", referenceFiles),
  ]);

  const headlineA = input.title || plan.options[0]?.headline || plan.suggestedTitle;
  const headlineB = input.title || plan.options[1]?.headline || plan.suggestedTitle;
  const symbol = plan.cafeSymbol?.trim();
  const photoNoteFor = (used: boolean) => {
    if (used && symbol) return `"${symbol}"을(를) 살려 `;
    if (used) return "올려주신 사진의 포인트를 살려 ";
    if (input.photoPaths.length > 0) return "사진 반영이 어려워 새로 그렸고, ";
    return "";
  };

  const templateA = plan.options[0]?.templateId ?? "fade_bottom";
  const templateB =
    plan.options[1]?.templateId && plan.options[1].templateId !== templateA
      ? plan.options[1].templateId
      : templateA === "glass_center"
        ? "bold_cover"
        : "glass_center";

  const compLabel = (c?: PlanComposition) =>
    c === "hero_closeup"
      ? "클로즈업"
      : c === "atmosphere_wide"
        ? "분위기 와이드"
        : c === "detail_macro"
          ? "디테일"
          : c === "tabletop_story"
            ? "테이블 연출"
            : c === "overhead_flatlay"
              ? "탑뷰"
              : c === "offcenter_portrait"
                ? "여백 구도"
                : "다른 구도";

  const options: ImageOption[] = [
    {
      imagePath: clean.storedName,
      imageUrl: clean.url,
      headline: headlineA.slice(0, 16),
      subline: plan.options[0]?.subline?.slice(0, 18) ?? "",
      dateText: input.dateText,
      templateId: templateA,
      palette: "auto",
      usedReferencePhotos: clean.usedReferencePhotos,
      reason: `${photoNoteFor(clean.usedReferencePhotos)}${compLabel(plan.options[0]?.composition)} 구도로 만들었어요.`,
    },
    {
      imagePath: warm.storedName,
      imageUrl: warm.url,
      headline: headlineB.slice(0, 16),
      subline: plan.options[1]?.subline?.slice(0, 18) ?? "",
      dateText: input.dateText,
      templateId: templateB,
      palette: "auto",
      usedReferencePhotos: warm.usedReferencePhotos,
      reason: `${photoNoteFor(warm.usedReferencePhotos)}${compLabel(plan.options[1]?.composition)} 구도로 만들었어요.`,
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
