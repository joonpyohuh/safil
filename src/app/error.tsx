"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="card flex flex-col gap-4 text-center">
      <div>
        <p className="text-sm font-bold text-brand">잠시 문제가 생겼어요</p>
        <h1 className="mt-1 text-xl font-bold">화면을 불러오지 못했어요</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          입력한 내용은 그대로 두고, 인터넷 연결을 확인한 뒤 다시 시도해 주세요.
        </p>
      </div>
      <button type="button" className="btn-primary" onClick={reset}>
        다시 시도
      </button>
      <Link href="/" className="btn-secondary">
        홈으로
      </Link>
    </section>
  );
}
