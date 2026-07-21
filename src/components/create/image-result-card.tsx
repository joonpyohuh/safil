"use client";

import { useEffect, useRef, useState } from "react";
import type { ImagePalette, ImageTemplate, PhotoTreatment } from "@/lib/schemas";
import {
  EDITABLE_IMAGE_TEMPLATES,
  IMAGE_TEMPLATE_LABELS,
  imagePaletteValues,
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

const EDIT_PALETTES = imagePaletteValues;

type ImageResultCardProps = {
  label: string;
  imageUrl: string;
  initialHeadline: string;
  initialBodyText?: string;
  initialSubline?: string;
  initialDateText: string;
  initialBrandCue?: string;
  initialTemplate: ImageTemplate;
  initialPalette: ImagePalette;
  cafeName?: string;
  cafeLocation?: string;
  reason?: string;
  useCase?: string;
  isSample?: boolean;
  usedReferencePhotos?: boolean;
  photoTreatment?: PhotoTreatment;
  shareTitle: string;
  persistId?: string;
  onSaved?: () => void;
};

export function ImageResultCard({
  label,
  imageUrl,
  initialHeadline,
  initialBodyText,
  initialSubline,
  initialDateText,
  initialBrandCue,
  initialTemplate,
  initialPalette,
  cafeName,
  cafeLocation,
  reason,
  useCase,
  isSample,
  usedReferencePhotos,
  photoTreatment,
  shareTitle,
  persistId,
  onSaved,
}: ImageResultCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);

  const [headline, setHeadline] = useState(initialHeadline);
  const [bodyText, setBodyText] = useState(
    initialBodyText || initialSubline || "",
  );
  const [brandCue, setBrandCue] = useState(initialBrandCue || "");
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
  const [readyUrl, setReadyUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"share" | "download" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const imageReady = readyUrl === imageUrl;

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
      if (!cancelled) setReadyUrl(imageUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, palette]);

  /** 저장/공유 시에만 1080 PNG 생성 (미리 렌더하지 않음) */
  async function renderPngBlob(): Promise<Blob> {
    const node = exportRef.current;
    if (!node) throw new Error("EXPORT_FAILED");
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    if (typeof document !== "undefined" && "fonts" in document) {
      await document.fonts.ready.catch(() => undefined);
    }
    return posterToBlob(node);
  }

  function downloadBlobFile(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
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

  async function saveToGallery() {
    setError("");
    setStatus("");
    setPending("download");
    try {
      const blob = await renderPngBlob();
      const fileName = `${headline || "safil"}-홍보이미지.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (isMobileDevice() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle });
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
      setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setPending(null);
    }
  }

  async function shareToApps() {
    setError("");
    setStatus("");
    setPending("share");
    try {
      const blob = await renderPngBlob();
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

  const busy = pending !== null || !imageReady;
  const posterProps = {
    imageUrl,
    headline,
    bodyText,
    dateText,
    cafeName,
    cafeLocation,
    brandCue,
    templateId,
    colors,
    photoTreatment,
  };

  return (
    <article className="card flex flex-col gap-3 toss-rise">
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
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-bold text-brand">{label}</span>
          {useCase ? (
            <span className="truncate text-[0.6875rem] text-ink-soft">{useCase}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {usedReferencePhotos !== undefined && !isSample && (
            <span
              className={`rounded-full px-2 py-1 text-[0.6875rem] font-semibold ${
                usedReferencePhotos
                  ? "bg-brand-soft text-brand"
                  : "bg-cream text-ink-soft"
              }`}
            >
              {usedReferencePhotos ? "원본 사진" : "AI 배경"}
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
        {editing ? "수정 닫기" : "글자·레이아웃 수정"}
      </button>

      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl bg-cream px-3 py-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-soft">
            제목
            <input
              className="input text-sm font-semibold"
              value={headline}
              maxLength={40}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-soft">
            홍보 본문 (사실 그대로)
            <textarea
              className="input min-h-24 text-sm"
              value={bodyText}
              maxLength={240}
              onChange={(e) => setBodyText(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-soft">
            브랜드 한 줄
            <input
              className="input text-sm"
              value={brandCue}
              maxLength={40}
              onChange={(e) => setBrandCue(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-soft">
            날짜·기간
            <input
              className="input text-sm"
              value={dateText}
              maxLength={40}
              onChange={(e) => setDateText(e.target.value)}
            />
          </label>
          <fieldset>
            <legend className="text-xs font-bold text-ink-soft">레이아웃</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDITABLE_IMAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    templateId === tpl
                      ? "bg-brand text-white"
                      : "bg-white text-ink-soft ring-1 ring-cream-deep"
                  }`}
                  onClick={() => setTemplateId(tpl)}
                  aria-pressed={templateId === tpl}
                >
                  {IMAGE_TEMPLATE_LABELS[tpl]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-bold text-ink-soft">색감</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDIT_PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    palette === p
                      ? "bg-brand text-white"
                      : "bg-white text-ink-soft ring-1 ring-cream-deep"
                  }`}
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
          {pending === "download" ? "저장 준비 중…" : "갤러리에 저장"}
        </button>
        <button type="button" className="btn-secondary" onClick={shareToApps} disabled={busy}>
          {pending === "share" ? "준비 중…" : "공유하기"}
        </button>
        {persistId && <MarkPostedButton id={persistId} />}
      </div>
      <p className="text-center text-xs leading-5 text-ink-soft">
        저장·공유를 누를 때만 고화질 PNG를 만들어요. SNS에 올린 뒤에는 &apos;실제로 올렸어요&apos;를
        눌러 주세요.
      </p>
    </article>
  );
}
