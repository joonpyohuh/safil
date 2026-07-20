import type { AxisScores, ScoreAxis } from "@/lib/eval/types";
import { scoreAxisLabels, scoreAxisValues } from "@/lib/eval/types";

/** 채점 가이드 — AI Judge / 인간 큐레이터 공통 */
export const RUBRIC_GUIDE: Record<ScoreAxis, string> = {
  brandFit:
    "카페 컨셉·분위기·메뉴와 맞는가. 다른 동네 카페/프랜차이즈 톤이 아닌가.",
  typography:
    "문구·포스터 글자가 읽기 쉬운가. 인스타/네이버에 올렸을 때 답답하지 않은가. (문구만이면 줄바꿈·길이 기준)",
  photoAuthenticity:
    "실제 매장·메뉴처럼 보이는가. 과한 AI 느낌·가짜 소품·어울리지 않는 소품이 없는가. (문구만이면 N/A→참고 시각 설명 대비)",
  postability:
    "사장님이 오늘 바로 올릴 수 있는가. 추가 수정이 거의 필요 없는가.",
  specificity:
    "상호·메뉴·위치·계절 등 구체 정보가 있는가. 어디서나 쓸 수 있는 뻔한 문장이 아닌가.",
  toneMatch:
    "프로필 톤(따뜻/차분/전문/위트)과 손님층에 맞는가.",
  noHype:
    "보장·과장·허위 할인·'최고/1등' 남발이 없는가. PRODUCT_PRINCIPLES 준수.",
};

export function averageTotal(scores: AxisScores): number {
  const sum = scoreAxisValues.reduce((acc, key) => acc + scores[key], 0);
  return Math.round((sum / scoreAxisValues.length) * 10) / 10;
}

export function meanAxisScores(list: AxisScores[]): AxisScores {
  const empty = Object.fromEntries(
    scoreAxisValues.map((k) => [k, 0]),
  ) as AxisScores;
  if (list.length === 0) return empty;
  for (const scores of list) {
    for (const key of scoreAxisValues) {
      empty[key] += scores[key];
    }
  }
  for (const key of scoreAxisValues) {
    empty[key] = Math.round((empty[key] / list.length) * 10) / 10;
  }
  return empty;
}

export function checkMinAccept(
  scores: AxisScores,
  minAccept: Partial<AxisScores>,
): { passed: boolean; failedAxes: ScoreAxis[] } {
  const failedAxes: ScoreAxis[] = [];
  for (const key of scoreAxisValues) {
    const min = minAccept[key];
    if (typeof min === "number" && scores[key] < min) {
      failedAxes.push(key);
    }
  }
  return { passed: failedAxes.length === 0, failedAxes };
}

export function formatRubricForPrompt(): string {
  return scoreAxisValues
    .map((key) => `- ${key} (${scoreAxisLabels[key]}): ${RUBRIC_GUIDE[key]}`)
    .join("\n");
}

/** 회귀: 현재 평균이 베이스라인보다 축/합계에서 너무 떨어지면 fail */
export function detectRegression(
  current: AxisScores,
  currentTotal: number,
  baseline: {
    meanScores: AxisScores;
    meanTotal: number;
    maxDropPerAxis: Partial<AxisScores>;
    maxDropTotal: number;
  },
): { ok: boolean; regressions: string[] } {
  const regressions: string[] = [];
  const totalDrop = baseline.meanTotal - currentTotal;
  if (totalDrop > baseline.maxDropTotal) {
    regressions.push(
      `전체 평균 ${baseline.meanTotal} → ${currentTotal} (허용 하락 ${baseline.maxDropTotal})`,
    );
  }
  for (const key of scoreAxisValues) {
    const maxDrop = baseline.maxDropPerAxis[key] ?? 0.8;
    const drop = baseline.meanScores[key] - current[key];
    if (drop > maxDrop) {
      regressions.push(
        `${scoreAxisLabels[key]} ${baseline.meanScores[key]} → ${current[key]} (허용 ${maxDrop})`,
      );
    }
  }
  return { ok: regressions.length === 0, regressions };
}
