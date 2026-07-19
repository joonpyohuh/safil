import { jsonError } from "@/lib/api-helpers";
import { mobileMsg } from "@/lib/mobile-messages";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const BUCKET = "uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!SAFE_NAME.test(name)) {
    return jsonError(mobileMsg.upload.badPath, 400);
  }
  if (!isSupabaseConfigured()) {
    return jsonError(mobileMsg.upload.storageNotReady, 503);
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${base}/storage/v1/object/public/${BUCKET}/${name}`;
  return Response.redirect(url, 302);
}
