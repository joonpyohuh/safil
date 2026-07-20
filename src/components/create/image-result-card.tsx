"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagePalette, ImageTemplate } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const SIZE = 1024;
const FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

const PALETTES: Record<
  ImagePalette,
  { band: string; text: string; accent: string; label: string }
> = {
  cream: { band: "rgba(252,248,242,0.94)", text: "#2a2320", accent: "#914321", label: "크림" },
  espresso: { band: "rgba(38,26,20,0.90)", text: "#faf6f0", accent: "#e8c4a8", label: "진갈색" },
  forest: { band: "rgba(22,40,30,0.90)", text: "#f2f7f2", accent: "#c8e0c8", label: "딥그린" },
  berry: { band: "rgba(56,20,32,0.90)", text: "#fdf1f4", accent: "#f0c2d0", label: "버건디" },
};

const TEMPLATES: Record<ImageTemplate, string> = {
  bottom_band: "아래 띠",
  top_band: "위 띠",
  center_card: "중앙 카드",
};

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of [...text]) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch === " " ? "" : ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 제목이 2줄 안에 들어가도록 글자 크기를 자동으로 줄인다 */
function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): { size: number; lines: string[] } {
  for (let size = 76; size >= 48; size -= 4) {
    ctx.font = `700 ${size}px ${FONT_STACK}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= 2) return { size, lines };
  }
  ctx.font = `700 48px ${FONT_STACK}`;
  return { size: 48, lines: wrapLines(ctx, text, maxWidth).slice(0, 2) };
}

/** 한 줄에 들어가도록 크기를 줄이고, 그래도 넘치면 말줄임 */
function fitSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight: number,
): { size: number; text: string } {
  for (let size = baseSize; size >= Math.round(baseSize * 0.7); size -= 2) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) return { size, text };
  }
  const size = Math.round(baseSize * 0.7);
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return { size, text: `${cut}…` };
}

type OverlaySpec = {
  headline: string;
  subline: string;
  dateText: string;
  templateId: ImageTemplate;
  palette: ImagePalette;
};

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  spec: OverlaySpec,
) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (image) {
    const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#efe6da";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  const colors = PALETTES[spec.palette];
  const hasSub = Boolean(spec.subline);
  const hasDate = Boolean(spec.dateText);
  const textWidth = SIZE * 0.82;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const head = fitHeadline(ctx, spec.headline, textWidth);
  const headLineHeight = Math.round(head.size * 1.22);

  const contentHeight =
    head.lines.length * headLineHeight + (hasSub ? 60 : 0) + (hasDate ? 54 : 0) + 100;

  let top: number;
  let bandX = 0;
  let bandW = SIZE;
  let radius = 0;

  if (spec.templateId === "top_band") {
    top = 0;
  } else if (spec.templateId === "center_card") {
    bandW = SIZE * 0.84;
    bandX = (SIZE - bandW) / 2;
    top = (SIZE - contentHeight) / 2;
    radius = 32;
  } else {
    top = SIZE - contentHeight;
  }

  ctx.fillStyle = colors.band;
  ctx.beginPath();
  if ("roundRect" in ctx && radius) {
    ctx.roundRect(bandX, top, bandW, contentHeight, radius);
  } else {
    ctx.rect(bandX, top, bandW, contentHeight);
  }
  ctx.fill();

  let y = top + 50;
  ctx.fillStyle = colors.text;
  ctx.font = `700 ${head.size}px ${FONT_STACK}`;
  for (const line of head.lines) {
    y += headLineHeight / 2;
    ctx.fillText(line, SIZE / 2, y);
    y += headLineHeight / 2;
  }
  if (hasSub) {
    const sub = fitSingleLine(ctx, spec.subline, textWidth, 40, 500);
    ctx.fillStyle = colors.text;
    ctx.font = `500 ${sub.size}px ${FONT_STACK}`;
    y += 34;
    ctx.fillText(sub.text, SIZE / 2, y);
    y += 26;
  }
  if (hasDate) {
    const date = fitSingleLine(ctx, spec.dateText, textWidth, 34, 600);
    ctx.fillStyle = colors.accent;
    ctx.font = `600 ${date.size}px ${FONT_STACK}`;
    y += 30;
    ctx.fillText(date.text, SIZE / 2, y);
  }
}

type ImageResultCardProps = {
  label: string;
  imageUrl: string;
  initialHeadline: string;
  initialSubline: string;
  initialDateText: string;
  initialTemplate: ImageTemplate;
  initialPalette: ImagePalette;
  reason?: string;
  isSample?: boolean;
  /** 참고 사진을 실제로 반영했는지 (배지 표시용). undefined면 배지 숨김 */
  usedReferencePhotos?: boolean;
  shareTitle: string;
  /** 저장 시 downloaded PATCH할 히스토리 id (persisted 기록만) */
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
  reason,
  isSample,
  usedReferencePhotos,
  shareTitle,
  persistId,
  onSaved,
}: ImageResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const blobSeqRef = useRef(0);
  const [headline, setHeadline] = useState(initialHeadline);
  const [subline, setSubline] = useState(initialSubline);
  const [dateText, setDateText] = useState(initialDateText);
  const [templateId, setTemplateId] = useState<ImageTemplate>(initialTemplate);
  const [palette, setPalette] = useState<ImagePalette>(initialPalette);
  const [imageReady, setImageReady] = useState(false);
  const [blobReady, setBlobReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawOverlay(ctx, imageRef.current, {
      headline: headline || " ",
      subline,
      dateText,
      templateId,
      palette,
    });
    // iOS 공유는 클릭과 share() 사이의 비동기 지연에 민감하므로
    // 그릴 때마다 blob을 미리 만들어 클릭 시 바로 쓸 수 있게 한다.
    const seq = ++blobSeqRef.current;
    blobRef.current = null;
    setBlobReady(false);
    canvas.toBlob((blob) => {
      if (seq === blobSeqRef.current) {
        blobRef.current = blob;
        setBlobReady(Boolean(blob));
      }
    }, "image/png");
  }, [headline, subline, dateText, templateId, palette]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setImageReady(true);
      setImageFailed(false);
    };
    img.onerror = () => {
      if (cancelled) return;
      imageRef.current = null;
      setImageFailed(true);
      setImageReady(true);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!imageReady) return;
    redraw();
    // 웹폰트가 늦게 로드되면 다시 그린다
    let active = true;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        if (active) redraw();
      });
    }
    return () => {
      active = false;
    };
  }, [imageReady, redraw]);

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    // Safari에서 즉시 해제하면 다운로드가 실패할 수 있어 지연 해제
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function saveOrShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError("");
    setStatus("");
    setPending(true);
    try {
      let blob = blobRef.current;
      if (!blob) {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
      }
      if (!blob) throw new Error("EXPORT_FAILED");
      const fileName = `${headline || "safil"}-홍보이미지.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle, text: shareTitle });
          setStatus("공유할 앱을 골라 인스타그램에 올려보세요.");
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name === "AbortError") {
            return; // 사용자가 공유 시트를 닫음
          }
          // 제스처 만료 등으로 공유가 막히면 다운로드로 자동 전환
          downloadBlob(blob, fileName);
          setStatus("이미지를 저장했어요.");
        }
      } else {
        downloadBlob(blob, fileName);
        setStatus("이미지를 저장했어요.");
      }
      onSaved?.();

      if (persistId) {
        await fetchWithTimeout(`/api/history/${persistId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloaded: true }),
        }).catch(() => null);
      }
    } catch {
      setError("저장하지 못했어요. 화면을 캡처해서 사용하셔도 돼요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="card flex flex-col gap-3">
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`${headline} 홍보 이미지 미리보기`}
          className="aspect-square w-full rounded-2xl bg-cream"
        />
        {!imageReady && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-cream/80">
            <span className="text-sm font-semibold text-ink-soft">미리보기 준비 중…</span>
          </div>
        )}
      </div>
      {imageFailed && (
        <p className="text-xs leading-5 text-ink-soft">
          배경을 불러오지 못해 단색 배경으로 보여드려요. 저장은 그대로 가능해요.
        </p>
      )}

      <button
        type="button"
        className="btn-secondary"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
      >
        {editing ? "글자 수정 닫기" : "글자·위치·색 바꾸기"}
      </button>

      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl bg-cream p-3">
          <p className="text-xs leading-5 text-ink-soft">
            바꾸는 즉시 위 미리보기에 반영돼요. 다시 만들 필요 없어요.
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
            <legend className="text-xs font-semibold text-ink-soft">글자 위치</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TEMPLATES) as ImageTemplate[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip !min-h-11 !text-xs ${templateId === t ? "chip-active" : ""}`}
                  onClick={() => setTemplateId(t)}
                  aria-pressed={templateId === t}
                >
                  {TEMPLATES[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-semibold text-ink-soft">글자 배경색</legend>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PALETTES) as ImagePalette[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip !min-h-11 !text-xs ${palette === p ? "chip-active" : ""}`}
                  onClick={() => setPalette(p)}
                  aria-pressed={palette === p}
                >
                  {PALETTES[p].label}
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

      <button
        type="button"
        className="btn-primary"
        onClick={saveOrShare}
        disabled={pending || !imageReady || !blobReady}
      >
        {pending || (!blobReady && imageReady)
          ? "준비 중…"
          : "저장하거나 공유하기"}
      </button>
    </article>
  );
}
