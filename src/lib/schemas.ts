import { z } from "zod";
import { mobileMsg } from "@/lib/mobile-messages";

// ---------------------------------------------------------------------------
// Café profile
// ---------------------------------------------------------------------------

export const toneValues = ["warm", "calm", "professional", "witty"] as const;
export type Tone = (typeof toneValues)[number];

export const toneLabels: Record<Tone, string> = {
  warm: "따뜻하고 다정한",
  calm: "차분하고 정갈한",
  professional: "전문적이고 믿음직한",
  witty: "위트 있고 경쾌한",
};

/** 카페 분위기 태그 (사장님이 고르는 칩) */
export const vibeTagValues = [
  "cozy",
  "minimal",
  "roastery",
  "dessert",
  "study",
  "vintage",
  "nature",
  "trendy",
] as const;
export type VibeTag = (typeof vibeTagValues)[number];

export const vibeTagLabels: Record<VibeTag, string> = {
  cozy: "아늑하고 따뜻한",
  minimal: "미니멀·깔끔한",
  roastery: "로스터리·원두 중심",
  dessert: "디저트·베이커리",
  study: "공부·작업하기 좋은",
  vintage: "빈티지·감성",
  nature: "자연광·식물",
  trendy: "트렌디·핫플",
};

export const cafeProfileInputSchema = z.object({
  name: z.string().trim().min(1, mobileMsg.profile.nameRequired).max(60),
  location: z.string().trim().min(1, mobileMsg.profile.locationRequired).max(120),
  concept: z.string().trim().max(200).default(""),
  introduction: z.string().trim().max(500).default(""),
  /** 사장님이 직접 적은 분위기·컨셉 설명 */
  atmosphere: z.string().trim().max(400).default(""),
  vibeTags: z.array(z.enum(vibeTagValues)).max(6).default([]),
  menus: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  tone: z.enum(toneValues).default("warm"),
  customerType: z.string().trim().max(120).default(""),
  logoPath: z.string().trim().max(120).nullable().default(null),
  photoPaths: z.array(z.string().trim().max(120)).max(10).default([]),
  /** 네이버/구글 딥리서치 요약 (확인 후 저장) */
  researchSummary: z.string().trim().max(2000).default(""),
  researchSources: z.array(z.string().trim().max(300)).max(12).default([]),
  placeConfirmed: z.boolean().default(false),
});

export type CafeProfileInput = z.infer<typeof cafeProfileInputSchema>;

export type CafeProfile = CafeProfileInput & {
  createdAt: number;
  updatedAt: number;
};

export const cafeResearchSearchSchema = z.object({
  name: z.string().trim().min(1).max(60),
  location: z.string().trim().min(1).max(120),
});

export const cafeResearchConfirmSchema = z.object({
  name: z.string().trim().min(1).max(60),
  location: z.string().trim().min(1).max(120),
  placeName: z.string().trim().min(1).max(120),
  placeAddress: z.string().trim().max(200).default(""),
  placeUrl: z.string().trim().max(300).default(""),
});

// ---------------------------------------------------------------------------
// Shared generation vocabulary
// ---------------------------------------------------------------------------

export const purposeValues = ["new_menu", "event", "daily", "notice"] as const;
export type Purpose = (typeof purposeValues)[number];

export const purposeLabels: Record<Purpose, string> = {
  new_menu: "신메뉴 소개",
  event: "이벤트 안내",
  daily: "일상 소식",
  notice: "공지사항",
};

export const channelValues = ["instagram", "naver_place"] as const;
export type Channel = (typeof channelValues)[number];

export const channelLabels: Record<Channel, string> = {
  instagram: "인스타그램",
  naver_place: "네이버 플레이스 소식",
};

export const generationTypeValues = ["copy", "image", "notice"] as const;
export type GenerationType = (typeof generationTypeValues)[number];

// ---------------------------------------------------------------------------
// 1. Promotional copy
// ---------------------------------------------------------------------------

export const copyGenerationInputSchema = z.object({
  purpose: z.enum(purposeValues),
  message: z.string().trim().min(2, mobileMsg.copy.messageTooShort).max(200),
  channel: z.enum(channelValues),
  photoPath: z.string().trim().max(120).nullable().default(null),
});

