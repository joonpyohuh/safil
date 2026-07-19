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
    const profile = getCafeProfile();
    const { output, isSample } = await generateCopy(input, profile);
    const record = saveGeneration({
      type: "copy",
      input,
      options: output.options,
      isSample,
    });
    return jsonOk(record, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
