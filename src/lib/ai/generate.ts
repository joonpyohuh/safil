import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getModel, getOpenAI, isAiConfigured } from "./client";
import {
  buildCopySystemPrompt,
  buildCopyUserPrompt,
  buildImageSystemPrompt,
  buildImageUserPrompt,
  buildNoticeSystemPrompt,
  buildNoticeUserPrompt,
} from "./prompts";
import { sampleCopy, sampleImage, sampleNotice } from "./samples";
import {
  copyOptionSchema,
  imageOptionSchema,
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

// OpenAI structured outputs reject array length constraints, so the model is
// asked for an unconstrained array and the count is enforced here.
async function callStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  optionSchema: z.ZodType<T>,
  expectedCount: number,
  schemaName: string,
): Promise<{ options: T[] }> {
  const openai = getOpenAI();
  const responseSchema = z.object({ options: z.array(optionSchema) });
  const completion = await openai.chat.completions.parse({
    model: getModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(responseSchema, schemaName),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed || parsed.options.length < expectedCount) {
    throw new Error("AI가 충분한 결과를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
  const output = await callStructured(
    buildCopySystemPrompt(profile),
    buildCopyUserPrompt(input),
    copyOptionSchema,
    3,
    "promo_copy",
  );
  return { output, isSample: false };
}

export async function generateImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): Promise<GenerationResult<ImageGenerationOutput>> {
  if (!isAiConfigured()) {
    return { output: sampleImage(input, profile), isSample: true };
  }
  const output = await callStructured(
    buildImageSystemPrompt(profile),
    buildImageUserPrompt(input),
    imageOptionSchema,
    2,
    "promo_image_spec",
  );
  return { output, isSample: false };
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
