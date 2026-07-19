import type { CafeProfile } from "@/lib/schemas";

/** 홍보 문구 생성에 필요한 최소 프로필 (이름·위치) */
export function isProfileReady(profile: CafeProfile | null): profile is CafeProfile {
  return Boolean(profile?.name?.trim() && profile?.location?.trim());
}

export function previewCopyInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;
  return String(obj.message ?? "").slice(0, 80);
}

export function previewCopyResult(record: {
  options: unknown[];
  selectedIndex: number | null;
}): string {
  const idx = record.selectedIndex ?? 0;
  const option = record.options[idx] as Record<string, unknown> | undefined;
  return String(option?.text ?? "").slice(0, 80);
}
