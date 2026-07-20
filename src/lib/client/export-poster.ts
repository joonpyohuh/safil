import { toPng, toBlob } from "html-to-image";
import { POSTER_SIZE } from "@/components/create/promo-poster";

const EXPORT_OPTS = {
  width: POSTER_SIZE,
  height: POSTER_SIZE,
  pixelRatio: 1,
  cacheBust: true,
  // 외부 폰트/이미지 로드 대기
  skipFonts: false,
};

/** HTML 포스터 노드를 PNG data URL로 변환 */
export async function posterToPng(node: HTMLElement): Promise<string> {
  // 폰트 로드 대기 (한글 렌더 품질)
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }
  return toPng(node, EXPORT_OPTS);
}

/** HTML 포스터 노드를 Blob으로 변환 (공유·다운로드용) */
export async function posterToBlob(node: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }
  const blob = await toBlob(node, EXPORT_OPTS);
  if (!blob) {
    // 일부 브라우저 폴백
    const dataUrl = await toPng(node, EXPORT_OPTS);
    const res = await fetch(dataUrl);
    return res.blob();
  }
  return blob;
}
