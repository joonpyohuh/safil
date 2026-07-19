import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { getCafeProfile, saveCafeProfile } from "@/lib/profile";
import { cafeProfileInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk(await getCafeProfile());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const input = cafeProfileInputSchema.parse(body);
    return jsonOk(await saveCafeProfile(input));
  } catch (error) {
    return handleRouteError(error);
  }
}
