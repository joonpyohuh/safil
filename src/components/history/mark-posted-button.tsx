"use client";

import { useState } from "react";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

type Props = {
  id: string;
  initialPosted?: boolean;
  className?: string;
};

/** 복사/다운로드와 별개로 '실제로 올렸다'는 신호 */
export function MarkPostedButton({
  id,
  initialPosted = false,
  className = "btn-secondary",
}: Props) {
  const [posted, setPosted] = useState(initialPosted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function markPosted() {
    if (posted || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetchWithTimeout(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posted: true }),
      });
      const json = await res.json().catch(() => null);
      if (!json?.ok) throw new Error(json?.error || "저장하지 못했어요.");
      setPosted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={posted || pending}
        onClick={markPosted}
      >
        {posted ? "올렸어요 ✓" : pending ? "저장 중…" : "실제로 올렸어요"}
      </button>
      {error && (
        <p role="alert" className="text-xs font-semibold text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
