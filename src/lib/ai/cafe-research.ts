import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI, getTextModel, isAiConfigured } from "@/lib/ai/client";

export type CafePlaceCandidate = {
  placeName: string;
  placeAddress: string;
  placeUrl: string;
  whyMatch: string;
};

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
  concept: z.string().describe("카페 컨셉 한 줄"),
  atmosphere: z.string().describe("분위기·공간감 2~3문장"),
  introduction: z.string().describe("홍보에 쓸 카페 이야기 3~5문장"),
  menus: z.array(z.string()).describe("대표 메뉴 추정, 없으면 빈 배열"),
  customerType: z.string().describe("주요 손님층"),
  researchSummary: z.string().describe("리뷰·검색에서 파악한 요약"),
  researchSources: z.array(z.string()).describe("참고한 URL"),
  vibeHints: z
    .array(z.string())
    .describe("분위기 키워드 한글 3~6개 (예: 아늑함, 원두향)"),
});

async function webResearchText(query: string): Promise<string> {
  const openai = getOpenAI();
  try {
    // Responses API + web_search (네이버/구글 공개 검색 결과 활용)
    const response = await openai.responses.create(
      {
        model: getTextModel(),
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        input: query,
      },
      { timeout: 45_000 },
    );
    const text =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response as any).output_text ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response as any).output
        ?.map((item: { content?: { text?: string }[] }) =>
          item.content?.map((c) => c.text).join("") ?? "",
        )
        .join("\n") ??
      "";
    if (text.trim()) return text.trim();
  } catch (error) {
    console.error("[safil web_search fallback]", error);
  }

  // 웹검색 도구 실패 시: 모델 지식만으로 후보/요약 (사장님 확인 필수)
  const completion = await openai.chat.completions.create(
    {
      model: getTextModel(),
      messages: [
        {
          role: "system",
          content:
            "한국 카페 조사 도우미. 확실하지 않으면 추측이라고 밝히고, 없는 URL을 지어내지 않는다.",
        },
        { role: "user", content: query },
      ],
      max_completion_tokens: 1200,
    },
    { timeout: 25_000 },
  );
  return completion.choices[0]?.message.content?.trim() ?? "";
}

async function parseStructured<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  name: string,
): Promise<T> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.parse(
    {
      model: getTextModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: zodResponseFormat(schema, name),
      max_completion_tokens: 1200,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reasoning_effort: "minimal",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    { timeout: 20_000 },
  );
  const parsed = completion.choices[0]?.message.parsed as T | null;
  if (!parsed) throw new Error("RESEARCH_PARSE_FAILED");
  return parsed;
}

/** 1단계: 카페 이름·위치로 후보 검색 → 사장님 확인용 */
export async function searchCafePlaces(
  name: string,
  location: string,
): Promise<{ candidates: CafePlaceCandidate[]; rawNote: string }> {
  if (!isAiConfigured()) {
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

  const raw = await webResearchText(
    [
      `한국에서 카페 "${name}" (${location})를 네이버 지도/플레이스와 구글 맵에서 찾아줘.`,
      "같은 이름 분점이 있으면 주소가 다른 후보를 나눠 적어줘.",
      "각 후보: 상호, 주소, 공개 URL(네이버/구글), 왜 이 카페인지 한 줄.",
      "리뷰 요약은 아직 하지 말고 후보 목록만.",
    ].join("\n"),
  );

  const parsed = await parseStructured(
    "당신은 검색 결과를 정리하는 도우미다. URL이 없으면 빈 문자열. 없는 가게를 만들지 않는다.",
    `카페 검색 원문:\n${raw}\n\n위 내용을 후보 JSON으로 정리해.`,
    candidatesSchema,
    "cafe_candidates",
  );

  return {
    candidates: parsed.candidates.slice(0, 5),
    rawNote: raw.slice(0, 500),
  };
}

/** 2단계: 확인된 매장에 대해 리뷰·소개 딥리서치 */
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

  const raw = await webResearchText(
    [
      `확정된 카페: "${params.placeName}"`,
      `주소: ${params.placeAddress || params.location}`,
      params.placeUrl ? `참고 URL: ${params.placeUrl}` : "",
      "네이버 플레이스·지도 리뷰, 블로그, 구글 리뷰를 조사해 이 카페의 분위기·강점·대표 메뉴·손님층을 정리해줘.",
      "과장·보장성 표현 금지. 리뷰에 없는 사실은 쓰지 말 것.",
      "홍보 문구/이미지에 바로 쓸 수 있게 쉬운 한국어로.",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return parseStructured(
    "카페 브랜드 리서처. 리뷰 근거만 요약. 과장 금지. 쉬운 한국어.",
    `딥리서치 원문:\n${raw}\n\n프로필에 넣을 필드로 정리해.`,
    deepSchema,
    "cafe_deep_research",
  );
}
