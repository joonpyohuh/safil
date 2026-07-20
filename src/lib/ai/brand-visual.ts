import {
  toneLabels,
  vibeTagLabels,
  type CafeProfile,
  type Tone,
  type VibeTag,
} from "@/lib/schemas";

/** 이미지·문구에 쓰는 이 카페만의 시각 브리프 */
export type BrandVisualBrief = {
  cafeName: string;
  location: string;
  concept: string;
  atmosphere: string;
  menus: string[];
  vibeLabels: string[];
  toneLabel: string;
  customerType: string;
  /** 영어 — 이미지 모델용 색·소재·분위기 */
  englishLook: string;
  /** 한글 — 플랜/헤드라인용 */
  koreanIdentity: string;
  /** 포스터 보조 문구 기본값 */
  defaultSubline: string;
};

const VIBE_LOOK: Record<VibeTag, string> = {
  cozy: "warm wood, soft amber light, cozy cushions, handmade ceramics",
  minimal: "clean white/beige walls, sparse props, calm negative space, matte surfaces",
  roastery: "raw beans, steel grinder, roasting craft, tasting bar, earthy browns",
  dessert: "pastry textures, soft pastel accents, cake layers, delicate plating",
  study: "quiet desks, books, soft task light, uncluttered workspace corners",
  vintage: "aged wood, brass, film-like warmth, retro ceramics, lived-in charm",
  nature: "plants, window daylight, greenery, natural materials, airy openness",
  trendy: "contemporary styling, bold but tasteful contrast, Instagram-ready framing",
};

const TONE_LOOK: Record<Tone, string> = {
  warm: "friendly inviting warmth",
  calm: "quiet refined calm",
  professional: "precise craftsmanship, confident but not flashy",
  witty: "light playful energy without clutter",
};

export function buildBrandVisualBrief(
  profile: CafeProfile | null,
): BrandVisualBrief | null {
  if (!profile?.name?.trim()) return null;

  const vibeLabels = profile.vibeTags
    .map((t) => vibeTagLabels[t as VibeTag] ?? t)
    .filter(Boolean);
  const vibeEnglish = profile.vibeTags
    .map((t) => VIBE_LOOK[t as VibeTag])
    .filter(Boolean)
    .join("; ");

  const concept = profile.concept.trim();
  const atmosphere = profile.atmosphere.trim();
  const menus = profile.menus.filter(Boolean).slice(0, 6);
  const tone = (profile.tone in toneLabels ? profile.tone : "warm") as Tone;

  const englishLook = [
    `Independent Korean cafe brand identity for "${profile.name}" in ${profile.location || "Korea"}.`,
    concept ? `Concept: ${concept}.` : "",
    atmosphere ? `Atmosphere that MUST read in the photo: ${atmosphere}.` : "",
    vibeEnglish ? `Visual cues: ${vibeEnglish}.` : "",
    `Tone of place: ${TONE_LOOK[tone]}.`,
    menus.length ? `Signature items to prefer when visible: ${menus.join(", ")}.` : "",
    profile.customerType
      ? `Typical guests: ${profile.customerType} — frame for them.`
      : "",
    "NOT a generic franchise chain cafe. NOT stock-photo cliché. Distinct to THIS brand.",
  ]
    .filter(Boolean)
    .join(" ");

  const koreanIdentity = [
    `${profile.name}${profile.location ? ` · ${profile.location}` : ""}`,
    concept ? `컨셉: ${concept}` : "",
    atmosphere ? `분위기: ${atmosphere}` : "",
    vibeLabels.length ? `느낌: ${vibeLabels.join(", ")}` : "",
    menus.length ? `시그니처: ${menus.join(", ")}` : "",
    `말투: ${toneLabels[tone]}`,
  ]
    .filter(Boolean)
    .join(" / ");

  const defaultSubline =
    (concept && concept.slice(0, 18)) ||
    (atmosphere && atmosphere.slice(0, 18)) ||
    (menus[0] ? menus[0].slice(0, 18) : "") ||
    (profile.location ? profile.location.slice(0, 18) : "");

  return {
    cafeName: profile.name.trim(),
    location: profile.location.trim(),
    concept,
    atmosphere,
    menus,
    vibeLabels,
    toneLabel: toneLabels[tone],
    customerType: profile.customerType.trim(),
    englishLook,
    koreanIdentity,
    defaultSubline,
  };
}
