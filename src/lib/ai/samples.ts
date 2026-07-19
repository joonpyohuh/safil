import {
  channelLabels,
  noticeTypeLabels,
  type CafeProfile,
  type CopyGenerationInput,
  type CopyGenerationOutput,
  type ImageGenerationInput,
  type ImageGenerationOutput,
  type NoticeGenerationInput,
  type NoticeGenerationOutput,
} from "@/lib/schemas";

// Deterministic outputs used when OPENAI_API_KEY is absent.
// Responses carry isSample: true so the UI can label them honestly.

export function sampleCopy(
  input: CopyGenerationInput,
  profile: CafeProfile | null,
): CopyGenerationOutput {
  const cafe = profile?.name ?? "우리 카페";
  const isInstagram = input.channel === "instagram";
  const hashtags = isInstagram
    ? ["동네카페", "카페추천", "신메뉴", cafe.replace(/\s/g, "")]
    : [];
  return {
    options: [
      {
        text: `${cafe} 소식입니다. ${input.message} 매장에서 직접 확인해 보세요.`,
        reason: `핵심 내용을 담백하게 전하는 안내형 문구입니다. ${channelLabels[input.channel]}에 무난하게 어울립니다.`,
        hashtags,
      },
      {
        text: `오늘의 ${cafe}. ${input.message} 잠시 들러 천천히 즐겨 보세요.`,
        reason: "카페의 분위기를 살린 감성형 문구입니다. 사진과 함께 올리면 좋습니다.",
        hashtags,
      },
      {
        text: `안녕하세요, ${cafe}입니다! ${input.message} 오시는 길에 편하게 들러 주세요 :)`,
        reason: "손님에게 말을 거는 친근한 대화형 문구입니다. 단골 손님에게 반응이 좋은 스타일입니다.",
        hashtags,
      },
    ],
  };
}

export function sampleImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): ImageGenerationOutput {
  const headline = input.title || "새로운 소식";
  return {
    options: [
      {
        templateId: "bottom_band",
        headline,
        subline: profile?.name ?? "",
        dateText: input.dateText,
        palette: "espresso",
        reason: "사진을 가리지 않도록 하단에 띠를 두는 구성입니다. 피드에서 안정적으로 보입니다.",
      },
      {
        templateId: "center_card",
        headline,
        subline: input.dateText ? "" : (profile?.location ?? ""),
        dateText: input.dateText,
        palette: "cream",
        reason: "중앙 카드형은 제목을 또렷하게 강조하고 싶을 때 좋습니다.",
      },
    ],
  };
}

export function sampleNotice(
  input: NoticeGenerationInput,
  profile: CafeProfile | null,
): NoticeGenerationOutput {
  const title = noticeTypeLabels[input.noticeType];
  const footer = profile?.name ? `${profile.name} 드림` : "감사합니다";
  return {
    options: [
      {
        title,
        lines: [input.details],
        footer: "",
        palette: "cream",
        reason: "필요한 정보만 큰 글씨로 전달하는 간결한 안내형입니다.",
      },
      {
        title,
        lines: [input.details, "궁금한 점은 편하게 직원에게 말씀해 주세요."],
        footer,
        palette: "espresso",
        reason: "카페의 다정한 말투를 살려 손님이 환영받는 느낌을 주는 구성입니다.",
      },
    ],
  };
}
