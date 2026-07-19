import { handleRouteError, jsonError, jsonOk } from "@/lib/api-helpers";
import { mobileMsg } from "@/lib/mobile-messages";
import { deleteGeneration, getGeneration, patchGeneration } from "@/lib/history";
import { historyPatchSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const record = await getGeneration(id);
    if (!record) return jsonError(mobileMsg.history.notFound, 404);
    return jsonOk(record);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const patch = historyPatchSchema.parse(await request.json());
    const record = await patchGeneration(id, patch);
    if (!record) return jsonError(mobileMsg.history.notFound, 404);
    return jsonOk(record);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await deleteGeneration(id);
    if (!deleted) return jsonError(mobileMsg.history.notFound, 404);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
