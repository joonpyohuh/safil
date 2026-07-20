import {
  channelLabels,
  noticeTypeLabels,
  purposeLabels,
  toneLabels,
  type CafeProfile,
  type CopyGenerationInput,
  type ImageGenerationInput,
  type NoticeGenerationInput,
} from "@/lib/schemas";

const COMMON_RULES = `
규칙:
- 과장·보장 금지 ("검색 1위", "매출 상승 보장", "무조건", "최고" 금지)
- 없는 사실(가격·원산지·수상)을 지어내지 않는다
- reason은 쉬운 한국어 한 문장
`;

function profileContext(profile: CafeProfile | null): string {
  if (!profile) {
    return "카페 프로필 미등록. 일반적인 동네 카페 톤. 사실을 지어내지 말 것.";
  }
  const menus = profile.menus.length > 0 ? profile.menus.join(", ") : "미등록";
  return `카페: ${profile.name} / ${profile.location} / ${profile.concept || "콘셉트 미등록"} / 메뉴: ${menus} / 말투: ${toneLabels[profile.tone]} / 고객: ${profile.customerType || "미등록"}`;
}

export function buildCopySystemPrompt(profile: CafeProfile | null): string {
  return `동네 카페 홍보 문구 카피라이터. 한국어.
${profileContext(profile)}
${COMMON_RULES}
- 분위기 다른 문구 3개 (안내형 / 감성형 / 친근형)
- 인스타: 80~180자, 문단 2~3개, 이모지 최대 1개, hashtags 4~6개(# 없이)
- 네이버: 100~220자, 첫 줄에 핵심, 이모지·해시태그 없음, hashtags=[]
- 입력에 없는 기간·가격·혜택 금지
- reason은 짧게 한 문장`;
}

export function buildCopyUserPrompt(input: CopyGenerationInput): string {
  return `목적:${purposeLabels[input.purpose]}
채널:${channelLabels[input.channel]}
내용:"${input.message}"`;
}

const NO_TEXT_RULE =
  "CRITICAL: The image must contain absolutely NO text, NO letters, NO numbers, NO words, NO logos, NO typography of any kind. A caption will be added separately.";

export type ImageShotBrief = {
  /** 사진에서 찾은 홍보 포인트 (한글, 짧은 설명) */
  cafeSymbol: string;
  /** 영어 피사체 설명 */
  heroSubject: string;
  /** 카메라/구도 지시 */
  composition: string;
  /** 이미지 모델에 넣을 영어 샷 브리프 */
  shotBrief: string;
};

/** 글자 없는 배경 — 첨부 사진을 '뒷배경 붙이기'가 아니라 상징 요소를 살린 재구도로 그린다 */
export function buildImageBackgroundPrompt(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  shot: ImageShotBrief,
  variant: "clean" | "warm",
): string {
  const concept = profile?.concept ? ` Cafe concept: ${profile.concept}.` : "";
  const cafe = profile?.name ? ` Cafe name context (do not render as text): ${profile.name}.` : "";
  const mood =
    variant === "clean"
      ? "Lighting: bright natural daylight, clean airy palette, crisp food photography."
      : "Lighting: warm golden-hour cafe light, soft shadows, cozy inviting tones.";

  const hasPhotos = input.photoPaths.length > 0;
  const photoDirection = hasPhotos
    ? [
        "REFERENCE PHOTOS are provided. Do NOT paste them as a flat full-frame background.",
        "Recompose into a NEW promotional photograph: change camera angle, crop, depth of field, and framing.",
        `Hero to emphasize (must stay honest and recognizable): ${shot.heroSubject}.`,
        `Composition: ${shot.composition}.`,
        shot.shotBrief,
        "Keep the real drink/food/interior identity from the references. Do not invent a different menu item.",
        "Leave calm negative space (often lower third or side) for a caption overlay later.",
      ].join(" ")
    : [
        `Create an original photorealistic cafe promotional photo.`,
        `Hero: ${shot.heroSubject || purposeLabels[input.purpose]}.`,
        `Composition: ${shot.composition}.`,
        shot.shotBrief,
        "Leave calm negative space for a caption overlay later.",
      ].join(" ");

  return [
    "Professional Instagram square (1:1) promotional photo for a Korean neighborhood cafe.",
    photoDirection,
    mood,
    concept,
    cafe,
    "High-end cafe/food photography. Photorealistic. No collage, no mockup UI, no watermark.",
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join(" ");
}

/** 사진을 보고 상징 요소·구도·문구를 기획 */
export function buildImagePlanSystemPrompt(profile: CafeProfile | null): string {
  return `너는 카페 사진을 보고 '무엇을 홍보할지'와 '어떤 구도로 찍을지'를 정하는 한국어 아트 디렉터다.
${profileContext(profile)}
${COMMON_RULES}
첨부 사진이 있으면 반드시:
1) 카페를 상징하는 포인트(메뉴 디테일, 라떼아트, 원두, 인테리어 시그니처, 조명·테이블 분위기 등)를 찾는다
2) 사진을 그대로 배경으로 쓰지 말고, 그 포인트를 살린 서로 다른 촬영 구도 2안을 제안한다
3) 사진에 없는 메뉴·가격·혜택·수상을 지어내지 않는다

필드:
- cafeSymbol: 사진에서 찾은 홍보 포인트 한 줄 (한글, 예: "하트 라떼아트가 선명한 시그니처 라떼")
- suggestedTitle: 12자 이내 한글 제목
- options: 서로 다른 두 안
  - headline 12자 이내, subline 18자 이내(없으면 "")
  - templateId: fade_bottom|story_chip|glass_center|frame_border|side_rail|bottom_card|bold_cover|minimal_bar (서로 다르게)
  - composition: hero_closeup|atmosphere_wide|detail_macro|tabletop_story|overhead_flatlay|offcenter_portrait 중 하나 (두 안이 서로 다르게)
  - heroSubject: 영어, 강조할 피사체
  - shotBrief: 영어 2~3문장. 카메라 각도·초점·분위기. "do not use as flat background" 포함`;
}

export function buildImagePlanUserPrompt(input: ImageGenerationInput): string {
  return [
    `목적: ${purposeLabels[input.purpose]}`,
    input.title ? `사장님이 정한 제목: "${input.title}"` : "제목은 사진의 상징 포인트를 보고 제안해줘.",
    input.message ? `한 줄 설명: "${input.message}"` : "",
    input.dateText ? `날짜/기간: "${input.dateText}"` : "",
    input.photoPaths.length
      ? `첨부 사진 ${input.photoPaths.length}장: 상징 요소를 찾고, 서로 다른 구도 2안(예: 클로즈업 vs 분위기 와이드)으로 기획해.`
      : "사진 없음: 제목·목적만으로 구도 2안을 기획해.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildNoticeSystemPrompt(profile: CafeProfile | null): string {
  return `카페 매장 안내물 문구 작가. 한국어.
${profileContext(profile)}
${COMMON_RULES}
- 톤이 다른 두 안 (간결 정보형 / 다정한 카페형)
- lines는 짧게. footer는 한 줄 또는 빈 문자열.`;
}

export function buildNoticeUserPrompt(input: NoticeGenerationInput): string {
  return `종류: ${noticeTypeLabels[input.noticeType]}
내용: "${input.details}"`;
}
