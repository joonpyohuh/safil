import { z } from "zod";
import { toFile } from "openai";
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
import { researchCafeVisualMood } from "./cafe-visual-research";
import { sampleCopy, sampleImage, sampleNotice } from "./samples";
import { mobileMsg } from "@/lib/mobile-messages";
import {
  downloadUpload,
  publicUploadUrl,
  uploadImageBuffer,
} from "@/lib/storage";
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
// Promotional image — AI가 새로 그리는 홍보 이미지 3안
// 카페 인스타·리뷰 비주얼 리서치 + (있으면) 사장님 사진 참고
// 한글 문구는 포스터 레이어에 그대로 얹음 (이미지 속 글자 금지)
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
  /** 영어 — 구도·피사체 지시 */
  shotEnglish: string;
};

const IG_VARIATIONS: VariationSpec[] = [
  {
    mood: "menu_hero",
    useCase: "메뉴·원두 소개 피드 (나무사이로식 제품 클로즈업)",
    templateId: "fade_bottom",
    treatment: "warm_film",
    palette: "auto",
    reason:
      "인스타·매장 분위기를 보고 메뉴가 돋보이게 새로 그린 안이에요.",
    shotEnglish:
      "Hero close-up of signature drink or pastry on ceramic, shallow depth of field, soft window light, warm film tones, generous lower negative space for typography. Specialty Korean cafe product still.",
  },
  {
    mood: "space_story",
    useCase: "매장 분위기·방문 유도 스토리/피드",
    templateId: "side_rail",
    treatment: "moody_editorial",
    palette: "espresso",
    reason:
      "공간 감성을 살린 새로 그린 안이에요. ‘이런 곳에서 쉬고 싶다’는 느낌이에요.",
    shotEnglish:
      "Atmospheric wide interior of an independent Korean cafe: seating, materials, daylight, calm negative space on one side for typography. Editorial Instagram space story, lived-in but refined.",
  },
  {
    mood: "promo_clear",
    useCase: "가격·기간·행사 안내 (커피리브르식 또렷한 정보)",
    templateId: "bold_cover",
    treatment: "clean_bright",
    palette: "cream",
    reason:
      "소식을 또렷히 전하도록 밝고 깔끔하게 새로 그린 안이에요.",
    shotEnglish:
      "Clean bright tabletop or counter still life with coffee tools or simple plating, high key light, clear center subject, soft background blur, open space for bold promo typography. Not cluttered.",
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

function buildMoodPrompt(params: {
  spec: VariationSpec;
  brandEnglish: string;
  visualEnglish: string;
  photoEnglish: string;
  purpose: string;
}): string {
  return [
    "Create a NEW photorealistic Instagram square (1:1) promotional still for a Korean specialty cafe.",
    "This must be a freshly composed advertising photograph — NOT a flat reuse of an uploaded snapshot.",
    "NO text, letters, numbers, logos, watermarks, UI, or captions in the image.",
    params.spec.shotEnglish,
    `Cafe visual research (Instagram/reviews): ${params.visualEnglish}`,
    params.brandEnglish ? `Brand identity: ${params.brandEnglish}` : "",
    params.photoEnglish
      ? `Owner photo reference (match materials/food look, but reinvent framing and lighting): ${params.photoEnglish}`
      : "",
    `Campaign purpose mood: ${params.purpose}.`,
    "High-end cafe photography. Not franchise stock. Distinct independent Korean cafe aesthetic.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 사장님 사진 1장을 보고 영어 시각 단서 추출 */
async function describeOwnerPhoto(path: string): Promise<string> {
  try {
    const { buffer, contentType } = await downloadUpload(path);
    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create(
      {
        model: getSearchModel(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Describe this Korean cafe photo for remaking a NEW promotional ad still.",
                  "Focus on subject, materials, colors, lighting, plating, interior cues.",
                  "English, max 5 sentences. No invented brand claims. Do not mention text in the photo.",
                ].join(" "),
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${buffer.toString("base64")}`,
                },
              },
            ],
          },
        ],
        max_completion_tokens: 280,
      },
      { timeout: 14_000 },
    );
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (error) {
    console.error("[safil photo describe]", error);
    return "";
  }
}

async function generateAiStill(params: {
  prompt: string;
  referencePath?: string;
}): Promise<{ storedName: string; url: string }> {
  const openai = getOpenAI();
  let b64: string | undefined;

  if (params.referencePath) {
    try {
      const { buffer, contentType } = await downloadUpload(params.referencePath);
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
      const file = await toFile(buffer, `ref.${ext}`, {
        type: contentType.startsWith("image/") ? contentType : "image/jpeg",
      });
      const edited = await openai.images.edit(
        {
          model: getImageModel(),
          image: file,
          prompt: params.prompt,
          size: "1024x1024",
          quality: "medium",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        { timeout: AI_IMAGE_TIMEOUT_MS },
      );
      b64 = edited.data?.[0]?.b64_json;
    } catch (error) {
      console.error("[safil image edit fallback to generate]", error);
    }
  }

  if (!b64) {
    const generated = await openai.images.generate(
      {
        model: getImageModel(),
        prompt: params.prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "webp",
      },
      { timeout: AI_IMAGE_TIMEOUT_MS },
    );
    b64 = generated.data?.[0]?.b64_json;
  }

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
  if (!isAiConfigured()) {
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
  const referencePath = hasPhotos ? input.photoPaths[0] : undefined;

  const [visualMood, photoEnglish] = await Promise.all([
    researchCafeVisualMood(profile),
    referencePath ? describeOwnerPhoto(referencePath) : Promise.resolve(""),
  ]);

  const brandEnglish = brand?.englishLook ?? "";
  const purpose = purposeLabels[input.purpose];

  const stills = await Promise.all(
    IG_VARIATIONS.map((spec) =>
      generateAiStill({
        prompt: buildMoodPrompt({
          spec,
          brandEnglish,
          visualEnglish: visualMood.englishVisual,
          photoEnglish,
          purpose,
        }),
        referencePath,
      }),
    ),
  );

  const moodHint = visualMood.koreanMood
    ? ` (${visualMood.koreanMood})`
    : "";

  const options: ImageOption[] = IG_VARIATIONS.map((spec, index) => {
    const still = stills[index]!;
    return {
      imagePath: still.storedName,
      imageUrl: still.url,
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
      reason: `${spec.reason}${moodHint}`,
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
