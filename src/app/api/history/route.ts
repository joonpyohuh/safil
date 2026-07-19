import { handleRouteError, jsonOk } from "@/lib/api-helpers";
import { listGenerations } from "@/lib/history";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) || undefined : undefined;
    return jsonOk(await listGenerations({ type, limit }));
  } catch (error) {
    return handleRouteError(error);
  }
}
