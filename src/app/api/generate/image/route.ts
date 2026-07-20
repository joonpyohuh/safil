import { randomUUID } from "node:crypto";
import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { generateImage } from "@/lib/ai/generate";
import { saveGeneration } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import { imageGenerationInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = imageGenerationInputSchema.parse(body);
    const profile = await getCafeProfile().catch((profileError) => {
      console.error("[safil image profile]", profileError);
      return null;
    });
    const { output, isSample } = await generateImage(input, profile);

    let record;
    try {
      const saved = await saveGeneration({
        type: "image",
        input,
        options: output.options,
        isSample,
      });
      record = { ...saved, persisted: true, profileApplied: Boolean(profile) };
    } catch (saveError) {
      console.error("[safil image save]", saveError);
      record = {
        id: `local-${randomUUID()}`,
        type: "image" as const,
        input,
        options: output.options,
        selectedIndex: null,
        copied: false,
        downloaded: false,
        posted: false,
        postedAt: null,
        discardedIndices: [],
        isSample,
        persisted: false,
        profileApplied: Boolean(profile),
        createdAt: Date.now(),
      };
    }
    return jsonOk(record, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
