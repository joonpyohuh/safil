"use client";

import { useState } from "react";
import Link from "next/link";
import { copyToClipboard } from "@/lib/client/clipboard";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import { MarkPostedButton } from "@/components/history/mark-posted-button";

type CopyHistoryActionsProps = {
  id: string;
  text: string;
  hashtags: string[];
  reuseHref: string;
  posted?: boolean;
};

export function CopyHistoryActions({
  id,
  text,
  hashtags,
  reuseHref,
  posted = false,
}: CopyHistoryActionsProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function copyAgain() {
    const value = `${text}${
      hashtags.length ? `\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}` : ""
    }`;
    setError("");
    setStatus("");
    try {
      await copyToClipboard(value);
      setCopied(true);
      setStatus("문구를 복사했어요. 올린 뒤에는 ‘실제로 올렸어요’를 눌러 주세요.");
      const response = await fetchWithTimeout(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copied: true }),
      });
      const json = await response.json().catch(() => null);
      if (!json?.ok) {
        setStatus("문구는 복사했지만 기록 갱신은 잠시 안 돼요.");
      }
    } catch {
      setError("복사하지 못했어요. 문구를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-xs font-semibold text-brand">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-xs font-semibold text-ink-soft">
          {status}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={copyAgain}>
          {copied ? "복사됨" : "다시 복사"}
        </button>
        <Link href={reuseHref} className="btn-primary !w-auto">
          비슷하게 만들기
        </Link>
      </div>
      <MarkPostedButton id={id} initialPosted={posted} />
    </div>
  );
}
