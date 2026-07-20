import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  AI_IMAGE_TIMEOUT_MS,
  AI_TEXT_TIMEOUT_MS,
  getImageModel,
  getOpenAI,
  getSearchModel,
  getTextModel,
  isAiConfigured,
} from "./client";
import {
  buildCopySystemPrompt,
  buildCopyUserPrompt,
  buildNoticeSystemPrompt,
  buildNoticeUserPrompt,
} from "./prompts";
import { buildBrandVisualBrief } from "./brand-visual";
import { buildCafeLearningContext } from "./cafe-context";
import { sampleCopy, sampleImage, sampleNotice } from "./samples";
import { mobileMsg } from "@/lib/mobile-messages";
import { publicUploadUrl, uploadImageBuffer } from "@/lib/storage";
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
// - 사진 있음: 원본 사진 URL로 광고 디자인 2안 (이미지 API 호출 없음)
// - 사진 없음: AI 배경 1장 생성 + 디자인 템플릿 2안
// 한글·사실 문구는 클라이언트 포스터에 그대로 얹음
// ---------------------------------------------------------------------------

const DESIGN_TEMPLATES = [
  "fade_bottom",
  "cream_panel",
  "glass_center",
  "frame_border",
  "side_rail",
  "split_sheet",
  "bold_cover",
  "minimal_bar",
] as const;

type DesignTemplate = (typeof DESIGN_TEMPLATES)[number];

type DesignPlan = {
  suggestedTitle: string;
  brandCue: string;
  templates: [DesignTemplate, DesignTemplate];
};

const designPlanSchema = z.object({
  suggestedTitle: z
    .string()
    .describe("12자 이내 한글 제목. 사용자 제목이 있으면 그걸 존중해 짧게"),
  brandCue: z.string().describe("브랜드 한 줄 큐 18자 이내"),
  templateA: z.enum(DESIGN_TEMPLATES),
  templateB: z.enum(DESIGN_TEMPLATES),
});

const TEMPLATE_PAIRS: Array<[DesignTemplate, DesignTemplate]> = [
  ["fade_bottom", "cream_panel"],
  ["glass_center", "split_sheet"],
  ["side_rail", "bold_cover"],
  ["frame_border", "minimal_bar"],
  ["cream_panel", "fade_bottom"],
];

function pickTemplatePair(seed: string): [DesignTemplate, DesignTemplate] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return TEMPLATE_PAIRS[h % TEMPLATE_PAIRS.length]!;
}

function fallbackDesignPlan(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): DesignPlan {
  const brand = buildBrandVisualBrief(profile);
  const title =
    input.title.trim() ||
    input.message.split(/[\n,·|]/)[0]?.trim().slice(0, 12) ||
    purposeLabels[input.purpose];
  return {
    suggestedTitle: title.slice(0, 12),
    brandCue: (brand?.defaultSubline || brand?.concept || brand?.location || "").slice(
      0,
      18,
    ),
    templates: pickTemplatePair(`${input.purpose}:${input.message}`),
  };
}

