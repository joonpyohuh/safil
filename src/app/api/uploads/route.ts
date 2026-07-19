import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb, getUploadsDir, schema } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api-helpers";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("업로드할 사진 파일을 선택해 주세요.", 400);
    }
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return jsonError("JPG, PNG, WEBP 형식의 사진만 올릴 수 있어요.", 400);
    }
    if (file.size === 0 || file.size > MAX_SIZE) {
      return jsonError("사진 크기는 8MB 이하여야 해요.", 400);
    }

    const id = randomUUID();
    const storedName = `${id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(getUploadsDir(), storedName), buffer);

    getDb()
      .insert(schema.uploads)
      .values({
        id,
        storedName,
        originalName: file.name.slice(0, 200),
        mime: file.type,
        size: file.size,
        createdAt: Date.now(),
      })
      .run();

    return jsonOk({ id, storedName, url: `/api/files/${storedName}` }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
