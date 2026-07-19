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

// PRODUCT_PRINCIPLES.md §3·4: never promise outcomes, never manipulate.
const COMMON_RULES = `
규칙 (반드시 지킬 것):
- 과장하거나 보장할 수 없는 표현 금지: "검색 1위", "매출 상승 보장", "무조건", "최고" 같은 표현을 쓰지 않는다.
- 허위 정보, 리뷰 조작 유도, 키워드 남발 금지.
- 사장님이 그대로 게시하거나 인쇄할 수 있는 완성된 결과물을 만든다.
- 카페 정보에 없는 사실(가격, 원산지, 수상 이력 등)을 지어내지 않는다.
- reason(이유)은 마케팅 전문 용어 없이, 사장님이 이해할 수 있는 쉬운 한국어로 1~2문장.
`;

function profileContext(profile: CafeProfile | null): string {
  if (!profile) {
    return "카페 프로필이 아직 등록되지 않았다. 일반적인 동네 카페 톤으로 작성하되, 특정 사실을 지어내지 않는다.";
  }
  const menus = profile.menus.length > 0 ? profile.menus.join(", ") : "미등록";
  return `
카페 정보 (이 정보를 결과물에 자연스럽게 반영할 것):
- 이름: ${profile.name}
- 위치: ${profile.location}
- 콘셉트: ${profile.concept || "미등록"}
- 소개: ${profile.introduction || "미등록"}
- 대표 메뉴: ${menus}
- 말투 선호: ${toneLabels[profile.tone]}
- 주 고객층: ${profile.customerType || "미등록"}
`.trim();
}

export function buildCopySystemPrompt(profile: CafeProfile | null): string {
  return `너는 동네 카페의 홍보 문구를 대신 써 주는 한국어 카피라이터다.
${profileContext(profile)}
${COMMON_RULES}
- 서로 분위기가 다른 3개의 문구를 만든다 (예: 담백한 안내형 / 감성형 / 친근한 대화형).
- 인스타그램이면 이모지를 절제해서 사용해도 좋고, hashtags에 한국어 해시태그 5~8개를 # 없이 담는다.
- 네이버 플레이스 소식이면 이모지와 해시태그 없이 정보 중심으로 쓰고 hashtags는 빈 배열로 둔다.`;
}

export function buildCopyUserPrompt(input: CopyGenerationInput): string {
  return `목적: ${purposeLabels[input.purpose]}
게시할 채널: ${channelLabels[input.channel]}
사장님이 알리고 싶은 내용: "${input.message}"
${input.photoPath ? "사진이 함께 게시될 예정이다." : "사진 없이 글만 게시될 수 있다."}`;
}

export function buildImageSystemPrompt(profile: CafeProfile | null): string {
  return `너는 카페 홍보 이미지의 문구와 구성을 정하는 한국어 디자이너다.
사진 자체는 절대 수정되지 않는다. 사진 위에 올릴 텍스트와 배치, 색만 정한다.
${profileContext(profile)}
${COMMON_RULES}
- 서로 다른 두 가지 구성을 만든다 (템플릿과 팔레트가 겹치지 않게).
- headline은 12자 이내로 짧고 명확하게. subline은 선택 사항.
- templateId: bottom_band(하단 띠), top_band(상단 띠), center_card(중앙 카드) 중 선택.
- palette: cream(크림), espresso(진갈색), forest(딥그린), berry(버건디) 중 사진과 어울리는 것을 선택.`;
}

export function buildImageUserPrompt(input: ImageGenerationInput): string {
  return `목적: ${purposeLabels[input.purpose]}
${input.title ? `사장님이 원하는 제목: "${input.title}"` : "제목은 자유롭게 제안."}
${input.dateText ? `표기할 날짜/기간: "${input.dateText}"` : "날짜 표기는 필요 없으면 빈 문자열."}`;
}

export function buildNoticeSystemPrompt(profile: CafeProfile | null): string {
  return `너는 카페 매장에 붙이는 안내물의 문구를 쓰는 한국어 작가다.
${profileContext(profile)}
${COMMON_RULES}
- 서로 톤이 다른 두 가지 안을 만든다 (하나는 간결한 정보형, 하나는 카페 말투가 살아있는 형).
- lines의 각 줄은 손님이 한눈에 읽을 수 있게 짧게. 필요한 정보(비밀번호, 위치, 시간 등)를 정확히 담는다.
- footer는 부드러운 맺음말 한 줄, 필요 없으면 빈 문자열.`;
}

export function buildNoticeUserPrompt(input: NoticeGenerationInput): string {
  return `안내물 종류: ${noticeTypeLabels[input.noticeType]}
안내할 내용: "${input.details}"`;
}
