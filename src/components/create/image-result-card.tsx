"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagePalette, ImageTemplate } from "@/lib/schemas";
import {
  IMAGE_TEMPLATE_LABELS,
  imagePaletteValues,
  imageTemplateValues,
  normalizeImageTemplate,
} from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import {
  extractPosterColors,
  PRESET_COLORS,
  type PosterColors,
} from "@/lib/client/extract-colors";
import { posterToBlob } from "@/lib/client/export-poster";
import { PromoPoster, POSTER_SIZE } from "@/components/create/promo-poster";
import { MarkPostedButton } from "@/components/history/mark-posted-button";

const EDIT_TEMPLATES = imageTemplateValues.filter(
  (t) => !["bottom_band", "top_band", "center_card"].includes(t),
) as ImageTemplate[];

const EDIT_PALETTES = imagePaletteValues;

type ImageResultCardProps = {
  label: string;
  imageUrl: string;
  initialHeadline: string;
  initialSubline: string;
  initialDateText: string;
  initialTemplate: ImageTemplate;
  initialPalette: ImagePalette;
  cafeName?: string;
  reason?: string;
  isSample?: boolean;
  usedReferencePhotos?: boolean;
  shareTitle: string;
  persistId?: string;
  onSaved?: () => void;
};

export function ImageResultCard({
  label,
  imageUrl,
  initialHeadline,
  initialSubline,
  initialDateText,
  initialTemplate,
  initialPalette,
  cafeName,
  reason,
  isSample,
  usedReferencePhotos,
  shareTitle,
  persistId,
  onSaved,
}: ImageResultCardProps) {
  /** 내보내기 전용 1080 노드 (화면 밖) */
  const exportRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const blobSeqRef = useRef(0);
  const scaleWrapRef = useRef<HTMLDivElement>(null);

  const [headline, setHeadline] = useState(initialHeadline);
  const [subline, setSubline] = useState(initialSubline);
  const [dateText, setDateText] = useState(initialDateText);
  const [templateId, setTemplateId] = useState<ImageTemplate>(
    normalizeImageTemplate(initialTemplate),
  );
  const [palette, setPalette] = useState<ImagePalette>(
    initialPalette === "auto" || PRESET_COLORS[initialPalette as keyof typeof PRESET_COLORS]
      ? initialPalette
      : "auto",
  );
  const [colors, setColors] = useState<PosterColors>(PRESET_COLORS.espresso);
  const [scale, setScale] = useState(0.35);
  const [imageReady, setImageReady] = useState(false);
  const [blobReady, setBlobReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"share" | "download" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const el = scaleWrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / POSTER_SIZE);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImageReady(false);
    (async () => {
      if (palette === "auto") {
        const extracted = await extractPosterColors(imageUrl);
        if (!cancelled) setColors(extracted);
      } else if (palette in PRESET_COLORS) {
        if (!cancelled) setColors(PRESET_COLORS[palette as keyof typeof PRESET_COLORS]);
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = imageUrl;
      });
      if (!cancelled) setImageReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, palette]);

  const rebuildBlob = useCallback(async () => {
    const node = exportRef.current;
    if (!node || !imageReady) return;
    const seq = ++blobSeqRef.current;
    blobRef.current = null;
    setBlobReady(false);
    try {
      // 레이아웃·이미지 페인트 한 프레임 대기
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      const blob = await posterToBlob(node);
      if (seq === blobSeqRef.current) {
        blobRef.current = blob;
        setBlobReady(true);
      }
    } catch (err) {
      console.error("[safil poster export]", err);
      if (seq === blobSeqRef.current) setBlobReady(false);
    }
  }, [imageReady, headline, subline, dateText, templateId, colors, cafeName]);

  useEffect(() => {
    if (!imageReady) return;
    const t = window.setTimeout(() => {
      void rebuildBlob();
    }, 180);
    return () => window.clearTimeout(t);
  }, [imageReady, rebuildBlob]);

  function downloadBlobFile(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function getBlob(): Promise<Blob> {
    if (blobRef.current) return blobRef.current;
    const node = exportRef.current;
    if (!node) throw new Error("EXPORT_FAILED");
    const blob = await posterToBlob(node);
    blobRef.current = blob;
    setBlobReady(true);
    return blob;
  }

  async function markDownloaded() {
    onSaved?.();
    if (persistId) {
      await fetchWithTimeout(`/api/history/${persistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloaded: true }),
      }).catch(() => null);
    }
  }

  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
  }

  /** 핸드폰: 공유 시트로 '이미지 저장' → 갤러리. PC: 파일 다운로드 */
  async function saveToGallery() {
    setError("");
    setStatus("");
    setPending("download");
    try {
      const blob = await getBlob();
      const fileName = `${headline || "safil"}-홍보이미지.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (isMobileDevice() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: shareTitle,
          });
          setStatus("공유 화면에서 '이미지 저장' 또는 '사진에 추가'를 누르면 갤러리에 들어가요.");
          await markDownloaded();
          return;
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name === "AbortError") return;
        }
      }

      downloadBlobFile(blob, fileName);
      setStatus(
        isMobileDevice()
          ? "파일을 받았어요. 안 보이면 미리보기를 길게 눌러 저장해 주세요."
          : "이미지를 저장했어요.",
      );
      await markDownloaded();
    } catch {
      setError("저장하지 못했어요. 미리보기를 길게 눌러 저장해 주세요.");
    } finally {
      setPending(null);
    }
  }

  async function shareToApps() {
    setError("");
    setStatus("");
    setPending("share");
    try {
      const blob = await getBlob();
      const fileName = `${headline || "safil"}-홍보이미지.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle, text: shareTitle });
          setStatus("공유할 앱을 골라 인스타그램에 올려보세요.");
          await markDownloaded();
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name === "AbortError") return;
          setError("공유하지 못했어요. 갤러리 저장을 이용해 주세요.");
        }
      } else {
        await saveToGallery();
      }
    } catch {
      setError("공유하지 못했어요. 갤러리 저장을 이용해 주세요.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null || !imageReady || !blobReady;
  const posterProps = {
    imageUrl,
    headline,
    subline,
    dateText,
    cafeName,
    templateId,
    colors,
  };

  return (
    <article className="card flex flex-col gap-3">
      {/* 내보내기 전용 1080px — 화면 밖 고정 */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: POSTER_SIZE,
          height: POSTER_SIZE,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <PromoPoster posterRef={exportRef} {...posterProps} scale={1} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-brand">{label}</span>
        <div className="flex items-center gap-1.5">
          {usedReferencePhotos !== undefined && !isSample && (
            <span
              className={`rounded-full px-2 py-1 text-[0.6875rem] font-semibold ${
                usedReferencePhotos
                  ? "bg-brand-soft text-brand"
                  : "bg-cream text-ink-soft"
              }`}
            >
              {usedReferencePhotos ? "사진 반영" : "새로 그림"}
            </span>
          )}
          {isSample && (
            <span className="rounded-full bg-cream px-2 py-1 text-[0.6875rem] text-ink-soft">
              체험용
            </span>
          )}
        </div>
      </div>

      <div
        ref={scaleWrapRef}
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream"
      >
        <PromoPoster {...posterProps} scale={scale} />
        {!imageReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/80">
            <span className="text-sm font-semibold text-ink-soft">미리보기 준비 중…</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
      >
        {editing ? "꾸미기 닫기" : "글자·레이아웃·색 바꾸기"}
      </button>

      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl bg-cream p-3">
          <p className="text-xs leading-5 text-ink-soft">
            바꾸는 즉시 미리보기에 반영돼요. 다시 만들 필요 없어요.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">제목 (16자까지)</span>
            <input
              className="field"
              maxLength={16}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">보조 문구 (18자까지)</span>
            <input
              className="field"
              maxLength={18}
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">날짜/기간 (16자까지)</span>
            <input
              className="field"
              maxLength={16}
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-ink-soft">레이아웃</legend>
            <div className="grid grid-cols-2 gap-2">
              {EDIT_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip !min-h-11 !text-xs ${templateId === t ? "chip-active" : ""}`}
                  onClick={() => setTemplateId(t)}
                  aria-pressed={templateId === t}
                >
                  {IMAGE_TEMPLATE_LABELS[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-ink-soft">색</legend>
            <div className="grid grid-cols-3 gap-2">
              {EDIT_PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip !min-h-11 !text-xs ${palette === p ? "chip-active" : ""}`}
                  onClick={() => setPalette(p)}
                  aria-pressed={palette === p}
                >
                  {p === "auto"
                    ? "사진 맞춤"
                    : p === "cream"
                      ? "크림"
                      : p === "espresso"
                        ? "진갈색"
                        : p === "forest"
                          ? "딥그린"
                          : "버건디"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {reason && (
        <details className="rounded-xl bg-cream px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-ink-soft">
            이 구성을 제안한 이유
          </summary>
          <p className="mt-2 text-xs leading-5 text-ink-soft">{reason}</p>
        </details>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-brand">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-xs font-semibold text-ink-soft">
          {status}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button type="button" className="btn-primary" onClick={saveToGallery} disabled={busy}>
          {pending === "download" || (!blobReady && imageReady)
            ? "준비 중…"
            : "갤러리에 저장"}
        </button>
        <button type="button" className="btn-secondary" onClick={shareToApps} disabled={busy}>
          {pending === "share" ? "준비 중…" : "공유하기"}
        </button>
        {persistId && <MarkPostedButton id={persistId} />}
      </div>
      <p className="text-center text-xs leading-5 text-ink-soft">
        아이폰·안드로이드에서는 &apos;갤러리에 저장&apos; → 공유 화면의 &apos;이미지 저장&apos;을
        누르면 사진 앱으로 들어가요. SNS에 올린 뒤에는 &apos;실제로 올렸어요&apos;를 눌러 주세요.
      </p>
    </article>
  );
}
