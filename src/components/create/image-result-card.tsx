"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagePalette, ImageTemplate } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const SIZE = 1024;
/** 깔끔한 인스타 스타일 — 시스템/앱에 로드된 Noto Sans KR 우선 */
const FONT_STACK =
  '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", Pretendard, sans-serif';

const PALETTES: Record<
  ImagePalette,
  { overlay: string; text: string; muted: string; accent: string; label: string }
> = {
  cream: {
    overlay: "rgba(250,246,240,0.92)",
    text: "#1f1a17",
    muted: "#5c524c",
    accent: "#914321",
    label: "크림",
  },
  espresso: {
    overlay: "rgba(20,14,12,0.78)",
    text: "#faf6f0",
    muted: "rgba(250,246,240,0.78)",
    accent: "#e8c4a8",
    label: "진갈색",
  },
  forest: {
    overlay: "rgba(12,28,20,0.78)",
    text: "#f2f7f2",
    muted: "rgba(242,247,242,0.78)",
    accent: "#b8d8b8",
    label: "딥그린",
  },
  berry: {
    overlay: "rgba(40,14,24,0.78)",
    text: "#fdf1f4",
    muted: "rgba(253,241,244,0.78)",
    accent: "#f0c2d0",
    label: "버건디",
  },
};

const TEMPLATES: Record<ImageTemplate, string> = {
  bottom_band: "아래 그라데이션",
  top_band: "위쪽 라벨",
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

function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): { size: number; lines: string[] } {
  for (let size = 88; size >= 52; size -= 4) {
    ctx.font = `800 ${size}px ${FONT_STACK}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= 2) return { size, lines };
  }
  ctx.font = `800 52px ${FONT_STACK}`;
  return { size: 52, lines: wrapLines(ctx, text, maxWidth).slice(0, 2) };
}

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

function drawSoftGradient(
  ctx: CanvasRenderingContext2D,
  fromY: number,
  toY: number,
  color: string,
) {
  const g = ctx.createLinearGradient(0, fromY, 0, toY);
  g.addColorStop(0, "rgba(0,0,0,0)");
  // color is like rgba(r,g,b,a) — extract rgb for stop mid
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const [, r, gch, b] = match;
    g.addColorStop(0.35, `rgba(${r},${gch},${b},0)`);
    g.addColorStop(0.7, `rgba(${r},${gch},${b},0.55)`);
    g.addColorStop(1, color);
  } else {
    g.addColorStop(1, color);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, fromY, SIZE, toY - fromY);
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
  const pad = 72;
  const textWidth = SIZE - pad * 2;

  ctx.textBaseline = "middle";

  if (spec.templateId === "center_card") {
    // 중앙 글래스 카드 — 깔끔한 인스타 피드형
    const head = fitHeadline(ctx, spec.headline, textWidth * 0.88);
    const headH = head.lines.length * Math.round(head.size * 1.15);
    const cardH = headH + (hasSub ? 52 : 0) + (hasDate ? 48 : 0) + 96;
    const cardW = SIZE * 0.86;
    const cardX = (SIZE - cardW) / 2;
    const cardY = (SIZE - cardH) / 2;

    ctx.fillStyle = colors.overlay;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(cardX, cardY, cardW, cardH, 28);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();

    // 상단 악센트 라인
    ctx.fillStyle = colors.accent;
    ctx.fillRect(cardX + cardW * 0.35, cardY + 28, cardW * 0.3, 4);

    ctx.textAlign = "center";
    let y = cardY + 64;
    ctx.fillStyle = colors.text;
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 8;
    ctx.font = `800 ${head.size}px ${FONT_STACK}`;
    for (const line of head.lines) {
      y += Math.round(head.size * 1.15) / 2;
      ctx.fillText(line, SIZE / 2, y);
      y += Math.round(head.size * 1.15) / 2;
    }
    ctx.shadowBlur = 0;

    if (hasSub) {
      const sub = fitSingleLine(ctx, spec.subline, textWidth * 0.8, 36, 500);
      ctx.fillStyle = colors.muted;
      ctx.font = `500 ${sub.size}px ${FONT_STACK}`;
      y += 36;
      ctx.fillText(sub.text, SIZE / 2, y);
    }
    if (hasDate) {
      const date = fitSingleLine(ctx, spec.dateText, textWidth * 0.7, 30, 600);
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${date.size}px ${FONT_STACK}`;
      y += 42;
      ctx.fillText(date.text, SIZE / 2, y);
    }
    return;
  }

  if (spec.templateId === "top_band") {
    // 위쪽 라벨 + 하단 제목 (스토리형)
    drawSoftGradient(ctx, 0, 280, colors.overlay);
    drawSoftGradient(ctx, SIZE - 420, SIZE, colors.overlay);

    if (hasDate) {
      const date = fitSingleLine(ctx, spec.dateText, textWidth * 0.6, 28, 600);
      const chipW = Math.min(textWidth, ctx.measureText(date.text).width + 48);
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(pad, 64, chipW, 48, 24);
      } else {
        ctx.rect(pad, 64, chipW, 48);
      }
      ctx.fill();
      ctx.fillStyle = "#1f1a17";
      ctx.textAlign = "left";
      ctx.font = `600 ${date.size}px ${FONT_STACK}`;
      ctx.fillText(date.text, pad + 24, 88);
    }

    ctx.textAlign = "left";
    const head = fitHeadline(ctx, spec.headline, textWidth);
    let y = SIZE - 140 - (hasSub ? 48 : 0);
    ctx.fillStyle = colors.text;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.font = `800 ${head.size}px ${FONT_STACK}`;
    for (const line of head.lines) {
      ctx.fillText(line, pad, y);
      y += Math.round(head.size * 1.12);
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (hasSub) {
      const sub = fitSingleLine(ctx, spec.subline, textWidth, 34, 500);
      ctx.fillStyle = colors.muted;
      ctx.font = `500 ${sub.size}px ${FONT_STACK}`;
      ctx.fillText(sub.text, pad, y + 8);
    }
    return;
  }

  // 기본: 하단 그라데이션 — 깔끔한 인스타 피드
  drawSoftGradient(ctx, SIZE - 520, SIZE, colors.overlay);

  // 좌측 악센트 바
  ctx.fillStyle = colors.accent;
  ctx.fillRect(pad, SIZE - 200, 6, hasSub || hasDate ? 120 : 80);

  ctx.textAlign = "left";
  const head = fitHeadline(ctx, spec.headline, textWidth - 24);
  const headLineH = Math.round(head.size * 1.12);
  let y = SIZE - 96 - (hasSub ? 44 : 0) - (hasDate ? 40 : 0) - head.lines.length * headLineH;

  ctx.fillStyle = colors.text;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  ctx.font = `800 ${head.size}px ${FONT_STACK}`;
  for (const line of head.lines) {
    y += headLineH / 2;
    ctx.fillText(line, pad + 24, y);
    y += headLineH / 2;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (hasSub) {
    const sub = fitSingleLine(ctx, spec.subline, textWidth - 24, 34, 500);
    ctx.fillStyle = colors.muted;
    ctx.font = `500 ${sub.size}px ${FONT_STACK}`;
    y += 36;
    ctx.fillText(sub.text, pad + 24, y);
  }
  if (hasDate) {
    const date = fitSingleLine(ctx, spec.dateText, textWidth - 24, 28, 600);
    ctx.fillStyle = colors.accent;
    ctx.font = `600 ${date.size}px ${FONT_STACK}`;
    y += 36;
    ctx.fillText(date.text, pad + 24, y);
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
  const [pending, setPending] = useState<"share" | "download" | null>(null);
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
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function getBlob(): Promise<Blob> {
    let blob = blobRef.current;
    if (!blob) {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("EXPORT_FAILED");
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
    }
    if (!blob) throw new Error("EXPORT_FAILED");
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

  async function downloadOnly() {
    setError("");
    setStatus("");
    setPending("download");
    try {
      const blob = await getBlob();
      downloadBlob(blob, `${headline || "safil"}-홍보이미지.png`);
      setStatus("이미지를 저장했어요.");
      await markDownloaded();
    } catch {
      setError("저장하지 못했어요. 화면을 캡처해서 사용하셔도 돼요.");
    } finally {
      setPending(null);
    }
  }

  async function shareOnly() {
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
          downloadBlob(blob, fileName);
          setStatus("공유가 안 되어 이미지로 저장했어요.");
          await markDownloaded();
        }
      } else {
        downloadBlob(blob, fileName);
        setStatus("이 기기에서는 공유가 안 되어 이미지로 저장했어요.");
        await markDownloaded();
      }
    } catch {
      setError("공유하지 못했어요. 아래 다운로드를 이용해 주세요.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null || !imageReady || !blobReady;

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

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={shareOnly}
          disabled={busy}
        >
          {pending === "share" || (!blobReady && imageReady)
            ? "준비 중…"
            : "공유하기"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={downloadOnly}
          disabled={busy}
        >
          {pending === "download" ? "저장 중…" : "다운로드"}
        </button>
      </div>
    </article>
  );
}
