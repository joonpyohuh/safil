import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAI, getSearchModel, isAiConfigured } from "@/lib/ai/client";
import {
  averageTotal,
  checkMinAccept,
  formatRubricForPrompt,
} from "@/lib/eval/rubric";
import {
  axisScoreSchema,
  type AxisScores,
  type EvalCaseResult,
  type GoldenPost,
} from "@/lib/eval/types";

const judgeOutputSchema = z.object({
  scores: axisScoreSchema,
  notes: z.string(),
  bestOptionIndex: z.number().int().min(0).max(4).nullable(),
});

export type GeneratedCandidate = {
  text?: string;
  headline?: string;
  reason?: string;
  hashtags?: string[];
};

/** 레퍼런스 자체 점수 → offline 검증용 케이스 결과 */
export function scoreReferenceAsBaseline(post: GoldenPost): EvalCaseResult {
  const { passed, failedAxes } = checkMinAccept(
    post.referenceScores,
    post.minAccept,
  );
  return {
    id: post.id,
    kind: post.kind,
    scores: post.referenceScores,
    total: averageTotal(post.referenceScores),
    passed,
    failedAxes,
    notes: "reference_self_check",
  };
}

/** AI Judge: 생성 결과(또는 레퍼런스)를 루브릭으로 채점 */
export async function judgeAgainstGolden(params: {
  post: GoldenPost;
  candidates: GeneratedCandidate[];
  selectedIndex?: number | null;
}): Promise<EvalCaseResult> {
  const { post, candidates } = params;
  if (!isAiConfigured()) {
    return heuristicJudge(post, candidates);
  }

  const openai = getOpenAI();
  const optionsBlock = candidates
    .map((c, i) => {
      const body = [c.headline, c.text, c.reason, (c.hashtags ?? []).join(" ")]
        .filter(Boolean)
        .join("\n");
      return `[옵션 ${i}]\n${body}`;
    })
    .join("\n\n");

  const completion = await openai.chat.completions.parse(
    {
      model: getSearchModel(),
      messages: [
        {
          role: "system",
          content: [
            "당신은 카페 사장님 관점의 엄격한 품질 심사위원이다.",
            "각 축 0~10. 과장·보장 문구는 noHype를 크게 깎는다.",
            "레퍼런스보다 낫지 않아도 된다. min 기준만 생각하면 안 되고 정직하게 채점.",
            "JSON만.",
            formatRubricForPrompt(),
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `골든 ID: ${post.id}`,
            `카페: ${post.cafe.name} / ${post.cafe.location}`,
            `컨셉: ${post.cafe.concept}`,
            `분위기: ${post.cafe.atmosphere}`,
            `톤: ${post.cafe.tone} / 손님: ${post.cafe.customerType}`,
            `목적: ${post.promptInput.purpose}`,
            `채널: ${post.channel}`,
            `레퍼런스 캡션:\n${post.reference.caption}`,
            `시각 가이드: ${post.reference.visualNotes}`,
            `생성 후보:\n${optionsBlock || "(후보 없음 — 레퍼런스만 평가)"}`,
            "가장 게시하기 좋은 옵션 인덱스를 bestOptionIndex에. 없으면 null.",
          ].join("\n\n"),
        },
      ],
      response_format: zodResponseFormat(judgeOutputSchema, "safil_eval_judge"),
      max_completion_tokens: 800,
    },
    { timeout: 25_000 },
  );

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) return heuristicJudge(post, candidates);

  const scores = parsed.scores as AxisScores;
  const { passed, failedAxes } = checkMinAccept(scores, post.minAccept);
  return {
    id: post.id,
    kind: post.kind,
    scores,
    total: averageTotal(scores),
    passed,
    failedAxes,
    notes: parsed.notes,
    selectedOptionIndex: parsed.bestOptionIndex ?? params.selectedIndex ?? undefined,
    discardedOptionIndices:
      parsed.bestOptionIndex != null
        ? candidates.map((_, i) => i).filter((i) => i !== parsed.bestOptionIndex)
        : undefined,
  };
}

/** 키 없을 때·오프라인: 간단한 휴리스틱 */
export function heuristicJudge(
  post: GoldenPost,
  candidates: GeneratedCandidate[],
): EvalCaseResult {
  const text = candidates
    .map((c) => [c.text, c.headline].filter(Boolean).join(" "))
    .join("\n");
  const corpus = text || post.reference.caption;
  const nameHit = corpus.includes(post.cafe.name) ? 1 : 0;
  const menuHit = post.cafe.menus.some((m) => corpus.includes(m)) ? 1 : 0;
  const hype =
    /최고|1등|보장|무조건|대박|완판 확실/.test(corpus) ? 1 : 0;

  const scores: AxisScores = {
    brandFit: 6.5 + nameHit * 1.5 + menuHit,
    typography: corpus.length > 40 && corpus.length < 450 ? 7.5 : 6,
    photoAuthenticity: post.kind === "copy" ? 7 : 6.5,
    postability: corpus.length > 20 ? 7.5 : 5,
    specificity: 6 + nameHit + menuHit,
    toneMatch: 7,
    noHype: hype ? 4 : 8.5,
  };

  const { passed, failedAxes } = checkMinAccept(scores, post.minAccept);
  return {
    id: post.id,
    kind: post.kind,
    scores,
    total: averageTotal(scores),
    passed,
    failedAxes,
    notes: "heuristic",
    selectedOptionIndex: 0,
    discardedOptionIndices: candidates.length > 1 ? [1, 2].filter((i) => i < candidates.length) : [],
  };
}
