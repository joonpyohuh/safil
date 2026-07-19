import fs from "node:fs/promises";
import path from "node:path";
import { getUploadsDir } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";

export const runtime = "nodejs";

// Only server-assigned names (uuid + known extension) are ever stored,
// so anything else is rejected before touching the filesystem.
const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!SAFE_NAME.test(name)) {
    return jsonError("잘못된 파일 경로입니다.", 400);
  }
  const filePath = path.join(getUploadsDir(), name);
  try {
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[path.extname(name)] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return jsonError("파일을 찾을 수 없습니다.", 404);
  }
}
