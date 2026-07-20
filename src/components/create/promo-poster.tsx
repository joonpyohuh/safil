"use client";

import type { CSSProperties, Ref } from "react";
import type { ImageTemplate } from "@/lib/schemas";
import { normalizeImageTemplate } from "@/lib/schemas";
import type { PosterColors } from "@/lib/client/extract-colors";

export const POSTER_SIZE = 1080;

export type PromoPosterProps = {
  posterRef?: Ref<HTMLDivElement>;
  imageUrl: string;
  headline: string;
  subline: string;
  dateText: string;
  cafeName?: string;
  templateId: ImageTemplate;
  colors: PosterColors;
  /** 미리보기용 스케일 (1 = 1080px). export 시에는 1로 캡처 */
  scale?: number;
};

const rootBase: CSSProperties = {
  width: POSTER_SIZE,
  height: POSTER_SIZE,
  position: "relative",
  overflow: "hidden",
  fontFamily:
    '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  background: "#1a1410",
  color: "#faf6f0",
  WebkitFontSmoothing: "antialiased",
};

function Bg({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      crossOrigin="anonymous"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

function FadeBottom({ colors }: { colors: PosterColors }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "58%",
        background: `linear-gradient(180deg, transparent 0%, ${colors.ink}99 45%, ${colors.ink}ee 100%)`,
      }}
    />
  );
}

function Vignette() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

