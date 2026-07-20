/**
 * SAFIL regression eval
 *
 *   node scripts/run-eval.mjs                 # offline: 데이터셋 검증 + 레퍼런스 self-check
 *   node scripts/run-eval.mjs --judge         # AI/휴리스틱으로 레퍼런스 재채점 (비용↓)
 *   node scripts/run-eval.mjs --save-baseline # 현재 결과를 베이스라인으로 저장
 *   node scripts/run-eval.mjs --compare       # 최신 베이스라인과 회귀 비교
 *   node scripts/run-eval.mjs --limit=10
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const goldenPath = join(root, "evals/golden/cafe-posts.json");
const baselineDir = join(root, "evals/baselines");
const runsDir = join(root, "evals/runs");

for (const line of (existsSync(join(root, ".env.local"))
  ? readFileSync(join(root, ".env.local"), "utf8")
  : ""
).split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  process.env[m[1].trim()] ??= m[2].trim().replace(/^['"]|['"]$/g, "");
}

const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const doJudge = args.has("--judge");
const saveBaseline = args.has("--save-baseline");
const compare = args.has("--compare");

const AXES = [
  "brandFit",
  "typography",
  "photoAuthenticity",
  "postability",
  "specificity",
  "toneMatch",
  "noHype",
];

function averageTotal(scores) {
  const sum = AXES.reduce((a, k) => a + scores[k], 0);
  return Math.round((sum / AXES.length) * 10) / 10;
}

function meanAxisScores(list) {
  const out = Object.fromEntries(AXES.map((k) => [k, 0]));
  if (!list.length) return out;
  for (const s of list) for (const k of AXES) out[k] += s[k];
  for (const k of AXES) out[k] = Math.round((out[k] / list.length) * 10) / 10;
  return out;
}

function checkMinAccept(scores, minAccept) {
  const failedAxes = [];
  for (const k of AXES) {
    if (typeof minAccept?.[k] === "number" && scores[k] < minAccept[k]) {
      failedAxes.push(k);
    }
  }
  return { passed: failedAxes.length === 0, failedAxes };
}

function validateDataset(raw) {
  if (!raw.version || !Array.isArray(raw.posts)) {
    throw new Error("Invalid dataset: missing version/posts");
  }
  if (raw.posts.length < 50 || raw.posts.length > 120) {
    throw new Error(`Dataset size ${raw.posts.length} not in 50–120`);
  }
  const ids = new Set();
  for (const p of raw.posts) {
    if (ids.has(p.id)) throw new Error(`Duplicate id ${p.id}`);
    ids.add(p.id);
    for (const k of AXES) {
      if (typeof p.referenceScores?.[k] !== "number") {
        throw new Error(`${p.id} missing referenceScores.${k}`);
      }
    }
  }
}

function heuristicJudge(post) {
  const corpus = post.reference.caption;
  const nameHit = corpus.includes(post.cafe.name) ? 1 : 0;
  const menuHit = post.cafe.menus.some((m) => corpus.includes(m)) ? 1 : 0;
  const hype = /최고|1등|보장|무조건|대박|완판 확실/.test(corpus) ? 1 : 0;
  const scores = {
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
  };
}

function detectRegression(current, baseline) {
  const regressions = [];
  const totalDrop = baseline.meanTotal - current.meanTotal;
  if (totalDrop > (baseline.maxDropTotal ?? 0.5)) {
    regressions.push(
      `전체 ${baseline.meanTotal} → ${current.meanTotal} (허용 ${baseline.maxDropTotal})`,
    );
  }
  for (const k of AXES) {
    const maxDrop = baseline.maxDropPerAxis?.[k] ?? 0.8;
    const drop = baseline.meanScores[k] - current.meanScores[k];
    if (drop > maxDrop) {
      regressions.push(`${k} ${baseline.meanScores[k]} → ${current.meanScores[k]}`);
    }
  }
  return regressions;
}

const dataset = JSON.parse(readFileSync(goldenPath, "utf8"));
validateDataset(dataset);
const posts = dataset.posts.slice(0, Number.isFinite(limit) ? limit : undefined);

const cases = posts.map((post) => {
  if (doJudge) return heuristicJudge(post);
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
});

const meanScores = meanAxisScores(cases.map((c) => c.scores));
const meanTotal = averageTotal(meanScores);
const passCount = cases.filter((c) => c.passed).length;

const summary = {
  runId: randomUUID().slice(0, 8),
  createdAt: new Date().toISOString(),
  model: doJudge ? process.env.OPENAI_SEARCH_MODEL || "heuristic" : "reference",
  mode: doJudge ? "judge" : "offline",
  datasetVersion: dataset.version,
  caseCount: cases.length,
  passCount,
  failCount: cases.length - passCount,
  meanScores,
  meanTotal,
  passRate: Math.round((passCount / cases.length) * 1000) / 10,
  cases,
};

mkdirSync(runsDir, { recursive: true });
const runPath = join(runsDir, `${summary.createdAt.replace(/[:.]/g, "-")}-${summary.runId}.json`);
writeFileSync(runPath, JSON.stringify(summary, null, 2));

console.log("=== SAFIL Eval ===");
console.log(`dataset ${dataset.version} · ${summary.caseCount} cases · mode ${summary.mode}`);
console.log(`pass ${summary.passCount}/${summary.caseCount} (${summary.passRate}%)`);
console.log(`mean total ${summary.meanTotal}`);
console.log("mean axes", summary.meanScores);
console.log(`wrote ${runPath}`);

if (saveBaseline) {
  mkdirSync(baselineDir, { recursive: true });
  const baseline = {
    name: `baseline-${dataset.version}`,
    createdAt: summary.createdAt,
    datasetVersion: dataset.version,
    meanScores: summary.meanScores,
    meanTotal: summary.meanTotal,
    passRate: summary.passRate,
    maxDropPerAxis: Object.fromEntries(AXES.map((k) => [k, 0.8])),
    maxDropTotal: 0.5,
  };
  const bp = join(baselineDir, `${baseline.name}.json`);
  writeFileSync(bp, JSON.stringify(baseline, null, 2));
  console.log(`saved baseline → ${bp}`);
}

if (compare) {
  mkdirSync(baselineDir, { recursive: true });
  const files = readdirSync(baselineDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (!files.length) {
    console.error("No baseline. Run with --save-baseline first.");
    process.exit(2);
  }
  const baseline = JSON.parse(
    readFileSync(join(baselineDir, files[files.length - 1]), "utf8"),
  );
  const regressions = detectRegression(summary, baseline);
  if (regressions.length) {
    console.error("REGRESSION FAIL");
    for (const r of regressions) console.error(" -", r);
    process.exit(1);
  }
  console.log(`REGRESSION OK vs ${files[files.length - 1]}`);
}

if (summary.failCount > 0 && !doJudge) {
  const fails = cases.filter((c) => !c.passed).slice(0, 8);
  console.log("minAccept fails (sample):");
  for (const f of fails) {
    console.log(` - ${f.id}: ${f.failedAxes.join(", ")}`);
  }
  process.exitCode = summary.failCount > summary.caseCount * 0.15 ? 1 : 0;
}
