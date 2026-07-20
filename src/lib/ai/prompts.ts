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

export function buildImagePrompt(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
  variant: "clean" | "warm",
): string {
  const cafe = profile?.name ? `"${profile.name}"` : "동네 카페";
  const location = profile?.location ? `, ${profile.location}` : "";
  const concept = profile?.concept ? `, ${profile.concept} 분위기` : "";
  const dateLine = input.dateText ? ` Include the date text "${input.dateText}" clearly.` : "";
  const style =
    variant === "clean"
      ? "Clean modern cafe poster, soft natural light, generous negative space, elegant Korean typography."
      : "Warm cozy cafe poster, soft cream and espresso tones, inviting atmosphere, clear Korean typography.";

  return [
    `Create a mobile SNS promotional image for a Korean cafe ${cafe}${location}${concept}.`,
    `Purpose: ${purposeLabels[input.purpose]}.`,
    `Main headline text on the image (exact Korean): "${input.title}".`,
    dateLine,
    style,
    "Square Instagram-friendly composition, readable text, no misleading food claims, no fake awards or rankings.",
    "Do not invent prices. Photorealistic cafe aesthetic, high readability.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildImageSystemPrompt(profile: CafeProfile | null): string {
  return `카페 홍보 이미지 문구 도우미.
${profileContext(profile)}
${COMMON_RULES}`;
}

export function buildImageUserPrompt(input: ImageGenerationInput): string {
  return `목적: ${purposeLabels[input.purpose]}
제목: "${input.title}"
날짜: "${input.dateText || ""}"`;
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