export function PromoPoster({
  posterRef,
  imageUrl,
  headline,
  subline,
  dateText,
  cafeName,
  templateId,
  colors,
  scale = 1,
}: PromoPosterProps) {
  const t = normalizeImageTemplate(templateId);
  const title = headline.trim() || " ";
  const sub = subline.trim();
  const date = dateText.trim();
  const cafe = cafeName?.trim() || "";

  const wrap: CSSProperties =
    scale === 1
      ? {}
      : {
          width: POSTER_SIZE * scale,
          height: POSTER_SIZE * scale,
          overflow: "hidden",
        };

  const scaled: CSSProperties =
    scale === 1
      ? rootBase
      : {
          ...rootBase,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        };

  return (
    <div style={wrap}>
      <div ref={posterRef} data-safil-poster style={scaled}>
        <Bg src={imageUrl} />
        <Vignette />

        {t === "fade_bottom" && (
          <>
            <FadeBottom colors={colors} />
            <div
              style={{
                position: "absolute",
                left: 72,
                right: 72,
                bottom: 88,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 6,
                  borderRadius: 3,
                  background: colors.accent,
                }}
              />
              {cafe ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: colors.accent,
                  }}
                >
                  {cafe}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 10 ? 72 : 88,
                  fontWeight: 900,
                  lineHeight: 1.15,
                  color: colors.paper,
                  letterSpacing: "-0.02em",
                  textShadow: "0 4px 28px rgba(0,0,0,0.35)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: 500,
                    color: colors.muted,
                    lineHeight: 1.4,
                  }}
                >
                  {sub}
                </p>
              ) : null}
              {date ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 700,
                    color: colors.accent,
                  }}
                >
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {t === "story_chip" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 28%, transparent 55%, rgba(0,0,0,0.72) 100%)",
              }}
            />
            {date || cafe ? (
              <div
                style={{
                  position: "absolute",
                  top: 72,
                  left: 72,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 28px",
                  borderRadius: 999,
                  background: colors.accent,
                  color: colors.ink,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {date || cafe}
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 72,
                right: 72,
                bottom: 96,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 10 ? 70 : 84,
                  fontWeight: 900,
                  lineHeight: 1.18,
                  color: colors.paper,
                  textShadow: "0 6px 32px rgba(0,0,0,0.45)",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p
                  style={{
                    margin: "20px 0 0",
                    fontSize: 32,
                    fontWeight: 500,
                    color: colors.muted,
                  }}
                >
                  {sub}
                </p>
              ) : null}
            </div>
          </>
        )}

        {t === "glass_center" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.22)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "7%",
                right: "7%",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "64px 56px",
                borderRadius: 36,
                background: `${colors.paper}f2`,
                boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 5,
                  margin: "0 auto 36px",
                  borderRadius: 3,
                  background: colors.accent,
                }}
              />
              {cafe ? (
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    color: colors.accent,
                  }}
                >
                  {cafe}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 10 ? 64 : 76,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: colors.ink,
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p
                  style={{
                    margin: "24px 0 0",
                    fontSize: 30,
                    fontWeight: 500,
                    color: "rgba(42,35,32,0.62)",
                  }}
                >
                  {sub}
                </p>
              ) : null}
              {date ? (
                <p
                  style={{
                    margin: "28px 0 0",
                    fontSize: 26,
                    fontWeight: 700,
                    color: colors.accent,
                  }}
                >
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {t === "frame_border" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 48,
                border: `3px solid ${colors.paper}cc`,
                borderRadius: 8,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "42%",
                background: `linear-gradient(180deg, transparent, ${colors.ink}dd)`,
              }}
            />
            {cafe ? (
              <p
                style={{
                  position: "absolute",
                  top: 72,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                  color: colors.paper,
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                {cafe}
              </p>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: 88,
                right: 88,
                bottom: 100,
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 10 ? 68 : 80,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: colors.paper,
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p
                  style={{
                    margin: "18px 0 0",
                    fontSize: 30,
                    color: colors.muted,
                  }}
                >
                  {sub}
                </p>
              ) : null}
              {date ? (
                <p
                  style={{
                    margin: "20px 0 0",
                    fontSize: 26,
                    fontWeight: 700,
                    color: colors.accent,
                  }}
                >
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {t === "side_rail" && (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "38%",
                background: `linear-gradient(90deg, ${colors.ink}f2 70%, transparent)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 100,
                bottom: 100,
                width: "30%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 20,
              }}
            >
              {cafe ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    color: colors.accent,
                  }}
                >
                  {cafe}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 8 ? 56 : 68,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: colors.paper,
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p style={{ margin: 0, fontSize: 26, color: colors.muted, lineHeight: 1.45 }}>
                  {sub}
                </p>
              ) : null}
              {date ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: colors.accent,
                  }}
                >
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {t === "bottom_card" && (
          <>
            <div
              style={{
                position: "absolute",
                left: 48,
                right: 48,
                bottom: 56,
                padding: "44px 48px",
                borderRadius: 32,
                background: `${colors.paper}f5`,
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    width: 8,
                    alignSelf: "stretch",
                    minHeight: 80,
                    borderRadius: 4,
                    background: colors.accent,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {cafe ? (
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: 24,
                        fontWeight: 600,
                        color: colors.accent,
                      }}
                    >
                      {cafe}
                    </p>
                  ) : null}
                  <h2
                    style={{
                      margin: 0,
                      fontSize: title.length > 10 ? 56 : 64,
                      fontWeight: 900,
                      lineHeight: 1.2,
                      color: colors.ink,
                      wordBreak: "keep-all",
                    }}
                  >
                    {title}
                  </h2>
                  {(sub || date) && (
                    <p
                      style={{
                        margin: "16px 0 0",
                        fontSize: 28,
                        fontWeight: 500,
                        color: "rgba(42,35,32,0.62)",
                      }}
                    >
                      {[sub, date].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {t === "bold_cover" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(160deg, ${colors.ink}66 0%, transparent 40%, ${colors.ink}cc 100%)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 64,
                right: 64,
                top: "42%",
                transform: "translateY(-40%)",
              }}
            >
              {date ? (
                <p
                  style={{
                    margin: "0 0 28px",
                    display: "inline-block",
                    padding: "10px 22px",
                    borderRadius: 8,
                    background: colors.accent,
                    color: colors.ink,
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {date}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontSize: title.length > 8 ? 92 : 108,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  color: colors.paper,
                  letterSpacing: "-0.03em",
                  textShadow: "0 8px 40px rgba(0,0,0,0.45)",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {sub ? (
                <p
                  style={{
                    margin: "28px 0 0",
                    fontSize: 34,
                    fontWeight: 500,
                    color: colors.muted,
                    maxWidth: "90%",
                  }}
                >
                  {sub}
                </p>
              ) : null}
            </div>
            {cafe ? (
              <p
                style={{
                  position: "absolute",
                  left: 64,
                  bottom: 72,
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: colors.paper,
                  opacity: 0.85,
                }}
              >
                {cafe}
              </p>
            ) : null}
          </>
        )}

        {t === "minimal_bar" && (
          <>
            <div
              style={{
                position: "absolute",
                left: 40,
                right: 40,
                bottom: 40,
                padding: "36px 40px",
                borderRadius: 20,
                background: `${colors.ink}e8`,
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: title.length > 12 ? 40 : 48,
                    fontWeight: 800,
                    color: colors.paper,
                    lineHeight: 1.25,
                    wordBreak: "keep-all",
                  }}
                >
                  {title}
                </h2>
                {(sub || date) && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 24,
                      color: colors.muted,
                    }}
                  >
                    {[sub, date].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {cafe ? (
                <p
                  style={{
                    margin: 0,
                    flexShrink: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: colors.accent,
                    letterSpacing: "0.06em",
                  }}
                >
                  {cafe}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
