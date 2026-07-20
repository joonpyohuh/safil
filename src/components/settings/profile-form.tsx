"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CafeProfile, CafeProfileInput, Tone, VibeTag } from "@/lib/schemas";
import { vibeTagLabels, vibeTagValues } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const tones: Array<[Tone, string]> = [
  ["warm", "따뜻하고 다정하게"],
  ["calm", "차분하고 정갈하게"],
  ["professional", "전문적이고 믿음직하게"],
  ["witty", "위트 있고 경쾌하게"],
];

type Candidate = {
  placeName: string;
  placeAddress: string;
  placeUrl: string;
  whyMatch: string;
};

const empty: CafeProfileInput = {
  name: "",
  location: "",
  concept: "",
  introduction: "",
  atmosphere: "",
  vibeTags: [],
  menus: [],
  tone: "warm",
  customerType: "",
  logoPath: null,
  photoPaths: [],
  researchSummary: "",
  researchSources: [],
  placeConfirmed: false,
};

export function ProfileForm({ initial }: { initial: CafeProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState<CafeProfileInput>(() => ({
    ...empty,
    ...(initial ?? {}),
    atmosphere: initial?.atmosphere ?? "",
    vibeTags: initial?.vibeTags ?? [],
    researchSummary: initial?.researchSummary ?? "",
    researchSources: initial?.researchSources ?? [],
    placeConfirmed: initial?.placeConfirmed ?? false,
  }));
  const [menu, setMenu] = useState("");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [researchOpen, setResearchOpen] = useState(!initial?.placeConfirmed);

  const update = <K extends keyof CafeProfileInput>(key: K, value: CafeProfileInput[K]) => {
    setSaved(false);
    setForm((c) => ({ ...c, [key]: value }));
  };

  function toggleVibe(tag: VibeTag) {
    const next = form.vibeTags.includes(tag)
      ? form.vibeTags.filter((t) => t !== tag)
      : form.vibeTags.length >= 4
        ? form.vibeTags
        : [...form.vibeTags, tag];
    update("vibeTags", next);
  }

  async function runSearch() {
    if (!form.name.trim() || !form.location.trim()) {
      setError("카페 이름과 위치를 먼저 적어 주세요.");
      return;
    }
    setResearching(true);
    setError("");
    setStatus("카페를 찾는 중…");
    setCandidates([]);
    try {
      const res = await fetchWithTimeout(
        "/api/profile/research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "search",
            name: form.name.trim(),
            location: form.location.trim(),
          }),
        },
        35_000,
      );
      const json = await res.json().catch(() => null);
      if (!json?.ok) throw new Error(json?.error || "검색하지 못했어요.");
      setCandidates(json.data.candidates ?? []);
      setStatus(json.data.message || "이 중에서 우리 카페를 골라 주세요.");
      setResearchOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색하지 못했어요.");
      setStatus("");
    } finally {
      setResearching(false);
    }
  }

  async function confirmPlace(candidate: Candidate) {
    setResearching(true);
    setError("");
    setStatus("리뷰와 소개를 읽고 카페 분위기를 정리하는 중…");
    try {
      const res = await fetchWithTimeout(
        "/api/profile/research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            name: form.name.trim(),
            location: form.location.trim(),
            placeName: candidate.placeName,
            placeAddress: candidate.placeAddress,
            placeUrl: candidate.placeUrl,
          }),
        },
        55_000,
      );
      const json = await res.json().catch(() => null);
      if (!json?.ok) throw new Error(json?.error || "조사하지 못했어요.");
      const r = json.data.research;
      setForm((prev) => ({
        ...prev,
        name: candidate.placeName || prev.name,
        location: candidate.placeAddress || prev.location,
        concept: r.concept || prev.concept,
        atmosphere: r.atmosphere || prev.atmosphere,
        introduction: r.introduction || prev.introduction,
        menus: Array.isArray(r.menus) && r.menus.length ? r.menus.slice(0, 12) : prev.menus,
        customerType: r.customerType || prev.customerType,
        researchSummary: r.researchSummary || "",
        researchSources: Array.isArray(r.researchSources) ? r.researchSources.slice(0, 12) : [],
        placeConfirmed: true,
      }));
      setCandidates([]);
      setStatus("조사를 반영했어요. 아래 내용을 확인·수정한 뒤 저장해 주세요.");
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조사하지 못했어요.");
      setStatus("");
    } finally {
      setResearching(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithTimeout(
        "/api/profile",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        20_000,
      );
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("응답을 읽지 못했어요. 다시 시도해 주세요.");
      if (!json.ok) throw new Error(json.error);
      setForm({
        ...empty,
        ...json.data,
        atmosphere: json.data.atmosphere ?? "",
        vibeTags: json.data.vibeTags ?? [],
        researchSummary: json.data.researchSummary ?? "",
        researchSources: json.data.researchSources ?? [],
        placeConfirmed: json.data.placeConfirmed ?? false,
      });
      setSaved(true);
      if (!initial) {
        router.push("/create/image?profile=saved");
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
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-4" aria-busy={saving || researching}>
      <section className="card flex flex-col gap-4">
        <div>
          <h2 className="font-bold">1. 카페 찾기 (딥리서치)</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            이름과 위치를 적고 찾아보면, 네이버·구글에서 후보를 보여드려요. 맞다고 고르면 리뷰를
            읽어 분위기를 정리해요.
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
        <button
          type="button"
          className="btn-primary"
          disabled={researching || saving || !form.name.trim() || !form.location.trim()}
          onClick={runSearch}
        >
          {researching ? "조사 중…" : "카페 찾아 조사하기"}
        </button>
        {form.placeConfirmed && (
          <p className="rounded-xl bg-brand-soft/50 px-3 py-2 text-xs font-semibold text-brand">
            이 카페로 조사·확인됨
          </p>
        )}
      </section>

      {(researchOpen || candidates.length > 0) && candidates.length > 0 && (
        <section className="card flex flex-col gap-3" aria-live="polite">
          <h2 className="font-bold">이 카페가 맞나요?</h2>
          <p className="text-xs leading-5 text-ink-soft">
            맞는 곳을 누르면 리뷰를 읽고 컨셉·분위기를 채워 드려요.
          </p>
          <ul className="flex flex-col gap-2">
            {candidates.map((c, i) => (
              <li key={`${c.placeName}-${i}`}>
                <button
                  type="button"
                  className="card w-full border border-line text-left active:scale-[0.99]"
                  disabled={researching}
                  onClick={() => confirmPlace(c)}
                >
                  <p className="font-bold">{c.placeName}</p>
                  {c.placeAddress ? (
                    <p className="mt-1 text-xs text-ink-soft">{c.placeAddress}</p>
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-ink-soft">{c.whyMatch}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card flex flex-col gap-4">
        <div>
          <h2 className="font-bold">2. 컨셉·분위기 (사장님 입력)</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            조사 결과가 있어도 직접 고치면 더 잘 맞춰요. 문구·이미지가 이 분위기를 따릅니다.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">우리 카페 컨셉·강점</span>
          <input
            className="field"
            maxLength={200}
            placeholder="예: 산미 깔끔한 원두를 직접 로스팅하는 로스터리"
            value={form.concept}
            onChange={(e) => update("concept", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">원하는 분위기·공간감</span>
          <textarea
            className="field min-h-24 resize-y"
            maxLength={400}
            placeholder="예: 조용하고 따뜻한 조명, 나무 테이블, 과하지 않은 미니멀한 느낌"
            value={form.atmosphere}
            onChange={(e) => update("atmosphere", e.target.value)}
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">분위기 태그 (최대 4개)</legend>
          <div className="grid grid-cols-2 gap-2">
            {vibeTagValues.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip text-left !text-xs ${form.vibeTags.includes(tag) ? "chip-active" : ""}`}
                onClick={() => toggleVibe(tag)}
                aria-pressed={form.vibeTags.includes(tag)}
              >
                {vibeTagLabels[tag]}
              </button>
            ))}
          </div>
        </fieldset>
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
        {form.researchSummary ? (
          <details className="rounded-2xl bg-cream p-3">
            <summary className="cursor-pointer text-sm font-bold text-brand">
              웹·리뷰 조사 요약 보기
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-ink-soft">
              {form.researchSummary}
            </p>
          </details>
        ) : null}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-bold">대표 메뉴</h2>
        <p className="-mt-1 text-xs leading-5 text-ink-soft">
          자주 홍보하는 메뉴만 적어주세요.
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
          문구에 사용할 말투를 하나 골라주세요.
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

      {(error || status) && (
        <div className="md:hidden">
          {error && <p role="alert" className="alert-error mb-2 text-sm">{error}</p>}
          {status && !error && (
            <p role="status" className="alert-success mb-2 text-sm">
              {status}
            </p>
          )}
        </div>
      )}

      <div className="hidden md:block">
        {error && <p role="alert" className="alert-error mb-2">{error}</p>}
        {status && !error && <p role="status" className="alert-success mb-2">{status}</p>}
        {saved && <p role="status" className="alert-success mb-2">저장했어요</p>}
        <button type="submit" className="btn-primary max-w-sm" disabled={saving || researching}>
          {saving ? "저장 중…" : initial ? "변경 내용 저장" : "저장하고 이미지 만들기"}
        </button>
      </div>

      <div className="sticky-action md:hidden">
        {saved && <p role="status" className="alert-success mb-2 text-sm">저장했어요</p>}
        <button type="submit" className="btn-primary" disabled={saving || researching}>
          {saving ? "저장 중…" : initial ? "변경 내용 저장" : "저장하고 이미지 만들기"}
        </button>
      </div>
    </form>
  );
}
