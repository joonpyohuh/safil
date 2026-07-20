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
  buildImagePrompt,
  buildNoticeSystemPrompt,
  buildNoticeUserPrompt,
} from "./prompts";
import { sampleCopy, sampleImage, sampleNotice } from "./samples";
import { mobileMsg } from "@/lib/mobile-messages";
import { downloadUpload, uploadImageBuffer } from "@/lib/storage";
import {
  copyOptionSchema,
  noticeOptionSchema,
  type CafeProfile,
  type CopyGenerationInput,
  type CopyGenerationOutput,
  type ImageGenerationInput,
  type ImageGenerationOutput,
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

async function loadReferenceFiles(photoPaths: string[]) {
  const files = [];
  for (const path of photoPaths) {
    const { buffer, contentType } = await downloadUpload(path);
    files.push(await toFile(buffer, path, { type: contentType }));
  }
  return files;
}

async function generateOneImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  variant: "clean" | "warm",
): Promise<ImageGenerationOutput["options"][number]> {
  const openai = getOpenAI();
  const prompt = buildImagePrompt(input, profile, variant);
  const model = getImageModel();
  let b64: string | undefined;
  let usedReferencePhotos = false;
  const photoCount = input.photoPaths.length;

  if (photoCount > 0) {
    try {
      const files = await loadReferenceFiles(input.photoPaths);
      const edited = await openai.images.edit(
        {
          model,
          image: files.length === 1 ? files[0]! : files,
          prompt: `${prompt} Keep the provided cafe/menu photos recognizable. Add clear promotional text. Do not invent fake food appearance.`,
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
  const photoReason = usedReferencePhotos
    ? photoCount > 1
      ? `올려주신 사진 ${photoCount}장을 참고해 `
      : "올려주신 사진을 참고해 "
    : photoCount > 0
      ? "사진 반영이 어려워 제목 중심으로 새로 그렸고, "
      : "";
  return {
    imagePath: uploaded.storedName,
    imageUrl: uploaded.url,
    headline: input.title,
    usedReferencePhotos,
    reason:
      variant === "clean"
        ? `${photoReason}글씨가 잘 보이도록 깔끔하게 정리한 버전이에요.`
        : `${photoReason}카페 분위기가 따뜻하게 느껴지도록 만든 버전이에요.`,
  };
}

export async function generateImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<ImageGenerationOutput>> {
  if (!isAiConfigured()) {
    return { output: sampleImage(input, profile), isSample: true };
  }
  try {
    const options = await Promise.all([
      generateOneImage(input, profile, "clean"),
      generateOneImage(input, profile, "warm"),
    ]);
    return { output: { options }, isSample: false };
  } catch (error) {
    console.error("[safil image fallback]", error);
    return { output: sampleImage(input, profile), isSample: true };
  }
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
