import { randomUUID } from "node:crypto";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api-helpers";
import { mobileMsg } from "@/lib/mobile-messages";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_SIZE = 12 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const BUCKET = "uploads";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return jsonError(mobileMsg.upload.storageNotReady, 503);
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError(mobileMsg.upload.noFile, 400);
    }
    const ext = ALLOWED_MIME[file.type];
    if (!ext) return jsonError(mobileMsg.upload.badType, 400);
    if (file.size === 0 || file.size > MAX_SIZE) {
      return jsonError(mobileMsg.upload.tooLarge, 400);
    }

    const id = randomUUID();
    const storedName = `${id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(storedName, buffer, { contentType: file.type, upsert: false });
    if (error) throw error;

    return jsonOk(
      { id, storedName, url: `/api/files/${storedName}` },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
