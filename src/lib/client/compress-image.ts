/**
 * 휴대폰 사진(HEIC 포함, 수십 MB)을 업로드 가능한 JPEG로 변환·압축한다.
 * 브라우저가 디코딩할 수 있는 모든 포맷을 지원한다 (iOS Safari는 HEIC 네이티브 디코딩).
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function decodeToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // imageOrientation: EXIF 회전 정보 반영 (돌아간 사진 방지)
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // createImageBitmap이 포맷을 못 읽는 경우 <img> 디코딩으로 폴백
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function compressImageFile(file: File): Promise<File> {
  // 이미 작고 호환되는 포맷이면 그대로 사용
  const compatible = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (compatible && file.size <= 1.5 * 1024 * 1024) return file;

  const source = await decodeToBitmap(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("DECODE_FAILED");

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_FAILED");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("ENCODE_FAILED");

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
