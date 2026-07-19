"use client";

import { useState } from "react";
import Link from "next/link";
import type { CopyGenerationInput, GenerationRecord, Purpose, Channel } from "@/lib/schemas";
import { purposeLabels, channelLabels } from "@/lib/schemas";

const purposes: Purpose[] = ["new_menu", "event", "daily", "notice"];
const channels: Channel[] = ["instagram", "naver_place"];

type CopyOption = { text: string; reason: string; hashtags: string[] };

export function CopyGenerator() {
  const [purpose, setPurpose] = useState<Purpose>("new_menu");
  const [channel, setChannel] = useState<Channel>("instagram");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<GenerationRecord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRecord(null);
    setSelected(null);
    setCopied(null);
    try {
      const body: CopyGenerationInput = { purpose, message, channel, photoPath: null };
      const res = await fetch("/api/generate/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setRecord(json.data);
      document.getElementById("copy-results")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "만들지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function selectOption(index: number) {
    setSelected(index);
    if (!record) return;
    await fetch(`/api/history/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIndex: index }),
    });
  }

  async function copyOption(option: CopyOption, index: number) {
    const text = `${option.text}${
      option.hashtags.length ? `\n\n${option.hashtags.map((t) => `#${t}`).join(" ")}` : ""
    }`;
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setSelected(index);
    if (!record) return;
    await fetch(`/api/history/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copied: true, selectedIndex: index }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">글쓰기</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 문구 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          한 줄만 적으면 채널에 맞는 문구 3가지를 만들어드려요.
        </p>
      </header>

      <form id="copy-form" onSubmit={submit} className="card flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">어떤 소식인가요?</legend>
          <div className="grid grid-cols-2 gap-2">
            {purposes.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${purpose === p ? "chip-active" : ""}`}
                onClick={() => setPurpose(p)}
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
          />
          <span className="text-right text-xs text-ink-soft">{message.length}/200</span>
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
              >
                {channelLabels[c]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" className="btn-primary hidden md:inline-flex" disabled={loading}>
          {loading ? "만드는 중…" : "문구 3개 만들기"}
        </button>
      </form>

      <div className="sticky-action md:hidden">
        <button type="submit" form="copy-form" className="btn-primary" disabled={loading}>
          {loading ? "만드는 중…" : "문구 3개 만들기"}
        </button>
      </div>

      {record && (
        <section id="copy-results" className="flex scroll-mt-4 flex-col gap-4 pb-4">
          <div>
            <p className="text-sm font-bold text-brand">완성</p>
            <h2 className="text-xl font-bold">마음에 드는 문구를 골라주세요</h2>
            {record.isSample && (
              <p className="mt-1 text-xs text-ink-soft">샘플 모드 · AI 키 연결 시 더 정교해져요</p>
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
                <span className="text-xs font-bold text-brand">안 {index + 1}</span>
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
              <p className="text-xs leading-5 text-ink-soft">{option.reason}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => copyOption(option, index)}
                >
                  {copied === index ? "복사됨" : "복사하기"}
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1 !w-auto"
                  onClick={() => selectOption(index)}
                >
                  {selected === index ? "선택 완료" : "이걸로 선택"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
