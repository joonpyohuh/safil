import { listGenerations } from "@/lib/history";
import {
  formatPreferenceContext,
  toPreferencePairs,
} from "@/lib/eval/preference";
import {
  vibeTagLabels,
  type CafeProfile,
  type VibeTag,
} from "@/lib/schemas";

/**
 * 프로필 + 최근 히스토리에서 카페 분위기 컨텍스트를 만든다.
 * (모델 파인튜닝이 아니라 생성 시마다 주입하는 학습형 컨텍스트)
 */
export async function buildCafeLearningContext(
  profile: CafeProfile | null,
): Promise<string> {
  if (!profile) return "카페 프로필 미등록.";

  const vibe =
    profile.vibeTags.length > 0
      ? profile.vibeTags
          .map((tag) => vibeTagLabels[tag as VibeTag] ?? tag)
          .join(", ")
      : "미등록";

  const lines = [
    `카페: ${profile.name} / ${profile.location}`,
    `컨셉·강점: ${profile.concept || "미등록"}`,
    `사장님이 정한 분위기: ${profile.atmosphere || "미등록"}`,
    `분위기 태그: ${vibe}`,
    `소개: ${profile.introduction || "미등록"}`,
    `메뉴: ${profile.menus.length ? profile.menus.join(", ") : "미등록"}`,
    `손님: ${profile.customerType || "미등록"}`,
    profile.placeConfirmed && profile.researchSummary
      ? `웹·리뷰 조사 요약: ${profile.researchSummary.slice(0, 600)}`
      : "",
  ].filter(Boolean);

  try {
    const recent = await listGenerations({ limit: 24 });
    const copyBits: string[] = [];
    const imageBits: string[] = [];
    for (const record of recent) {
      if (record.type === "copy") {
        const opt = (record.options[record.selectedIndex ?? 0] ?? {}) as {
          text?: string;
        };
        if (opt.text) copyBits.push(opt.text.slice(0, 80));
      }
      if (record.type === "image") {
        const opt = (record.options[record.selectedIndex ?? 0] ?? {}) as {
          headline?: string;
          reason?: string;
        };
        const input = record.input as { title?: string; message?: string };
        imageBits.push(
          [opt.headline || input.title, input.message, opt.reason]
            .filter(Boolean)
            .join(" / ")
            .slice(0, 100),
        );
      }
    }
    if (copyBits.length) {
      lines.push(`최근 쓴 문구 톤 참고: ${copyBits.slice(0, 4).join(" || ")}`);
    }
    if (imageBits.length) {
      lines.push(`최근 이미지 주제 참고: ${imageBits.slice(0, 4).join(" || ")}`);
    }

    const preference = formatPreferenceContext(toPreferencePairs(recent));
    if (preference) lines.push(preference);

    const postedCount = recent.filter((r) => r.posted).length;
    const copiedOnly = recent.filter((r) => r.copied && !r.posted).length;
    if (postedCount || copiedOnly) {
      lines.push(
        `성과 신호: 실제 게시 ${postedCount}건 / 복사만 ${copiedOnly}건 — 게시된 톤을 우선 학습하세요.`,
      );
    }

    if (profile.photoPaths.length) {
      lines.push(
        `등록된 매장·메뉴 사진 ${profile.photoPaths.length}장이 있음. 사진의 실제 분위기와 맞게 표현할 것.`,
      );
    }
  } catch (error) {
    console.error("[safil cafe learning context]", error);
  }

  lines.push(
    "위 분위기·컨셉을 반드시 지키세요. 다른 스타일 카페처럼 보이게 쓰지 마세요.",
  );
  return lines.join("\n");
}
