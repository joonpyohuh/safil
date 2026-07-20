/**
 * 실제 한국 카페 SNS 패턴을 반영한 큐레이션 골든셋 생성.
 * (저작권 보호를 위해 문구는 재작성·합성. source=curated_public_pattern)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../evals/golden/cafe-posts.json");

const archetypes = [
  {
    id: "specialty_roastery",
    cafes: [
      ["원두향 로스터리", "서울 성수", "직접 로스팅한 싱글오리진", "원두 향이 느껴지는 정갈한 바", ["에티오피아 워시드", "필터커피"], "calm", "커피 애호가"],
      ["새벽그라인드", "부산 전포", "라이트 로스팅 스페셜티", "조용하고 집중되는 공간", ["게이샤", "콜드브루"], "professional", "직장인·취미 홈바리스타"],
      ["나무사이 커피", "제주 애월", "제주의 바람과 싱글오리진", "창밖으로 바다가 보이는 차분함", ["한라산 블렌드", "아메리카노"], "calm", "여행객·로컬"],
    ],
  },
  {
    id: "neighborhood",
    cafes: [
      ["골목다방", "서울 연남", "동네 사랑방 같은 카페", "낯설지 않은 따뜻함", ["시그니처 라떼", "수제 쿠키"], "warm", "동네 손님"],
      ["오후세시", "대구 동성로", "퇴근 후 잠깐 쉬는 곳", "부드러운 조명과 편한 의자", ["고구마라떼", "치즈케이크"], "warm", "회사원"],
      ["느린오후", "광주 동명동", "천천히 머무르는 골목 카페", "책과 커피가 어울리는 조용함", ["핸드드립", "브라우니"], "calm", "학생·프리랜서"],
    ],
  },
  {
    id: "dessert_aesthetic",
    cafes: [
      ["설탕공방", "서울 연희", "수제 디저트가 주인공", "밝고 산뜻한 테이블", ["말차티라미수", "딸기생크림"], "warm", "데이트·친구"],
      ["크림앤빈", "인천 송도", "비주얼 좋은 케이크 카페", "흰 테이블과 꽃", ["바스크치즈", "레몬타르트"], "witty", "2030 여성"],
      ["달콤한점", "대전 둔산", "사진 찍고 싶은 디저트", "파스텔톤 인테리어", ["크로플", "아이스크림라떼"], "warm", "학생"],
    ],
  },
  {
    id: "bakery_cafe",
    cafes: [
      ["오븐옆자리", "서울 망원", "매일 굽는 빵과 커피", "갓 나온 빵 냄새", ["소금빵", "크루아상"], "warm", "동네·주말 가족"],
      ["밀가루일기", "수원 행궁", "발효에 진심인 베이커리", "목재 선반과 따뜻한 불빛", ["캄파뉴", "바게트"], "calm", "빵 좋아하는 손님"],
      ["하루식빵", "창원 상남", "아침 식빵이 유명한 곳", "일찍 여는 골목 분위기", ["우유식빵", "버터프레첼"], "warm", "아침 손님"],
    ],
  },
  {
    id: "study_quiet",
    cafes: [
      ["집중의시간", "서울 신촌", "공부·작업하기 좋은 카페", "소음이 적고 콘센트 많음", ["아메리카노", "카페라떼"], "calm", "학생·취준생"],
      ["페이지앤컵", "서울 혜화", "책과 함께하는 조용한 카페", "서가와 낮은 조명", ["더치커피", "허브티"], "calm", "독서·작업"],
    ],
  },
  {
    id: "brunch",
    cafes: [
      ["아침식탁", "서울 한남", "브런치가 메인인 카페", "여유로운 주말 테이블", ["에그베네딕트", "팬케이크"], "warm", "주말 브런치"],
      ["느린브런치", "부산 해운대", "바다 근처 브런치", "밝은 채광", ["아보카도토스트", "그라놀라"], "witty", "커플·친구"],
    ],
  },
  {
    id: "traditional_teahouse",
    cafes: [
      ["차향담", "서울 북촌", "전통차와 현대 감성", "한옥 마루의 고요함", ["대추차", "쑥인절미"], "calm", "여행객·중장년"],
      ["다실하루", "경주 황리단길", "차와 디저트의 절제된 맛", "고즈넉한 마당", ["유자차", "약과"], "professional", "관광객"],
    ],
  },
  {
    id: "franchise_independent",
    cafes: [
      ["우리만의컵", "서울 잠실", "체인 느낌 없이 단골 중심", "친근하고 밝은 홀", ["바닐라라떼", "아이스티"], "warm", "아파트 단지 손님"],
      ["스팟커피", "성남 분당", "빠른 테이크아웃도 OK", "깔끔한 카운터", ["아이스아메리카노", "쿠키"], "professional", "오피스"],
    ],
  },
];

const purposes = [
  ["new_menu", "신메뉴 소개", "이번 주 새로 나온 메뉴를 알려요"],
  ["seasonal", "계절 메뉴", "계절에 맞는 음료·디저트를 알려요"],
  ["hours", "영업 안내", "영업시간·휴무를 알려요"],
  ["mood", "매장 분위기", "와서 쉬고 싶게 매장 느낌을 전해요"],
  ["event", "작은 이벤트", "스탬프·사이드 증정 등 작은 소식을 알려요"],
  ["bean", "원두·로스팅", "이번 주 로스팅·원두 이야기를 알려요"],
  ["thanks", "단골 인사", "단골 손님께 짧은 인사를 전해요"],
  ["rainy", "비 오는 날", "비 오는 날 오기 좋은 이유를 알려요"],
];

const channels = [
  ["instagram", "instagram"],
  ["naver_place", "naver"],
  ["blog", "blog"],
  ["kakao", "kakao"],
];

function scoresFor(archetype, purpose) {
  const base = {
    brandFit: 8.5,
    typography: 8,
    photoAuthenticity: 8,
    postability: 8.5,
    specificity: 8,
    toneMatch: 8.5,
    noHype: 9,
  };
  if (purpose === "bean" || archetype === "specialty_roastery") {
    base.specificity = 9;
    base.brandFit = 9;
  }
  if (archetype === "dessert_aesthetic") {
    base.photoAuthenticity = 9;
    base.typography = 8.5;
  }
  if (purpose === "hours") {
    base.postability = 9.5;
    base.specificity = 9;
  }
  return base;
}

function minAccept(ref) {
  return {
    brandFit: Math.max(6.5, ref.brandFit - 1.5),
    typography: Math.max(6, ref.typography - 1.5),
    photoAuthenticity: Math.max(6, ref.photoAuthenticity - 2),
    postability: Math.max(7, ref.postability - 1.2),
    specificity: Math.max(6.5, ref.specificity - 1.5),
    toneMatch: Math.max(6.5, ref.toneMatch - 1.5),
    noHype: Math.max(7.5, ref.noHype - 1),
  };
}

function caption(cafe, purposeId, channel) {
  const [name, , concept, atmosphere, menus] = cafe;
  const menu = menus[0];
  const templates = {
    new_menu: `${name}에 ${menu}가 새로 나왔어요.\n${concept} 그대로, ${atmosphere}에서 천천히 드셔 보세요.\n궁금하시면 매장에서 먼저 맛보셔도 좋아요.`,
    seasonal: `날씨에 맞춰 ${menu}를 준비해 두었어요.\n${name}의 ${atmosphere}과 잘 어울려요.\n오늘은 테이크아웃도 가능해요.`,
    hours: `${name} 이번 주 안내예요.\n평일 10:00–20:00 / 주말 10:00–21:00\n재료 소진 시 조기 마감될 수 있어요. 방문 전 확인해 주세요.`,
    mood: `${atmosphere}.\n${name}은 ${concept}을 지키는 공간이에요.\n잠깐 쉬고 싶을 때 들러 주세요.`,
    event: `이번 주 ${name} 작은 소식이에요.\n음료 4잔 도장 모으시면 쿠키를 드려요.\n자세한 내용은 매장에서 안내해 드릴게요.`,
    bean: `이번 주 로스팅: ${menu}.\n${concept}을 기준으로 향과 산미를 맞춰 봤어요.\n드립으로 드시면 ${atmosphere}이 더 잘 느껴져요.`,
    thanks: `늘 ${name}에 와 주셔서 고마워요.\n오늘은 ${menu}를 천천히 준비해 둘게요.\n편하실 때 들러 주세요.`,
    rainy: `비 오는 날엔 ${atmosphere}이 더 잘 어울려요.\n${name}에서 ${menu} 한 잔과 잠시 쉬어 가세요.`,
  };
  let text = templates[purposeId] || templates.mood;
  if (channel === "naver_place") {
    text = text.replace(/\n/g, " ").slice(0, 220);
  }
  return text;
}

function visualNotes(archetype, purposeId) {
  if (purposeId === "hours") return "텍스트 중심. 사진 없이도 게시 가능.";
  const map = {
    specialty_roastery: "원두·드리퍼·바 클로즈업. 과한 필터 없이 실제 매장 톤.",
    neighborhood: "홀 전경 또는 창가 좌석. 사람 얼굴보다 공간·잔.",
    dessert_aesthetic: "디저트 45도 각도. 배경은 테이블 질감만.",
    bakery_cafe: "갓 나온 빵·선반. 손 등장 시 자연광.",
    study_quiet: "노트북·책상·콘센트. 소란스러운 단체 사진 지양.",
    brunch: "플레이트 전체 + 커피. 과한 소품 배치 금지.",
    traditional_teahouse: "찻잔·마루·은은한 채광. 네온·형광 톤 금지.",
    franchise_independent: "카운터·테이크아웃 컵. 과장된 광고 배너 느낌 금지.",
  };
  return map[archetype] || "실제 매장 사진 우선.";
}

const posts = [];
let n = 0;

for (const arch of archetypes) {
  for (const cafe of arch.cafes) {
    for (const [purposeId, purposeLabel, message] of purposes) {
      if (n >= 72) break;
      const [ch, promptCh] = channels[n % channels.length];
      const kind = purposeId === "hours" ? "copy" : n % 5 === 0 ? "both" : n % 3 === 0 ? "image" : "copy";
      const refScores = scoresFor(arch.id, purposeId);
      const [name, location, concept, atmosphere, menus, tone, customerType] = cafe;
      const cap = caption(cafe, purposeId, ch);
      posts.push({
        id: `gp-${String(n + 1).padStart(3, "0")}`,
        source: "curated_public_pattern",
        channel: ch,
        kind,
        archetype: arch.id,
        cafe: {
          name,
          location,
          concept,
          atmosphere,
          menus,
          tone,
          customerType,
        },
        reference: {
          caption: cap,
          hashtags:
            ch === "instagram"
              ? [name.replace(/\s/g, ""), location.split(" ").pop(), menus[0].replace(/\s/g, "")]
              : [],
          visualNotes: visualNotes(arch.id, purposeId),
          whyGood: `${purposeLabel} 목적에 맞고, ${name} 컨셉(${concept})이 드러나며 과장 없이 바로 게시 가능한 톤.`,
        },
        promptInput: {
          purpose: purposeLabel,
          message: `${message}. 대표 메뉴: ${menus.join(", ")}`,
          channel: promptCh,
        },
        referenceScores: refScores,
        minAccept: minAccept(refScores),
        tags: [arch.id, purposeId, ch, kind],
      });
      n += 1;
    }
    if (n >= 72) break;
  }
  if (n >= 72) break;
}

const dataset = {
  version: "2026-07-20.1",
  createdAt: "2026-07-20",
  description:
    "한국 독립 카페 SNS·네이버 플레이스 게시 패턴을 반영한 큐레이션 골든셋 72건. 브랜드 적합성·타이포·사진 진정성·게시 가능성 등 축별 점수와 회귀 minAccept 포함.",
  posts,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(dataset, null, 2), "utf8");
console.log(`Wrote ${posts.length} posts → ${outPath}`);
