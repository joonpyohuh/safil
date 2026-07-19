"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CafeProfile, CafeProfileInput, Tone } from "@/lib/schemas";

const tones: Array<[Tone, string]> = [
  ["warm", "따뜻하고 다정하게"],
  ["calm", "차분하고 정갈하게"],
  ["professional", "전문적이고 믿음직하게"],
  ["witty", "위트 있고 경쾌하게"],
];

const empty: CafeProfileInput = {
  name: "",
  location: "",
  concept: "",
  introduction: "",
  menus: [],
  tone: "warm",
  customerType: "",
  logoPath: null,
  photoPaths: [],
};

export function ProfileForm({ initial }: { initial: CafeProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState<CafeProfileInput>(initial ?? empty);
  const [menu, setMenu] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof CafeProfileInput>(key: K, value: CafeProfileInput[K]) => {
    setSaved(false);
    setForm((c) => ({ ...c, [key]: value }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("응답을 읽지 못했어요. 다시 시도해 주세요.");
      if (!json.ok) throw new Error(json.error);
      setForm(json.data);
      setSaved(true);
      if (!initial) {
        router.push("/create/copy?profile=saved");
        return;
      }
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("저장이 오래 걸리고 있어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "저장하지 못했어요.");
      }
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-4" aria-busy={saving}>
      <section className="card flex flex-col gap-4">
        <div>
          <h2 className="font-bold">기본 정보</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            별표 항목만 입력해도 바로 시작할 수 있어요.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">카페 이름 *</span>
          <input
            className="field"
            required
            maxLength={60}
            placeholder="예: 기투커피"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="organization"
            enterKeyHint="next"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">위치 *</span>
          <input
            className="field"
            required
            maxLength={120}
            placeholder="예: 서울 송파구 방이동"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            autoComplete="street-address"
            enterKeyHint="done"
          />
        </label>
        <details
          className="rounded-2xl bg-cream p-3"
          open={Boolean(form.concept || form.introduction || form.customerType)}
        >
          <summary className="cursor-pointer text-sm font-bold text-brand">
            더 잘 맞는 문구를 위한 정보 (선택)
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">우리 카페만의 강점</span>
              <input
                className="field"
                maxLength={200}
                placeholder="예: 산미가 깨끗한 원두를 직접 로스팅해요"
                value={form.concept}
                onChange={(e) => update("concept", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">문구에 꼭 담고 싶은 이야기</span>
              <textarea
                className="field min-h-24 resize-y"
                maxLength={500}
                placeholder="예: 원두 산지, 맛의 특징, 직접 만드는 방식"
                value={form.introduction}
                onChange={(e) => update("introduction", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">주로 오는 손님</span>
              <input
                className="field"
                maxLength={120}
                placeholder="예: 동네 주민, 근처 직장인"
                value={form.customerType}
                onChange={(e) => update("customerType", e.target.value)}
              />
            </label>
          </div>
        </details>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-bold">대표 메뉴</h2>
        <p className="-mt-1 text-xs leading-5 text-ink-soft">
          선택 사항이에요. 자주 홍보하는 메뉴만 적어주세요.
        </p>
        <div className="flex gap-2">
          <input
            className="field min-w-0 flex-1"
            value={menu}
            maxLength={60}
            placeholder="메뉴 이름"
            onChange={(e) => setMenu(e.target.value)}
            aria-label="대표 메뉴 이름"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = menu.trim();
                if (v && !form.menus.includes(v)) {
                  update("menus", [...form.menus, v]);
                  setMenu("");
                }
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary shrink-0 px-4"
            onClick={() => {
              const v = menu.trim();
              if (v && !form.menus.includes(v)) {
                update("menus", [...form.menus, v]);
                setMenu("");
              }
            }}
          >
            추가
          </button>
        </div>
        {form.menus.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {form.menus.map((m) => (
              <li
                key={m}
                className="flex min-h-11 items-center rounded-full bg-brand-soft py-1 pl-3 pr-1 text-sm font-medium"
              >
                {m}
                <button
                  type="button"
                  className="ml-1 flex size-11 items-center justify-center rounded-full text-lg text-brand"
                  onClick={() => update("menus", form.menus.filter((x) => x !== m))}
                  aria-label={`${m} 삭제`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-bold">말투</h2>
        <p className="-mt-1 text-xs leading-5 text-ink-soft">
          문구에 사용할 분위기를 하나 골라주세요.
        </p>
        {tones.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip text-left ${form.tone === value ? "chip-active" : ""}`}
            onClick={() => update("tone", value)}
            aria-pressed={form.tone === value}
          >
            {label}
          </button>
        ))}
      </section>

      <div className="hidden md:block">
        {error && <p role="alert" className="alert-error mb-2">{error}</p>}
        {saved && <p role="status" className="alert-success mb-2">저장했어요</p>}
        <button type="submit" className="btn-primary max-w-sm" disabled={saving}>
          {saving ? "저장 중…" : initial ? "변경 내용 저장" : "저장하고 문구 만들기"}
        </button>
      </div>

      <div className="sticky-action md:hidden">
        {error && <p role="alert" className="alert-error mb-2 text-sm">{error}</p>}
        {saved && <p role="status" className="alert-success mb-2 text-sm">저장했어요</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "저장 중…" : initial ? "변경 내용 저장" : "저장하고 문구 만들기"}
        </button>
      </div>
    </form>
  );
}
