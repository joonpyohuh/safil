import {
  channelLabels,
  noticeTypeLabels,
  purposeLabels,
  toneLabels,
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
  const location = profile?.location ? profile.location.split(" ").slice(-2).join("") : "동네";
  const menuTag = profile?.menus[0]?.replace(/\s/g, "");
  const purposeTag = purposeLabels[input.purpose].replace(/\s/g, "");
  const hashtags = isInstagram
    ? [
        location,
        "동네카페",
        purposeTag,
        cafe.replace(/\s/g, ""),
        ...(menuTag ? [menuTag] : []),
      ].filter((tag, index, all) => tag && all.indexOf(tag) === index)
    : [];
  const profileReason = profile
    ? `${cafe}의 ${toneLabels[profile.tone]} 말투와 ${profile.location} 정보를 반영했어요.`
    : "입력하신 내용을 중심으로 작성했어요.";

  if (!isInstagram) {
    return {
      options: [
        {
          text: `[${purposeLabels[input.purpose]}] ${input.message}\n\n${cafe}에서 준비한 소식입니다. 자세한 내용은 매장에서 확인해 주세요.`,
          reason: `네이버 플레이스에서 핵심 정보가 먼저 보이도록 제목과 내용을 분리했어요. ${profileReason}`,
          hashtags: [],
        },
        {
          text: `${cafe} 소식\n\n${input.message}\n\n${profile?.location ? `${profile.location}에서` : "매장에서"} 편하게 만나보세요.`,
          reason: `카페 이름과 위치를 자연스럽게 넣어 처음 보는 손님도 이해하기 쉽게 했어요. ${profileReason}`,
          hashtags: [],
        },
        {
          text: `${input.message}\n\n찾아주시는 분들이 편하게 확인하실 수 있도록 소식으로 전해드립니다. ${cafe}에서 기다릴게요.`,
          reason: `단골 손님에게 직접 안내하는 듯한 문장으로 부담 없이 읽히게 했어요. ${profileReason}`,
          hashtags: [],
        },
      ],
    };
  }

  return {
    options: [
      {
        text: `${input.message}\n\n${cafe}에서 준비했어요. 오늘도 편하게 들러주세요.`,
        reason: `첫 줄에 핵심 소식을 두어 피드에서 바로 읽히는 안내형이에요. ${profileReason}`,
        hashtags,
      },
      {
        text: `오늘, ${cafe}에서 만나는 작은 즐거움.\n\n${input.message}\n\n천천히 머물다 가세요.`,
        reason: `카페의 분위기가 느껴지도록 여백과 짧은 문장을 사용했어요. ${profileReason}`,
        hashtags,
      },
      {
        text: `안녕하세요, ${cafe}입니다.\n${input.message}\n\n궁금하셨다면 이번에 가볍게 맛보러 오세요!`,
        reason: `단골 손님에게 직접 말을 거는 친근한 방식이에요. ${channelLabels[input.channel]}에서 댓글과 대화를 이어가기 좋아요. ${profileReason}`,
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
