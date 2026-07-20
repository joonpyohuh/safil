"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

type ImageHistoryActionsProps = {
  id: string;
  imageUrl: string;
  headline: string;
  reuseHref: string;
};

export function ImageHistoryActions({
  id,
  imageUrl,
  headline,
  reuseHref,
}: ImageHistoryActionsProps) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveOrShare() {
    setError("");
    setStatus("");
    setPending(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("FAIL");
      const blob = await response.blob();
      const file = new File([blob], `${headline || "safil-image"}.png`, {
        type: blob.type || "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: headline,
          text: "카페 홍보 이미지",
        });
        setStatus("공유할 앱을 선택했어요.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("이미지를 저장했어요. 안 되면 이미지를 길게 눌러 주세요.");
      }

      await fetchWithTimeout(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloaded: true }),
      }).catch(() => null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("저장하지 못했어요. 이미지를 길게 눌러 저장해 주세요.");
    } finally {
      setPending(false);
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
        <button type="button" className="btn-secondary" onClick={saveOrShare} disabled={pending}>
          {pending ? "준비 중…" : "다시 저장"}
        </button>
        <Link href={reuseHref} className="btn-primary !w-auto">
          비슷하게 만들기
        </Link>
      </div>
    </div>
  );
}
