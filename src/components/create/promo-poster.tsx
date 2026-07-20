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
  /** 홍보 본문 (사실 그대로) */
  bodyText?: string;
  /** @deprecated bodyText 우선 */
  subline?: string;
  dateText: string;
  cafeName?: string;
  cafeLocation?: string;
  brandCue?: string;
  templateId: ImageTemplate;
  colors: PosterColors;
  scale?: number;
};

const SANS =
  'var(--font-noto-sans-kr), "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
const SERIF =
  'var(--font-noto-serif-kr), "Noto Serif KR", "Apple SD Gothic Neo", serif';

const rootBase: CSSProperties = {
  width: POSTER_SIZE,
  height: POSTER_SIZE,
  position: "relative",
  overflow: "hidden",
  fontFamily: SANS,
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

function BrandLockup({
  cafe,
  location,
  color,
  align = "left",
}: {
  cafe: string;
  location: string;
  color: string;
  align?: "left" | "center" | "right";
}) {
  if (!cafe && !location) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems:
          align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        textAlign: align,
      }}
    >
      {cafe ? (
        <p
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color,
            lineHeight: 1.2,
          }}
        >
          {cafe}
        </p>
      ) : null}
      {location ? (
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color,
            opacity: 0.82,
          }}
        >
          {location}
        </p>
      ) : null}
    </div>
  );
}

function AccentRule({ color, width = 56 }: { color: string; width?: number }) {
  return (
    <div
      style={{
        width,
        height: 5,
        borderRadius: 3,
        background: color,
      }}
    />
  );
}