export type CopyGenerationInput = z.infer<typeof copyGenerationInputSchema>;

export const copyOptionSchema = z.object({
  text: z.string().describe("바로 게시할 수 있는 완성된 홍보 문구"),
  reason: z.string().describe("이 문구를 제안한 이유를 사장님이 이해할 수 있는 쉬운 한국어로"),
  hashtags: z.array(z.string()).describe("# 없이 해시태그 단어만, 인스타그램이 아니면 빈 배열"),
});

export const copyGenerationOutputSchema = z.object({
  options: z.array(copyOptionSchema).length(3),
});

export type CopyGenerationOutput = z.infer<typeof copyGenerationOutputSchema>;

// ---------------------------------------------------------------------------
// 2. Promotional image
// AI는 글자 없는 배경만 만들고, 한글·레이아웃은 HTML→PNG(html-to-image)로
// 얹는다 (한글 깨짐 방지 + 광고형 타이포 퀄리티).
// ---------------------------------------------------------------------------

export const imagePaletteValues = ["cream", "espresso", "forest", "berry", "auto"] as const;
export type ImagePalette = (typeof imagePaletteValues)[number];

/** HTML 포스터 레이아웃 — 서로 다른 인스타 광고 구도 */
/** 광고형 포스터 템플릿 (8종 + 하위 호환) */
export const imageTemplateValues = [
  "fade_bottom",
  "cream_panel",
  "glass_center",
  "frame_border",
  "side_rail",
  "split_sheet",
  "bold_cover",
  "minimal_bar",
  // 하위 호환
  "story_chip",
  "bottom_card",
  "bottom_band",
  "top_band",
  "center_card",
] as const;
export type ImageTemplate = (typeof imageTemplateValues)[number];

export const IMAGE_TEMPLATE_LABELS: Record<ImageTemplate, string> = {
  fade_bottom: "에디토리얼 하단",
  cream_panel: "크림 사이드",
  glass_center: "유리 카드",
  frame_border: "얇은 프레임",
  side_rail: "다크 레일",
  split_sheet: "사진·종이 분할",
  bold_cover: "빅 타이틀",
  minimal_bar: "미니멀 마스트",
  story_chip: "크림 사이드",
  bottom_card: "사진·종이 분할",
  bottom_band: "에디토리얼 하단",
  top_band: "크림 사이드",
  center_card: "유리 카드",
};

/** 편집 UI에 노출하는 8종 */
export const EDITABLE_IMAGE_TEMPLATES = [
  "fade_bottom",
  "cream_panel",
  "glass_center",
  "frame_border",
  "side_rail",
  "split_sheet",
  "bold_cover",
  "minimal_bar",
] as const satisfies readonly ImageTemplate[];

/** 구 템플릿 ID → 신규 */
export function normalizeImageTemplate(id: string | undefined): ImageTemplate {
  if (id === "bottom_band" || id === "fade_bottom") return "fade_bottom";
  if (id === "top_band" || id === "story_chip") return "cream_panel";
  if (id === "center_card") return "glass_center";
  if (id === "bottom_card") return "split_sheet";
  if ((EDITABLE_IMAGE_TEMPLATES as readonly string[]).includes(id ?? "")) {
    return id as ImageTemplate;
  }
  if ((imageTemplateValues as readonly string[]).includes(id ?? "")) {
    return id as ImageTemplate;
  }
  return "fade_bottom";
}

export const MAX_IMAGE_REFERENCE_PHOTOS = 6;

export const imageGenerationInputSchema = z.object({
  purpose: z.enum(purposeValues).default("daily"),
  /** 참고 사진(선택). 있으면 원본 사진으로 디자인만, 없으면 AI 배경 1장 */
  photoPaths: z
    .array(z.string().trim().min(1).max(160))
    .max(MAX_IMAGE_REFERENCE_PHOTOS, mobileMsg.image.tooManyPhotos)
    .default([]),
  /** 짧은 제목(선택). 비우면 목적·본문에서 짧게 제안 */
  title: z.string().trim().max(40).default(""),
  dateText: z.string().trim().max(40).default(""),
  /** 이번에 꼭 알릴 내용 — 포스터 본문에 사실 그대로 */
  message: z
    .string()
    .trim()
    .min(1, mobileMsg.image.announceRequired)
    .max(240),
});

