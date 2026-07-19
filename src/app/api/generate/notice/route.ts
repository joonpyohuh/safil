import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { generateNotice } from "@/lib/ai/generate";
import { saveGeneration } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import { noticeGenerationInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = noticeGenerationInputSchema.parse(body);
    const profile = await getCafeProfile();
    const { output, isSample } = await generateNotice(input, profile);
    const record = await saveGeneration({
      type: "notice",
      input,
      options: output.options,
      isSample,
    });
    return jsonOk(record, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
