import { z } from "zod";
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
  IMAGE_MOOD_LABELS,
  noticeOptionSchema,
  purposeLabels,
  type CafeProfile,
  type CopyGenerationInput,
  type CopyGenerationOutput,
  type ImageGenerationInput,
  type ImageGenerationOutput,
  type ImageMood,
  type ImageOption,
  type NoticeGenerationInput,
  type NoticeGenerationOutput,
  type PhotoTreatment,
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
// Promotional image — Instagram specialty-cafe style (나무사이로·커피리브르 참고)
// 3안: 메뉴 클로즈업 / 공간·분위기 / 소식·안내 — 무드·용도·사진 처리가 다름
// ---------------------------------------------------------------------------

type DesignTemplate =
  | "fade_bottom"
  | "cream_panel"
  | "glass_center"
  | "frame_border"
  | "side_rail"
  | "split_sheet"
  | "bold_cover"
  | "minimal_bar";

type VariationSpec = {
  mood: ImageMood;
  useCase: string;
  templateId: DesignTemplate;
  treatment: PhotoTreatment;
  palette: "auto" | "cream" | "espresso" | "forest" | "berry";
  reason: string;
};

/** 레퍼런스 기반 고정 3안 — 방향성이 확실히 갈림 */
const IG_VARIATIONS: VariationSpec[] = [
  {
    mood: "menu_hero",
    useCase: "메뉴·원두 소개 피드 (나무사이로식 제품 클로즈업)",
    templateId: "fade_bottom",
    treatment: "warm_film",
    palette: "auto",
    reason:
      "메뉴를 크게 보여주는 에디토리얼 톤이에요. 인스타 피드에서 멈추게 하는 용도예요.",
  },
  {
    mood: "space_story",
    useCase: "매장 분위기·방문 유도 스토리/피드",
    templateId: "side_rail",
    treatment: "moody_editorial",
    palette: "espresso",
    reason:
      "공간과 브랜드 감성을 살린 안이에요. ‘이런 곳에서 쉬고 싶다’는 느낌을 줘요.",
  },
  {
    mood: "promo_clear",
    useCase: "가격·기간·행사 안내 (커피리브르식 또렷한 정보)",
    templateId: "bold_cover",
    treatment: "clean_bright",
    palette: "cream",
    reason:
      "소식·행사를 또렷하게 전하는 안이에요. 저장해 두고 바로 올리기 좋아요.",
  },
];

function pickHeadline(
  input: ImageGenerationInput,
  mood: ImageMood,
  brandCue: string,
): string {
  if (input.title.trim()) return input.title.trim().slice(0, 16);
  const first = input.message.split(/[\n,·|]/)[0]?.trim() ?? "";
  if (mood === "promo_clear") return (first || purposeLabels[input.purpose]).slice(0, 16);
  if (mood === "space_story") return (brandCue || first || "오늘의 카페").slice(0, 16);
  return (first || purposeLabels[input.purpose]).slice(0, 16);
}

/** 사진 없을 때만 — 글자 없는 배경 1장 (WebP) */
async function generateAiBackgroundOnce(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<{ storedName: string; url: string }> {
  const openai = getOpenAI();
  const brand = buildBrandVisualBrief(profile);
  const prompt = [
    "Professional Instagram square (1:1) photorealistic Korean specialty cafe scene.",
    "Inspired by refined independent cafes (soft natural light, honest materials, calm negative space).",
    "NO text, letters, numbers, logos, watermarks, or UI.",
    brand?.englishLook ?? "Independent Korean neighborhood specialty cafe.",
    `Purpose mood: ${purposeLabels[input.purpose]}.`,
    "High-end food/interior photography. Not franchise stock look.",
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
  const bodyText = input.message.trim();
  const brandCue = (
    brand?.defaultSubline ||
    brand?.concept ||
    brand?.location ||
    ""
  ).slice(0, 18);
  const cafeName = brand?.cafeName || profile?.name || "";
  const cafeLocation = brand?.location || profile?.location || "";
  const hasPhotos = input.photoPaths.length > 0;

  let sharedBg: { storedName: string; url: string; usedReferencePhotos: boolean };

  if (hasPhotos) {
    const path = input.photoPaths[0]!;
    sharedBg = {
      storedName: path,
      url: publicUploadUrl(path),
      usedReferencePhotos: true,
    };
  } else {
    if (!isAiConfigured()) {
      return { output: sampleImage(input, profile), isSample: true };
    }
    const aiBg = await generateAiBackgroundOnce(input, profile);
    sharedBg = { ...aiBg, usedReferencePhotos: false };
  }

  // 사진이 2장 이상이면 안마다 다른 원본을 섞어 variation 강화
  const photoPaths = hasPhotos
    ? [
        input.photoPaths[0]!,
        input.photoPaths[1] ?? input.photoPaths[0]!,
        input.photoPaths[2] ?? input.photoPaths[0]!,
      ]
    : null;

  const options: ImageOption[] = IG_VARIATIONS.map((spec, index) => {
    const path = photoPaths ? photoPaths[index]! : sharedBg.storedName;
    const url = photoPaths ? publicUploadUrl(path) : sharedBg.url;
    return {
      imagePath: path,
      imageUrl: url,
      headline: pickHeadline(input, spec.mood, brandCue),
      subline: brandCue,
      bodyText,
      dateText: input.dateText,
      templateId: spec.templateId,
      palette: spec.palette,
      usedReferencePhotos: hasPhotos,
      cafeName,
      cafeLocation,
      brandCue,
      mood: spec.mood,
      moodLabel: IMAGE_MOOD_LABELS[spec.mood],
      useCase: spec.useCase,
      photoTreatment: spec.treatment,
      reason: hasPhotos
        ? `${spec.reason} 원본 사진을 ${spec.treatment === "warm_film" ? "따뜻한 필름" : spec.treatment === "clean_bright" ? "맑고 또렷한" : "무디한 에디토리얼"} 느낌으로 다르게 연출했어요.`
        : spec.reason,
    };
  });

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
