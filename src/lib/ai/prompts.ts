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

/** 글자 없는 배경 이미지 프롬프트 (한글 깨짐 방지: 텍스트는 캔버스로 얹음) */
export function buildImageBackgroundPrompt(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  scene: string,
  variant: "clean" | "warm",
): string {
  const concept = profile?.concept ? ` The cafe concept: ${profile.concept}.` : "";
  const style =
    variant === "clean"
      ? "Bright, clean, airy composition with soft natural daylight and generous negative space in the lower third."
      : "Warm, cozy composition with golden-hour tones, gentle shadows, and calm negative space in the lower third.";
  const photoHint =
    input.photoPaths.length > 0
      ? "Enhance the provided cafe photo(s) into a polished promotional shot: better lighting, composition, and color. Keep the actual menu/food/space fully recognizable and honest. Do not replace the subject with a different item."
      : `Create an original photorealistic cafe scene: ${scene || purposeLabels[input.purpose]}.`;

  return [
    `Professional Instagram promotional background photo for a Korean neighborhood cafe.`,
    photoHint,
    scene && input.photoPaths.length > 0 ? `Scene mood: ${scene}.` : "",
    concept,
    style,
    "Square 1:1 composition, high-end food/cafe photography aesthetic.",
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join(" ");
}

/** 사진을 보고 분위기와 문구를 계획하는 비전 프롬프트 */
export function buildImagePlanSystemPrompt(profile: CafeProfile | null): string {
  return `너는 카페 사진을 보고 홍보 이미지를 기획하는 한국어 디자이너다.
${profileContext(profile)}
${COMMON_RULES}
- scene: 사진(또는 요청)의 피사체·분위기를 영어 한 문장으로 (이미지 생성 프롬프트용)
- suggestedTitle: 사진에 어울리는 12자 이내 한글 제목
- options: 서로 다른 두 안. headline 12자 이내, subline 18자 이내(없으면 빈 문자열)
- 사진에 없는 메뉴·가격·혜택을 지어내지 않는다`;
}

export function buildImagePlanUserPrompt(input: ImageGenerationInput): string {
  return [
    `목적: ${purposeLabels[input.purpose]}`,
    input.title ? `사장님이 정한 제목: "${input.title}"` : "제목은 사진을 보고 제안해줘.",
    input.message ? `한 줄 설명: "${input.message}"` : "",
    input.dateText ? `날짜/기간: "${input.dateText}"` : "",
    input.photoPaths.length
      ? `첨부한 사진 ${input.photoPaths.length}장을 보고 분위기를 파악해.`
      : "사진 없이 제목과 목적만으로 기획해.",
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
