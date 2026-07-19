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

export const cafeProfileInputSchema = z.object({
  name: z.string().trim().min(1, mobileMsg.profile.nameRequired).max(60),
  location: z.string().trim().min(1, mobileMsg.profile.locationRequired).max(120),
  concept: z.string().trim().max(200).default(""),
  introduction: z.string().trim().max(500).default(""),
  menus: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  tone: z.enum(toneValues).default("warm"),
  customerType: z.string().trim().max(120).default(""),
  logoPath: z.string().trim().max(120).nullable().default(null),
  photoPaths: z.array(z.string().trim().max(120)).max(10).default([]),
});

export type CafeProfileInput = z.infer<typeof cafeProfileInputSchema>;

export type CafeProfile = CafeProfileInput & {
  createdAt: number;
  updatedAt: number;
};

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
// 2. Promotional image (design spec — the photo itself is never altered)
// ---------------------------------------------------------------------------

export const imageTemplateValues = ["bottom_band", "top_band", "center_card"] as const;
export const imagePaletteValues = ["cream", "espresso", "forest", "berry"] as const;

export const imageGenerationInputSchema = z.object({
  purpose: z.enum(purposeValues),
  photoPath: z.string().trim().min(1, "사진을 업로드해 주세요").max(120),
  title: z.string().trim().max(60).default(""),
  dateText: z.string().trim().max(40).default(""),
});

export type ImageGenerationInput = z.infer<typeof imageGenerationInputSchema>;

export const imageOptionSchema = z.object({
  templateId: z.enum(imageTemplateValues).describe("텍스트 배치 템플릿"),
  headline: z.string().describe("이미지 위에 올릴 짧은 헤드라인 (12자 이내 권장)"),
  subline: z.string().describe("보조 문구, 없으면 빈 문자열"),
  dateText: z.string().describe("날짜/기간 표기, 없으면 빈 문자열"),
  palette: z.enum(imagePaletteValues).describe("오버레이 색 팔레트"),
  reason: z.string().describe("이 구성을 제안한 이유"),
});

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
  })
  .refine(
    (value) =>
      value.selectedIndex !== undefined ||
      value.copied !== undefined ||
      value.downloaded !== undefined,
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
  isSample: boolean;
  createdAt: number;
};
