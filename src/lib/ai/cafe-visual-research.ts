import { z } from "zod";
import {
  getOpenAI,
  getSearchModel,
  isAiConfigured,
} from "@/lib/ai/client";
import type { CafeProfile } from "@/lib/schemas";
import { buildBrandVisualBrief } from "@/lib/ai/brand-visual";

export type CafeVisualMood = {
  /** 영어 — 이미지 프롬프트에 바로 붙임 */
  englishVisual: string;
  /** 한글 — 사장님용 한 줄 */
  koreanMood: string;
  /** 인스타·웹에서 잡힌 키워드 */
  moodKeywords: string[];
  sources: string[];
};

const visualSchema = z.object({
  englishVisual: z.string(),
  koreanMood: z.string(),
  moodKeywords: z.array(z.string()),
  sources: z.array(z.string()),
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

function fallbackFromProfile(profile: CafeProfile | null): CafeVisualMood {
  const brand = buildBrandVisualBrief(profile);
  return {
    englishVisual:
      brand?.englishLook ||
      "Independent Korean neighborhood cafe, soft natural light, honest materials, calm Instagram feed aesthetic.",
    koreanMood: brand
      ? `${brand.cafeName}의 ${brand.atmosphere || brand.concept || "편안한"} 분위기`
      : "따뜻하고 정갈한 동네 카페 분위기",
    moodKeywords: brand?.vibeLabels?.slice(0, 5) ?? ["아늑함", "자연광"],
    sources: [],
  };
}

/**
 * 카페 인스타·네이버·블로그 비주얼 무드를 빠르게 조사.
 * 이미지 생성 프롬프트에 바로 쓰는 영어 브리프를 반환.
 */
export async function researchCafeVisualMood(
  profile: CafeProfile | null,
): Promise<CafeVisualMood> {
  if (!profile?.name?.trim() || !isAiConfigured()) {
    return fallbackFromProfile(profile);
  }

  const openai = getOpenAI();
  const place = [
    `카페: ${profile.name}`,
    profile.location ? `위치: ${profile.location}` : "",
    profile.concept ? `컨셉: ${profile.concept}` : "",
    profile.atmosphere ? `분위기(사장님): ${profile.atmosphere}` : "",
    profile.researchSummary
      ? `기존 리뷰 요약: ${profile.researchSummary.slice(0, 500)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await openai.responses.create(
      {
        model: getSearchModel(),
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        max_output_tokens: 900,
        input: [
          "한국 카페 비주얼 리서처. Instagram·네이버 플레이스·블로그 사진을 조사.",
          place,
          "이 카페 피드/매장 사진에서 반복되는 조명·색·소재·구도·공간감을 잡아라.",
          "없는 수상·가격·메뉴를 지어내지 말 것. 질문 금지. JSON만.",
          "englishVisual은 이미지 생성용 영어 4~7문장 (photoreal Instagram cafe ad still).",
          "koreanMood는 사장님용 한 줄. moodKeywords 3~6개. sources는 URL.",
          '{"englishVisual":"","koreanMood":"","moodKeywords":[],"sources":[]}',
        ].join("\n\n"),
      },
      { timeout: 18_000 },
    );

    const parsed = parseJsonObject(extractOutputText(response), visualSchema);
    if (parsed?.englishVisual?.trim()) {
      return {
        englishVisual: parsed.englishVisual.trim().slice(0, 1200),
        koreanMood: (parsed.koreanMood || "").trim().slice(0, 80),
        moodKeywords: (parsed.moodKeywords ?? []).slice(0, 8),
        sources: (parsed.sources ?? []).slice(0, 8),
      };
    }
  } catch (error) {
    console.error("[safil cafe visual research]", error);
  }

  return fallbackFromProfile(profile);
}
