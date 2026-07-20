import { randomUUID } from "node:crypto";
import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { generateCopy } from "@/lib/ai/generate";
import { saveGeneration } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import { copyGenerationInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = copyGenerationInputSchema.parse(body);
    const profile = await getCafeProfile().catch((profileError) => {
      console.error("[safil profile context]", profileError);
      return null;
    });
    const { output, isSample } = await generateCopy(input, profile);

    let record;
    try {
      const saved = await saveGeneration({
        type: "copy",
        input,
        options: output.options,
        isSample,
      });
      record = { ...saved, persisted: true, profileApplied: Boolean(profile) };
    } catch (saveError) {
      console.error("[safil generation save]", saveError);
      record = {
        id: `local-${randomUUID()}`,
        type: "copy" as const,
        input,
        options: output.options,
        selectedIndex: null,
        copied: false,
        downloaded: false,
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