async function planDesignOnly(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  learning: string,
): Promise<DesignPlan> {
  if (!isAiConfigured()) return fallbackDesignPlan(input, profile);
  const brand = buildBrandVisualBrief(profile);
  const openai = getOpenAI();
  const completion = await openai.chat.completions.parse(
    {
      model: getSearchModel(),
      messages: [
        {
          role: "system",
          content: [
            "카페 인스타 광고 아트디렉터. 한국어.",
            "사용자 '꼭 알릴 내용'은 절대 요약·각색·가격·기간 추가 금지.",
            "제목만 짧게 제안하고, 서로 다른 고급 템플릿 2개를 고른다.",
            brand ? `브랜드: ${brand.koreanIdentity}` : "",
            learning ? `학습:\n${learning.slice(0, 500)}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          role: "user",
          content: [
            `목적: ${purposeLabels[input.purpose]}`,
            input.title ? `사장님 제목(존중): ${input.title}` : "제목 없음 — 본문 첫 줄로 짧게",
            `꼭 알릴 내용(본문에 그대로 쓸 예정, 바꾸지 말 것):\n${input.message}`,
            input.dateText ? `기간/날짜: ${input.dateText}` : "",
            `사진 ${input.photoPaths.length}장 ${input.photoPaths.length ? "(원본 사진 사용)" : "(AI 배경)"}`,
            "templateA/B는 서로 다르게.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: zodResponseFormat(designPlanSchema, "poster_design"),
      max_completion_tokens: 400,
    },
    { timeout: 14_000 },
  );
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) return fallbackDesignPlan(input, profile);
  const a = parsed.templateA;
  const b = parsed.templateB === a
    ? (DESIGN_TEMPLATES.find((t) => t !== a) ?? "cream_panel")
    : parsed.templateB;
  return {
    suggestedTitle: (input.title.trim() || parsed.suggestedTitle).slice(0, 12),
    brandCue: (parsed.brandCue || brand?.defaultSubline || "").slice(0, 18),
    templates: [a, b],
  };
}

/** 사진 없을 때만 — 글자 없는 배경 1장 (WebP) */
async function generateAiBackgroundOnce(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<{ storedName: string; url: string }> {
  const openai = getOpenAI();
  const brand = buildBrandVisualBrief(profile);
  const prompt = [
    "Professional Instagram square (1:1) photorealistic cafe background for advertising design.",
    "NO text, letters, numbers, logos, watermarks, or UI.",
    brand?.englishLook ?? "Independent Korean neighborhood cafe atmosphere.",
    `Mood for purpose "${purposeLabels[input.purpose]}". Soft negative space for typography overlay.`,
    "High-end food/interior photography. Not a generic franchise chain look.",
  ].join(" ");

  const generated = await openai.images.generate(
    {
      model: getImageModel(),
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "webp",
    },
    { timeout: AI_IMAGE_TIMEOUT_MS },
  );
  const b64 = generated.data?.[0]?.b64_json;
  if (!b64) throw new Error(mobileMsg.image.generateFailed);
  const uploaded = await uploadImageBuffer(Buffer.from(b64, "base64"), "image/webp");
  return {
    storedName: uploaded.storedName,
    url: publicUploadUrl(uploaded.storedName),
  };
}

export async function generateImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<ImageGenerationOutput>> {
  if (!isAiConfigured() && input.photoPaths.length === 0) {
    return { output: sampleImage(input, profile), isSample: true };
  }

  const brand = buildBrandVisualBrief(profile);
  const learning = await buildCafeLearningContext(profile).catch(() => "");
  let plan: DesignPlan;
  try {
    plan = await planDesignOnly(input, profile, learning);
  } catch (error) {
    console.error("[safil design plan fallback]", error);
    plan = fallbackDesignPlan(input, profile);
  }

  const bodyText = input.message.trim();
  const headline = (input.title.trim() || plan.suggestedTitle).slice(0, 16);
  const brandCue = (
    plan.brandCue ||
    brand?.defaultSubline ||
    brand?.concept ||
    ""
  ).slice(0, 18);
  const cafeName = brand?.cafeName || profile?.name || "";
  const cafeLocation = brand?.location || profile?.location || "";
  const hasPhotos = input.photoPaths.length > 0;

  let bgA: { storedName: string; url: string; usedReferencePhotos: boolean };
  let bgB: { storedName: string; url: string; usedReferencePhotos: boolean };

  if (hasPhotos) {
    // 원본 사진 그대로 — 이미지 생성 API 없음
    const pathA = input.photoPaths[0]!;
    const pathB = input.photoPaths[1] ?? pathA;
    bgA = {
      storedName: pathA,
      url: publicUploadUrl(pathA),
      usedReferencePhotos: true,
    };
    bgB = {
      storedName: pathB,
      url: publicUploadUrl(pathB),
      usedReferencePhotos: true,
    };
  } else {
    if (!isAiConfigured()) {
      return { output: sampleImage(input, profile), isSample: true };
    }
    const aiBg = await generateAiBackgroundOnce(input, profile);
    bgA = { ...aiBg, usedReferencePhotos: false };
    bgB = { ...aiBg, usedReferencePhotos: false };
  }

  const [tA, tB] = plan.templates;
  const options: ImageOption[] = [
    {
      imagePath: bgA.storedName,
      imageUrl: bgA.url,
      headline,
      subline: brandCue,
      bodyText,
      dateText: input.dateText,
      templateId: tA,
      palette: "auto",
      usedReferencePhotos: bgA.usedReferencePhotos,
      cafeName,
      cafeLocation,
      brandCue,
      reason: hasPhotos
        ? "올려주신 사진을 그대로 쓰고, 광고 레이아웃만 다르게 입혔어요."
        : "사진이 없어 AI 배경 위에 광고 레이아웃 2안을 만들었어요.",
    },
    {
      imagePath: bgB.storedName,
      imageUrl: bgB.url,
      headline,
      subline: brandCue,
      bodyText,
      dateText: input.dateText,
      templateId: tB,
      palette: "auto",
      usedReferencePhotos: bgB.usedReferencePhotos,
      cafeName,
      cafeLocation,
      brandCue,
      reason: hasPhotos
        ? pathLabel(input.photoPaths.length > 1)
        : "같은 배경에 다른 레이아웃으로 보이게 했어요.",
    },
  ];

  return { output: { options }, isSample: false };
}

function pathLabel(multi: boolean): string {
  return multi
    ? "다른 사진으로 두 번째 레이아웃을 만들었어요."
    : "같은 사진에 다른 레이아웃을 입혔어요.";
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
