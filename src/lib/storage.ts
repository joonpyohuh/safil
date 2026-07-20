import { randomUUID } from "node:crypto";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

const BUCKET = "uploads";

export async function uploadImageBuffer(
  buffer: Buffer,
  contentType: "image/png" | "image/jpeg" | "image/webp" = "image/png",
): Promise<{ storedName: string; url: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const ext =
    contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  const storedName = `${randomUUID()}.${ext}`;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(storedName, buffer, { contentType, upsert: false });
  if (error) throw error;

  return { storedName, url: `/api/files/${storedName}` };
}

export async function downloadUpload(storedName: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const { data, error } = await getSupabase().storage.from(BUCKET).download(storedName);
  if (error || !data) throw error ?? new Error("UPLOAD_NOT_FOUND");
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || "image/png" };
}
