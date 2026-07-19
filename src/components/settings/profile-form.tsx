"use client";

import { useState } from "react";
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
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setForm(json.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-4">
      <section className="card flex flex-col gap-4">
        <h2 className="font-bold">기본 정보</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">카페 이름 *</span>
          <input
            className="field"
            required
            maxLength={60}
            placeholder="예: 기투커피"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
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
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">카페 콘셉트</span>
          <input
            className="field"
            maxLength={200}
            placeholder="예: 직접 로스팅하는 동네 카페"
            value={form.concept}
            onChange={(e) => update("concept", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">짧은 소개</span>
          <textarea
            className="field min-h-24 resize-y"
            maxLength={500}
            placeholder="우리 카페 이야기"
            value={form.introduction}
            onChange={(e) => update("introduction", e.target.value)}
          />
        </label>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-bold">대표 메뉴</h2>
        <div className="flex gap-2">
          <input
            className="field min-w-0 flex-1"
            value={menu}
            maxLength={60}
            placeholder="메뉴 이름"
            onChange={(e) => setMenu(e.target.value)}
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
              <li key={m} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium">
                {m}
                <button
                  type="button"
                  className="ml-2 text-brand"
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
        {tones.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip text-left ${form.tone === value ? "chip-active" : ""}`}
            onClick={() => update("tone", value)}
          >
            {label}
          </button>
        ))}
      </section>

      <div className="hidden md:block">
        {error && <p className="alert-error mb-2">{error}</p>}
        {saved && <p className="alert-success mb-2">저장했어요</p>}
        <button type="submit" className="btn-primary max-w-sm" disabled={saving}>
          {saving ? "저장 중…" : "카페 정보 저장"}
        </button>
      </div>

      <div className="sticky-action md:hidden">
        {error && <p className="alert-error mb-2 text-sm">{error}</p>}
        {saved && <p className="alert-success mb-2 text-sm">저장했어요</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "저장 중…" : "저장하기"}
        </button>
      </div>
    </form>
  );
}
