import { z } from "zod";

/** 품질 채점 축 (각 0–10) */
export const scoreAxisValues = [
  "brandFit",
  "typography",
  "photoAuthenticity",
  "postability",
  "specificity",
  "toneMatch",
  "noHype",
] as const;

export type ScoreAxis = (typeof scoreAxisValues)[number];

export const scoreAxisLabels: Record<ScoreAxis, string> = {
  brandFit: "브랜드 적합성",
  typography: "타이포·가독성",
  photoAuthenticity: "사진 진정성",
  postability: "게시 가능성",
  specificity: "구체성",
  toneMatch: "톤 일치",
  noHype: "과장 없음",
};

export const axisScoreSchema = z.object({
  brandFit: z.number().min(0).max(10),
  typography: z.number().min(0).max(10),
  photoAuthenticity: z.number().min(0).max(10),
  postability: z.number().min(0).max(10),
  specificity: z.number().min(0).max(10),
  toneMatch: z.number().min(0).max(10),
  noHype: z.number().min(0).max(10),
});

export type AxisScores = z.infer<typeof axisScoreSchema>;

export const cafeArchetypeValues = [
  "specialty_roastery",
  "neighborhood",
  "dessert_aesthetic",
  "bakery_cafe",
  "study_quiet",
  "brunch",
  "traditional_teahouse",
  "franchise_independent",
] as const;

export type CafeArchetype = (typeof cafeArchetypeValues)[number];

export const goldenPostSchema = z.object({
  id: z.string(),
  source: z.enum([
    "curated_public_pattern",
    "pilot_owner",
    "imported_url",
  ]),
  channel: z.enum(["instagram", "naver_place", "blog", "kakao"]),
  kind: z.enum(["copy", "image", "both"]),
  archetype: z.enum(cafeArchetypeValues),
  cafe: z.object({
    name: z.string(),
    location: z.string(),
    concept: z.string(),
    atmosphere: z.string(),
    menus: z.array(z.string()),
    tone: z.enum(["warm", "calm", "professional", "witty"]),
    customerType: z.string(),
  }),
  /** 실제/참고 게시물 본문 (골든 레퍼런스) */
  reference: z.object({
    caption: z.string(),
    hashtags: z.array(z.string()).default([]),
    visualNotes: z.string().default(""),
    whyGood: z.string(),
  }),
  /** 생성기에 넣을 입력 */
  promptInput: z.object({
    purpose: z.string(),
    message: z.string(),
    channel: z.string(),
  }),
  /** 이 레퍼런스가 받은 인간/큐레이터 점수 */
  referenceScores: axisScoreSchema,
  /** 회귀 통과에 필요한 최소 점수 (생성 결과) */
  minAccept: axisScoreSchema.partial(),
  tags: z.array(z.string()).default([]),
});

export type GoldenPost = z.infer<typeof goldenPostSchema>;

export const goldenDatasetSchema = z.object({
  version: z.string(),
  createdAt: z.string(),
  description: z.string(),
  posts: z.array(goldenPostSchema).min(50).max(120),
});

export type GoldenDataset = z.infer<typeof goldenDatasetSchema>;

export type EvalCaseResult = {
  id: string;
  kind: GoldenPost["kind"];
  scores: AxisScores;
  total: number;
  passed: boolean;
  failedAxes: ScoreAxis[];
  notes: string;
  selectedOptionIndex?: number;
  discardedOptionIndices?: number[];
};

export type EvalRunSummary = {
  runId: string;
  createdAt: string;
  model: string;
  mode: "offline" | "judge" | "generate+judge";
  datasetVersion: string;
  caseCount: number;
  passCount: number;
  failCount: number;
  meanScores: AxisScores;
  meanTotal: number;
  cases: EvalCaseResult[];
};

export type BaselineFile = {
  name: string;
  createdAt: string;
  datasetVersion: string;
  meanScores: AxisScores;
  meanTotal: number;
  passRate: number;
  /** 축별 허용 하락폭 (점수) */
  maxDropPerAxis: Partial<AxisScores>;
  maxDropTotal: number;
};
