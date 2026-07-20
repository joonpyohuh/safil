import type { GenerationRecord } from "@/lib/schemas";

export type PreferencePair = {
  generationId: string;
  type: GenerationRecord["type"];
  selectedIndex: number;
  discardedIndices: number[];
  selectedSnippet: string;
  discardedSnippets: string[];
  posted: boolean;
  copied: boolean;
  downloaded: boolean;
};

function optionSnippet(option: unknown): string {
  if (!option || typeof option !== "object") return "";
  const o = option as {
    text?: string;
    headline?: string;
    reason?: string;
  };
  return [o.headline, o.text, o.reason].filter(Boolean).join(" ").slice(0, 120);
}

/** 선택·폐기·게시 신호를 학습 페어로 변환 */
export function toPreferencePairs(
  records: GenerationRecord[],
): PreferencePair[] {
  const pairs: PreferencePair[] = [];
  for (const record of records) {
    if (record.selectedIndex == null) continue;
    const discarded =
      record.discardedIndices?.length
        ? record.discardedIndices
        : record.options
            .map((_, i) => i)
            .filter((i) => i !== record.selectedIndex);

    const selectedSnippet = optionSnippet(record.options[record.selectedIndex]);
    if (!selectedSnippet) continue;

    pairs.push({
      generationId: record.id,
      type: record.type,
      selectedIndex: record.selectedIndex,
      discardedIndices: discarded,
      selectedSnippet,
      discardedSnippets: discarded
        .map((i) => optionSnippet(record.options[i]))
        .filter(Boolean),
      posted: Boolean(record.posted),
      copied: record.copied,
      downloaded: record.downloaded,
    });
  }
  return pairs;
}

/** 생성 프롬프트에 넣을 선호 학습 문단 */
export function formatPreferenceContext(pairs: PreferencePair[]): string {
  if (pairs.length === 0) return "";

  const posted = pairs.filter((p) => p.posted).slice(0, 3);
  const selected = pairs.filter((p) => !p.posted).slice(0, 4);

  const lines: string[] = [
    "사장님 선택·게시 학습 (복사/다운로드가 아니라 실제 선택·게시 우선):",
  ];

  for (const p of posted) {
    lines.push(`- 실제로 올린 톤: ${p.selectedSnippet}`);
  }
  for (const p of selected.slice(0, 3)) {
    lines.push(`- 고른 결과: ${p.selectedSnippet}`);
    if (p.discardedSnippets[0]) {
      lines.push(`  (버린 예: ${p.discardedSnippets[0]})`);
    }
  }

  lines.push(
    "고른 결과의 톤·길·구체성을 따르고, 버린 결과처럼 흔한 문장·과장 톤은 피하세요.",
  );
  return lines.join("\n");
}