export type ImageGenerationInput = z.infer<typeof imageGenerationInputSchema>;

export const imageOptionSchema = z.object({
  imagePath: z.string().describe("배경 파일명"),
  imageUrl: z.string().describe("배경 이미지 URL"),
  headline: z.string().describe("제목"),
  /** @deprecated brandCue 사용 — 하위 호환 */
  subline: z.string().default(""),
  /** 홍보 본문(사실 그대로) */
  bodyText: z.string().default(""),
  dateText: z.string().describe("날짜/기간"),
  templateId: z.enum(imageTemplateValues),
  palette: z.enum(imagePaletteValues),
  reason: z.string(),
  usedReferencePhotos: z.boolean(),
  cafeName: z.string().default(""),
  cafeLocation: z.string().default(""),
  brandCue: z.string().default(""),
});

export type ImageOption = z.infer<typeof imageOptionSchema>;

export const imageGenerationOutputSchema = z.object({
  options: z.array(imageOptionSchema).length(2),
});

export type ImageGenerationOutput = z.infer<typeof imageGenerationOutputSchema>;

// ---------------------------------------------------------------------------
// 3. In-store notice
// ---------------------------------------------------------------------------

export const noticeTypeValues = ["wifi", "restroom", "parking", "hours", "order_guide"] as const;
export type NoticeType = (typeof noticeTypeValues)[number];

export const noticeTypeLabels: Record<NoticeType, string> = {
  wifi: "와이파이 안내",
  restroom: "화장실 안내",
  parking: "주차 안내",
  hours: "영업시간 변경",
  order_guide: "주문 방법 안내",
};

export const noticeGenerationInputSchema = z.object({
  noticeType: z.enum(noticeTypeValues),
  details: z.string().trim().min(1, "안내할 내용을 입력해 주세요").max(300),
});

export type NoticeGenerationInput = z.infer<typeof noticeGenerationInputSchema>;

export const noticeOptionSchema = z.object({
  title: z.string().describe("안내물 제목"),
  lines: z.array(z.string()).describe("본문 줄 목록, 각 줄은 짧고 명확하게"),
  footer: z.string().describe("맺음 문구, 카페 톤에 맞게. 없으면 빈 문자열"),
  palette: z.enum(imagePaletteValues).describe("안내물 색 팔레트"),
  reason: z.string().describe("이 구성을 제안한 이유"),
});

export const noticeGenerationOutputSchema = z.object({
  options: z.array(noticeOptionSchema).length(2),
});

export type NoticeGenerationOutput = z.infer<typeof noticeGenerationOutputSchema>;

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const historyPatchSchema = z
  .object({
    selectedIndex: z.number().int().min(0).max(4).nullable().optional(),
    copied: z.boolean().optional(),
    downloaded: z.boolean().optional(),
    /** 실제로 SNS/네이버에 올렸는지 (복사·다운로드와 별개) */
    posted: z.boolean().optional(),
    /** 선택 시 버려진 옵션 인덱스 (학습용) */
    discardedIndices: z.array(z.number().int().min(0).max(4)).max(4).optional(),
  })
  .refine(
    (value) =>
      value.selectedIndex !== undefined ||
      value.copied !== undefined ||
      value.downloaded !== undefined ||
      value.posted !== undefined ||
      value.discardedIndices !== undefined,
    { message: mobileMsg.history.nothingToUpdate },
  );

export type HistoryPatch = z.infer<typeof historyPatchSchema>;

export type GenerationRecord = {
  id: string;
  type: GenerationType;
  input: unknown;
  options: unknown[];
  selectedIndex: number | null;
  copied: boolean;
  downloaded: boolean;
  posted: boolean;
  postedAt: number | null;
  discardedIndices: number[];
  isSample: boolean;
  createdAt: number;
};
