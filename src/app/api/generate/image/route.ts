import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { generateImage } from "@/lib/ai/generate";
import { saveGeneration } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import { imageGenerationInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = imageGenerationInputSchema.parse(body);
    const profile = await getCafeProfile();
    const { output, isSample } = await generateImage(input, profile);
    const record = await saveGeneration({
      type: "image",
      input,
      options: output.options,
      isSample,
    });
    return jsonOk(record, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