export function PromoPoster({
  posterRef,
  imageUrl,
  headline,
  bodyText,
  subline,
  dateText,
  cafeName,
  cafeLocation,
  brandCue,
  templateId,
  colors,
  scale = 1,
}: PromoPosterProps) {
  const t = normalizeImageTemplate(templateId);
  const title = headline.trim() || " ";
  const body = (bodyText ?? subline ?? "").trim();
  const date = dateText.trim();
  const cafe = cafeName?.trim() || "";
  const loc = cafeLocation?.trim() || "";
  const cue = (brandCue || "").trim();

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

  const titleSize = title.length > 14 ? 64 : title.length > 10 ? 76 : 92;

  return (
    <div style={wrap}>
      <div ref={posterRef} data-safil-poster style={scaled}>
        <Bg src={imageUrl} />

        {/* 1. 에디토리얼 하단 타이포 */}
        {t === "fade_bottom" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 32%, transparent 48%, rgba(20,14,10,0.92) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 64,
                left: 64,
                right: 64,
              }}
            >
              <BrandLockup cafe={cafe} location={loc} color={colors.paper} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 64,
                right: 64,
                bottom: 72,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <AccentRule color={colors.accent} />
              {cue ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 600,
                    color: colors.accent,
                    letterSpacing: "0.06em",
                  }}
                >
                  {cue}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: titleSize,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: colors.paper,
                  letterSpacing: "-0.02em",
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 500,
                    lineHeight: 1.45,
                    color: "rgba(250,246,240,0.92)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
              {date ? (
                <p
                  style={{
                    margin: 0,
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

        {/* 2. 크림 컬러 사이드 패널 */}
        {t === "cream_panel" && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "46%",
                background: colors.paper,
                boxShadow: "-24px 0 48px rgba(0,0,0,0.22)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 56,
                left: 48,
                maxWidth: "46%",
              }}
            >
              <BrandLockup cafe={cafe} location={loc} color={colors.paper} />
            </div>
            <div
              style={{
                position: "absolute",
                top: 72,
                right: 48,
                bottom: 72,
                width: "calc(46% - 72px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 20,
                color: colors.ink,
              }}
            >
              <AccentRule color={colors.accent} width={40} />
              {cue ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: colors.accent,
                    letterSpacing: "0.04em",
                  }}
                >
                  {cue}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: title.length > 10 ? 52 : 64,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: "-0.02em",
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    opacity: 0.9,
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
              {date ? (
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.accent }}>
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* 3. 유리 카드 */}
        {t === "glass_center" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(18,12,8,0.28)",
              }}
            />
            <div style={{ position: "absolute", top: 56, left: 0, right: 0 }}>
              <BrandLockup cafe={cafe} location={loc} color={colors.paper} align="center" />
            </div>
            <div
              style={{
                position: "absolute",
                left: 72,
                right: 72,
                top: "50%",
                transform: "translateY(-46%)",
                padding: "48px 44px",
                borderRadius: 28,
                background: "rgba(250,246,240,0.88)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: `1px solid ${colors.accent}55`,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                color: colors.ink,
                textAlign: "center",
                alignItems: "center",
              }}
            >
              {cue ? (
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.accent }}>
                  {cue}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: title.length > 10 ? 56 : 68,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
              {date ? (
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.accent }}>
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* 4. 얇은 프레임 */}
        {t === "frame_border" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 36,
                border: `2px solid ${colors.paper}`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 48,
                border: `1px solid ${colors.accent}99`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 72,
                right: 72,
                bottom: 80,
                padding: "36px 32px",
                background: "rgba(18,12,8,0.78)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <BrandLockup cafe={cafe} location={loc} color={colors.accent} />
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: title.length > 10 ? 58 : 70,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: colors.paper,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    lineHeight: 1.4,
                    color: "rgba(250,246,240,0.9)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
              {(cue || date) && (
                <p style={{ margin: 0, fontSize: 24, fontWeight: 600, color: colors.accent }}>
                  {[cue, date].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </>
        )}

        {/* 5. 다크 사이드 레일 */}
        {t === "side_rail" && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "38%",
                background: colors.ink,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 64,
                left: 40,
                bottom: 64,
                width: "calc(38% - 64px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                color: colors.paper,
              }}
            >
              <BrandLockup cafe={cafe} location={loc} color={colors.accent} />
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {cue ? (
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color: colors.accent }}>
                    {cue}
                  </p>
                ) : null}
                <h2
                  style={{
                    margin: 0,
                    fontFamily: SERIF,
                    fontSize: title.length > 10 ? 44 : 52,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {title}
                </h2>
                {body ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 24,
                      lineHeight: 1.45,
                      opacity: 0.92,
                      whiteSpace: "pre-wrap",
                      wordBreak: "keep-all",
                    }}
                  >
                    {body}
                  </p>
                ) : null}
                {date ? (
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.accent }}>
                    {date}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* 6. 사진 / 종이 분할 */}
        {t === "split_sheet" && (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "42%",
                background: colors.paper,
              }}
            />
            <div style={{ position: "absolute", top: 48, left: 56, right: 56 }}>
              <BrandLockup cafe={cafe} location={loc} color={colors.paper} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 56,
                right: 56,
                bottom: 56,
                height: "calc(42% - 80px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 16,
                color: colors.ink,
              }}
            >
              <AccentRule color={colors.accent} />
              {cue ? (
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.accent }}>
                  {cue}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: title.length > 12 ? 48 : 58,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
              {date ? (
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.accent }}>
                  {date}
                </p>
              ) : null}
            </div>
          </>
        )}

        {/* 7. 빅 타이틀 커버 */}
        {t === "bold_cover" && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.7) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 64,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <BrandLockup cafe={cafe} location={loc} color={colors.paper} />
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: SERIF,
                    fontSize: title.length > 8 ? 88 : 108,
                    fontWeight: 700,
                    lineHeight: 1.08,
                    color: colors.paper,
                    letterSpacing: "-0.03em",
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                    textShadow: "0 8px 40px rgba(0,0,0,0.45)",
                  }}
                >
                  {title}
                </h2>
                {(cue || body) && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 30,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      color: "rgba(250,246,240,0.92)",
                      maxWidth: "92%",
                      whiteSpace: "pre-wrap",
                      wordBreak: "keep-all",
                    }}
                  >
                    {body || cue}
                  </p>
                )}
                {date ? (
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: colors.accent }}>
                    {date}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* 8. 미니멀 마스트헤드 */}
        {t === "minimal_bar" && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                padding: "40px 56px 36px",
                background: "rgba(250,246,240,0.94)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                color: colors.ink,
                borderBottom: `4px solid ${colors.accent}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 24,
                }}
              >
                <BrandLockup cafe={cafe} location={loc} color={colors.ink} />
                {date ? (
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: colors.accent }}>
                    {date}
                  </p>
                ) : null}
              </div>
              {cue ? (
                <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color: colors.accent }}>
                  {cue}
                </p>
              ) : null}
              <h2
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontSize: title.length > 12 ? 44 : 52,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  whiteSpace: "pre-wrap",
                  wordBreak: "keep-all",
                }}
              >
                {title}
              </h2>
              {body ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 26,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "keep-all",
                  }}
                >
                  {body}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
