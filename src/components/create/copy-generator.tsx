"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type {
  CafeProfile,
  CopyGenerationInput,
  GenerationRecord,
  Purpose,
  Channel,
} from "@/lib/schemas";
import { purposeLabels, channelLabels } from "@/lib/schemas";
import { copyToClipboard } from "@/lib/client/clipboard";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const purposes: Purpose[] = ["new_menu", "event", "daily", "notice"];
const channels: Channel[] = ["instagram", "naver_place"];

type CopyOption = { text: string; reason: string; hashtags: string[] };
type CopyGenerationRecord = GenerationRecord & {
  persisted?: boolean;
  profileApplied?: boolean;
};

type CopyGeneratorProps = {
  profile: CafeProfile;
  suggestions: string[];
  initial?: {
    purpose?: Purpose;
    channel?: Channel;
    message?: string;
  };
  profileJustSaved?: boolean;
  profileUnavailable?: boolean;
};

export function CopyGenerator({
  profile,
  suggestions,
  initial,
  profileJustSaved,
  profileUnavailable,
}: CopyGeneratorProps) {
  const [purpose, setPurpose] = useState<Purpose>(initial?.purpose ?? "new_menu");
  const [channel, setChannel] = useState<Channel>(initial?.channel ?? "instagram");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    profileUnavailable
      ? "카페 정보를 잠시 불러오지 못했어요. 입력한 내용 중심으로 문구를 만들 수 있어요."
      : profileJustSaved
        ? "카페 정보를 저장했어요."
        : "",
  );
  const [record, setRecord] = useState<CopyGenerationRecord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [actionPending, setActionPending] = useState<number | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const body: CopyGenerationInput = { purpose, message, channel, photoPath: null };
      const res = await fetch("/api/generate/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("응답을 읽지 못했어요. 다시 시도해 주세요.");
      if (!json.ok) throw new Error(json.error);
      setRecord(json.data);
      setSelected(null);
      setCopied(null);
      const notices: string[] = [];
      if (!json.data.profileApplied) {
        notices.push("카페 정보를 잠시 불러오지 못해 입력한 내용 중심으로 만들었어요.");
      }
      if (!json.data.persisted) {
        notices.push("기록 저장은 잠시 안 되지만 지금 복사해 사용할 수 있어요.");
      }
      setStatus(notices.length ? notices.join(" ") : "문구 3개를 만들었어요.");
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        resultsRef.current?.focus({ preventScroll: true });
      }, 50);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("만드는 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "만들지 못했어요.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function selectOption(index: number) {
    if (!record) return;
    if (!record.persisted) {
      setSelected(index);
      setStatus("문구를 선택했어요. 이번 선택은 기록에 저장되지 않아요.");
      return;
    }
    setError("");
    setActionPending(index);
    try {
      const response = await fetchWithTimeout(`/api/history/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIndex: index }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error);
      setSelected(index);
      setStatus(`${index + 1}번 문구를 선택했어요.`);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "선택 저장이 오래 걸리고 있어요. 다시 눌러주세요."
          : err instanceof Error
            ? err.message
            : "선택을 저장하지 못했어요.",
      );
    } finally {
      setActionPending(null);
    }
  }

  async function copyOption(option: CopyOption, index: number) {
    const text = `${option.text}${
      option.hashtags.length ? `\n\n${option.hashtags.map((t) => `#${t}`).join(" ")}` : ""
    }`;
    setError("");
    setActionPending(index);
    try {
      await copyToClipboard(text);
    } catch {
      setError("복사하지 못했어요. 문구를 길게 눌러 직접 복사해 주세요.");
      setActionPending(null);
      return;
    }

    setCopied(index);
    setSelected(index);
    setStatus("문구를 복사했어요. 인스타그램이나 네이버에 붙여넣으세요.");

    if (!record || !record.persisted) {
      setStatus("문구를 복사했어요. 기록 저장은 잠시 안 되지만 바로 사용할 수 있어요.");
      setActionPending(null);
      return;
    }

    try {
      const response = await fetchWithTimeout(`/api/history/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copied: true, selectedIndex: index }),
      });
      const json = await response.json();
      if (!json.ok) {
        setStatus("문구는 복사했지만 사용 기록은 저장하지 못했어요.");
      }
    } catch {
      setStatus("문구는 복사했지만 사용 기록은 저장하지 못했어요.");
    } finally {
      setActionPending(null);
    }
  }

  async function shareOption(option: CopyOption, index: number) {
    const text = `${option.text}${
      option.hashtags.length ? `\n\n${option.hashtags.map((tag) => `#${tag}`).join(" ")}` : ""
    }`;
    if (!navigator.share) {
      await copyOption(option, index);
      return;
    }
    try {
      await navigator.share({ title: `${profile.name} 홍보 문구`, text });
      await selectOption(index);
      setStatus("공유할 앱을 선택했어요.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("공유하지 못했어요. 복사하기를 이용해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">글쓰기</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 문구 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          한 줄만 적으면 채널에 맞는 문구 3가지를 만들어드려요.
        </p>
      </header>

      <section className="rounded-2xl bg-brand-soft/60 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{profile.name}</p>
            <p className="truncate text-xs text-ink-soft">
              {profile.location} · {profile.concept || "카페 정보 반영 중"}
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex min-h-11 shrink-0 items-center font-bold text-brand"
          >
            수정
          </Link>
        </div>
      </section>

      {status && (
        <p role="status" aria-live="polite" className="alert-success">
          {status}
        </p>
      )}

      <form
        id="copy-form"
        onSubmit={submit}
        className="card flex flex-col gap-5"
        aria-busy={loading}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">어떤 소식인가요?</legend>
          <div className="grid grid-cols-2 gap-2">
            {purposes.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${purpose === p ? "chip-active" : ""}`}
                onClick={() => setPurpose(p)}
                aria-pressed={purpose === p}
              >
                {purposeLabels[p]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">홍보 내용 *</span>
          <textarea
            className="field min-h-28 resize-y"
            required
            maxLength={200}
            placeholder="예: 딸기라떼 신메뉴 나왔어요"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            enterKeyHint="done"
            aria-describedby="message-help"
          />
          <span id="message-help" className="text-right text-xs text-ink-soft">
            {message.length}/200
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-soft">
              무엇을 쓸지 막막하다면 눌러보세요
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="min-h-11 rounded-full border border-line bg-cream px-3 py-2 text-left text-xs font-semibold text-ink-soft"
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">어디에 올릴까요?</legend>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${channel === c ? "chip-active" : ""}`}
                onClick={() => setChannel(c)}
                aria-pressed={channel === c}
              >
                {channelLabels[c]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}

        {loading && (
          <p role="status" aria-live="polite" className="text-center text-sm text-ink-soft">
            카페 정보와 채널에 맞춰 문구를 만들고 있어요. 보통 30초 안에 끝나요.
          </p>
        )}

        <button type="submit" className="btn-primary hidden md:inline-flex" disabled={loading}>
          {loading ? "만드는 중…" : "문구 3개 만들기"}
        </button>
      </form>

      <div className="sticky-action md:hidden">
        <button type="submit" form="copy-form" className="btn-primary" disabled={loading}>
          {loading ? "만드는 중…" : record ? "다시 만들기" : "문구 3개 만들기"}
        </button>
      </div>

      {record && (
        <section
          id="copy-results"
          ref={resultsRef}
          tabIndex={-1}
          className="flex scroll-mt-4 flex-col gap-4 pb-4 outline-none"
        >
          <div>
            <p className="text-sm font-bold text-brand">완성</p>
            <h2 className="text-xl font-bold">마음에 드는 문구를 골라주세요</h2>
            {record.isSample && (
              <p className="mt-1 text-xs text-ink-soft">
                체험용 문구예요. 선택·복사·저장은 그대로 사용할 수 있어요.
              </p>
            )}
          </div>

          {(record.options as CopyOption[]).map((option, index) => (
            <article
              key={index}
              className={`card flex flex-col gap-3 ${
                selected === index ? "ring-2 ring-brand ring-offset-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand">
                  {["담백한 안내", "분위기 강조", "친근한 대화"][index] ?? `문구 ${index + 1}`}
                </span>
                {selected === index && (
                  <span className="text-xs font-bold text-brand">선택됨</span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-[0.9375rem] leading-7">{option.text}</p>
              {option.hashtags.length > 0 && (
                <p className="text-sm font-medium text-brand">
                  {option.hashtags.map((t) => `#${t}`).join(" ")}
                </p>
              )}
              <details className="rounded-xl bg-cream px-3 py-2">
                <summary className="cursor-pointer text-xs font-bold text-ink-soft">
                  이 문구를 제안한 이유
                </summary>
                <p className="mt-2 text-xs leading-5 text-ink-soft">{option.reason}</p>
              </details>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => copyOption(option, index)}
                  disabled={actionPending === index}
                >
                  {actionPending === index
                    ? "처리 중…"
                    : copied === index
                      ? "복사 완료"
                      : "복사해서 사용"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => shareOption(option, index)}
                  disabled={actionPending === index}
                >
                  공유하기
                </button>
              </div>
            </article>
          ))}

          <div className="card flex flex-col gap-2 text-center">
            <p className="font-bold">문구를 사용하셨나요?</p>
            <p className="text-sm leading-6 text-ink-soft">
              복사한 문구는 최근 만든 것과 히스토리에 저장돼요.
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Link href="/" className="btn-secondary">
                홈으로
              </Link>
              <Link href="/history" className="btn-primary !w-auto">
                기록 보기
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
