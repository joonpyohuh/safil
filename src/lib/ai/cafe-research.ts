import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  getOpenAI,
  getSearchModel,
  isAiConfigured,
} from "@/lib/ai/client";
import {
  searchKakaoPlaces,
  searchNaverPlaces,
  type CafePlaceCandidate,
} from "@/lib/places/search";

export type { CafePlaceCandidate };

export type CafeResearchDeep = {
  concept: string;
  atmosphere: string;
  introduction: string;
  menus: string[];
  customerType: string;
  researchSummary: string;
  researchSources: string[];
  vibeHints: string[];
};

const candidatesSchema = z.object({
  candidates: z
    .array(
      z.object({
        placeName: z.string(),
        placeAddress: z.string(),
        placeUrl: z.string(),
        whyMatch: z.string(),
      }),
    )
    .max(5),
});

const deepSchema = z.object({
  concept: z.string(),
  atmosphere: z.string(),
  introduction: z.string(),
  menus: z.array(z.string()),
  customerType: z.string(),
  researchSummary: z.string(),
  researchSources: z.array(z.string()),
  vibeHints: z.array(z.string()),
});

function extractOutputText(response: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = response as any;
  if (typeof r?.output_text === "string" && r.output_text.trim()) {
    return r.output_text.trim();
  }
  const chunks =
    r?.output
      ?.map((item: { content?: { text?: string }[] }) =>
        item.content?.map((c) => c.text).join("") ?? "",
      )
      .join("\n") ?? "";
  return String(chunks).trim();
}

