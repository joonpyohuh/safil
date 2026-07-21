import {
  channelLabels,
  IMAGE_MOOD_LABELS,
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

/** 글자 없는 체험용 배경 (문구는 캔버스가 얹음) */
function sampleBackgroundDataUrl(tone: "clean" | "warm" | "moody"): string {
  const stops =
    tone === "clean"
      ? ["#fdf9f3", "#f3e7d8", "#e7d4be"]
      : tone === "moody"
        ? ["#2f2924", "#3d342c", "#1a1612"]
        : ["#4a332a", "#3a2620", "#2a1a15"];
  const accent =
    tone === "clean" ? "#d8bfa4" : tone === "moody" ? "#a67c52" : "#6b4a3a";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${stops[0]}"/>
      <stop offset="0.6" stop-color="${stops[1]}"/>
      <stop offset="1" stop-color="${stops[2]}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="780" cy="240" r="180" fill="${accent}" opacity="0.35"/>
  <circle cx="220" cy="520" r="120" fill="${accent}" opacity="0.25"/>
  <circle cx="620" cy="700" r="220" fill="${accent}" opacity="0.18"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function sampleImage(
  input: ImageGenerationInput,
  profile: CafeProfile | null,
): ImageGenerationOutput {
  const bodyText = input.message.trim();
  const cafeName = profile?.name || "";
  const cafeLocation = profile?.location || "";
  const brandCue = (profile?.concept || profile?.location || "").slice(0, 18);
  const firstLine =
    input.title.trim() ||
    input.message.split(/[\n,·|]/)[0]?.trim() ||
    purposeLabels[input.purpose];

  return {
    options: [
      {
        imagePath: "",
        imageUrl: sampleBackgroundDataUrl("warm"),
        headline: firstLine.slice(0, 16),
        subline: brandCue,
        bodyText,
        dateText: input.dateText,
        templateId: "fade_bottom",
        palette: "auto",
        usedReferencePhotos: false,
        cafeName,
        cafeLocation,
        brandCue,
        mood: "menu_hero",
        moodLabel: IMAGE_MOOD_LABELS.menu_hero,
        useCase: "메뉴·원두 소개 피드",
        photoTreatment: "warm_film",
        reason: cafeName
          ? `${cafeName} · 메뉴 클로즈업으로 새로 그린 체험용이에요.`
          : "메뉴 클로즈업으로 새로 그린 체험용이에요.",
      },
      {
        imagePath: "",
        imageUrl: sampleBackgroundDataUrl("moody"),
        headline: (brandCue || firstLine).slice(0, 16),
        subline: brandCue,
        bodyText,
        dateText: input.dateText,
        templateId: "side_rail",
        palette: "espresso",
        usedReferencePhotos: false,
        cafeName,
        cafeLocation,
        brandCue,
        mood: "space_story",
        moodLabel: IMAGE_MOOD_LABELS.space_story,
        useCase: "매장 분위기·방문 유도",
        photoTreatment: "moody_editorial",
        reason: "공간·분위기로 새로 그린 체험용이에요.",
      },
      {
        imagePath: "",
        imageUrl: sampleBackgroundDataUrl("clean"),
        headline: firstLine.slice(0, 16),
        subline: brandCue,
        bodyText,
        dateText: input.dateText,
        templateId: "bold_cover",
        palette: "cream",
        usedReferencePhotos: false,
        cafeName,
        cafeLocation,
        brandCue,
        mood: "promo_clear",
        moodLabel: IMAGE_MOOD_LABELS.promo_clear,
        useCase: "가격·기간·행사 안내",
        photoTreatment: "clean_bright",
        reason: "소식·안내로 새로 그린 체험용이에요. 다시 만들면 실제 AI 이미지로 시도해요.",
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