function parseJsonObject<T>(text: string, schema: z.ZodType<T>): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function filterRelevant(
  candidates: CafePlaceCandidate[],
  name: string,
): CafePlaceCandidate[] {
  const tokens = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return candidates.slice(0, 5);

  const scored = candidates
    .map((c) => {
      const hay = `${c.placeName} ${c.placeAddress}`.toLowerCase();
      const hits = tokens.filter((t) => hay.includes(t)).length;
      return { c, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.c);

  return scored.length > 0 ? scored.slice(0, 5) : candidates.slice(0, 3);
}

function dedupeCandidates(list: CafePlaceCandidate[]): CafePlaceCandidate[] {
  const seen = new Set<string>();
  const out: CafePlaceCandidate[] = [];
  for (const c of list) {
    const key = `${c.placeName}|${c.placeAddress}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.slice(0, 5);
}

async function webSearchJsonCandidates(
  name: string,
  location: string,
): Promise<CafePlaceCandidate[]> {
  const openai = getOpenAI();
  const response = await openai.responses.create(
    {
      model: getSearchModel(),
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      max_output_tokens: 700,
      input: [
        "한국 카페 장소 검색. 질문 금지. JSON만.",
        `카페: "${name}" / 위치: "${location}"`,
        "네이버·구글 맵에서 같은 상호만. 다른 카페 금지.",
        '{"candidates":[{"placeName":"","placeAddress":"","placeUrl":"","whyMatch":""}]}',
      ].join("\n"),
    },
    { timeout: 18_000 },
  );
  const parsed = parseJsonObject(extractOutputText(response), candidatesSchema);
  return parsed?.candidates.slice(0, 5) ?? [];
}

/** 1단계: 빠른 장소 후보 */
export async function searchCafePlaces(
  name: string,
  location: string,
): Promise<{ candidates: CafePlaceCandidate[]; rawNote: string }> {
  if (
    !isAiConfigured() &&
    !process.env.KAKAO_REST_API_KEY &&
    !process.env.NAVER_CLIENT_ID
  ) {
    return {
      candidates: [
        {
          placeName: name,
          placeAddress: location,
          placeUrl: "",
          whyMatch: "체험 모드라 검색 없이 입력하신 이름으로 보여드려요.",
        },
      ],
      rawNote: "sample",
    };
  }

  try {
    const [kakao, naver] = await Promise.all([
      searchKakaoPlaces(name, location).catch(() => [] as CafePlaceCandidate[]),
      searchNaverPlaces(name, location).catch(() => [] as CafePlaceCandidate[]),
    ]);
    const merged = dedupeCandidates([...kakao, ...naver]);
    if (merged.length > 0) {
      return { candidates: filterRelevant(merged, name), rawNote: "local_api" };
    }
  } catch (error) {
    console.error("[safil place api]", error);
  }

  if (isAiConfigured()) {
    try {
      const fromWeb = await webSearchJsonCandidates(name, location);
      const filtered = filterRelevant(fromWeb, name);
      if (filtered.length > 0) {
        return { candidates: filtered, rawNote: "web_search" };
      }
    } catch (error) {
      console.error("[safil place web_search]", error);
    }
  }

  return {
    candidates: [
      {
        placeName: name,
        placeAddress: location,
        placeUrl: "",
        whyMatch: "자동으로 못 찾아 입력하신 정보로 보여드려요. 맞으면 골라 주세요.",
      },
    ],
    rawNote: "user_input_fallback",
  };
}

/**
 * 2단계: 단일 패스 딥리서치
 * web_search + JSON을 한 번에 → 이중 LLM 호출 제거로 속도와 품질 개선
 */
export async function deepResearchCafe(params: {
  name: string;
  location: string;
  placeName: string;
  placeAddress: string;
  placeUrl: string;
}): Promise<CafeResearchDeep> {
  if (!isAiConfigured()) {
    return {
      concept: `${params.placeName}만의 분위기`,
      atmosphere: "따뜻하고 편안한 동네 카페 분위기",
      introduction: `${params.placeName}에서 손님에게 전하고 싶은 이야기를 적어 주세요.`,
      menus: [],
      customerType: "동네 손님",
      researchSummary: "체험 모드라 웹 리뷰 조사는 건너뛰었어요.",
      researchSources: [],
      vibeHints: ["아늑함", "편안함"],
    };
  }

  const openai = getOpenAI();
  const placeLine = [
    `확정 카페: ${params.placeName}`,
    `주소: ${params.placeAddress || params.location}`,
    params.placeUrl ? `URL: ${params.placeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const jsonSpec = `반드시 아래 JSON만 출력 (질문·설명 금지):
{"concept":"컨셉 한 줄","atmosphere":"분위기 2~3문장","introduction":"홍보용 이야기 3~5문장","menus":["대표메뉴"],"customerType":"손님층","researchSummary":"리뷰·검색 요약 4~8문장","researchSources":["https://..."],"vibeHints":["키워드","키워드","키워드"]}`;

  try {
    const response = await openai.responses.create(
      {
        model: getSearchModel(),
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        max_output_tokens: 1400,
        input: [
          "한국 카페 브랜드 리서처. 네이버 플레이스·지도 리뷰·블로그·구글 리뷰를 조사.",
          placeLine,
          "과장·보장·없는 가격/수상 금지. 쉬운 한국어. 홍보에 바로 쓸 톤.",
          "스페셜티·로스터리라면 원두·공간·철학을 짧게. 일반 동네 카페면 메뉴·분위기·손님 경험을 짧게.",
          "researchSummary는 실제 리뷰에서 반복되는 표현을 모아 4~8문장.",
          "menus는 공개된 대표 메뉴만(없으면 빈 배열). vibeHints는 2~5개.",
          jsonSpec,
        ].join("\n\n"),
      },
      { timeout: 28_000 },
    );

    const fromText = parseJsonObject(extractOutputText(response), deepSchema);
    if (fromText) return normalizeDeep(fromText, params.placeName);
  } catch (error) {
    console.error("[safil deep research single-pass]", error);
  }

  // 폴백: 웹검색 없이 구조화만 (빠르지만 약함)
  try {
    const completion = await openai.chat.completions.parse(
      {
        model: getSearchModel(),
        messages: [
          {
            role: "system",
            content:
              "카페 프로필 작성. 확실하지 않으면 솔직히. 없는 URL·사실 금지. 쉬운 한국어.",
          },
          {
            role: "user",
            content: `${placeLine}\n공개 지식 범위에서 프로필 JSON 필드를 채워라.`,
          },
        ],
        response_format: zodResponseFormat(deepSchema, "cafe_deep_fast"),
        max_completion_tokens: 900,
      },
      { timeout: 16_000 },
    );
    const parsed = completion.choices[0]?.message.parsed;
    if (parsed) return normalizeDeep(parsed, params.placeName);
  } catch (error) {
    console.error("[safil deep research fallback]", error);
  }

  return {
    concept: `${params.placeName}만의 개성`,
    atmosphere: "손님이 편안하게 머무는 동네 카페 분위기",
    introduction: `${params.placeName}의 이야기를 사장님 말로 조금 더 적어 주시면 홍보에 반영돼요.`,
    menus: [],
    customerType: "동네·방문 손님",
    researchSummary: "웹 조사가 불완전해요. 아래 내용을 확인·수정해 주세요.",
    researchSources: params.placeUrl ? [params.placeUrl] : [],
    vibeHints: ["편안함", "정갈함"],
  };
}

function normalizeDeep(
  data: CafeResearchDeep,
  placeName: string,
): CafeResearchDeep {
  return {
    concept: data.concept?.trim() || `${placeName}만의 분위기`,
    atmosphere: data.atmosphere?.trim() || "따뜻하고 편안한 카페 분위기",
    introduction: data.introduction?.trim() || "",
    menus: (data.menus ?? []).filter(Boolean).slice(0, 12),
    customerType: data.customerType?.trim() || "동네 손님",
    researchSummary: data.researchSummary?.trim() || "",
    researchSources: (data.researchSources ?? [])
      .filter((u) => /^https?:\/\//i.test(u))
      .slice(0, 12),
    vibeHints: (data.vibeHints ?? []).filter(Boolean).slice(0, 6),
  };
}
