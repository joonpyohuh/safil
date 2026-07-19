import Link from "next/link";
import { CopyHistoryActions } from "@/components/history/copy-history-actions";
import { listGenerations } from "@/lib/history";
import type { Channel, Purpose } from "@/lib/schemas";

type CopyOption = {
  text?: string;
  reason?: string;
  hashtags?: string[];
};

type CopyInput = {
  purpose?: Purpose;
  channel?: Channel;
  message?: string;
};

export default async function HistoryPage() {
  const records = await listGenerations({ type: "copy", limit: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">히스토리</h1>
        <p className="mt-1 text-sm text-ink-soft">
          만들고 선택한 홍보 문구를 다시 사용할 수 있어요
        </p>
      </div>

      {records.length === 0 ? (
        <section className="card flex flex-col items-center gap-3 py-10 text-center">
          <p className="font-bold">아직 만든 문구가 없어요</p>
          <p className="text-sm leading-6 text-ink-soft">
            첫 홍보 문구를 만들면 여기에 자동으로 저장돼요.
          </p>
          <Link href="/create/copy" className="btn-primary mt-1 max-w-xs">
            첫 문구 만들기
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((record) => {
            const input = record.input as CopyInput;
            const optionIndex = record.selectedIndex ?? 0;
            const option = (record.options[optionIndex] ?? {}) as CopyOption;
            const text = option.text ?? input.message ?? "홍보 문구";
            const hashtags = Array.isArray(option.hashtags) ? option.hashtags : [];
            const query = new URLSearchParams();
            if (input.purpose) query.set("purpose", input.purpose);
            if (input.channel) query.set("channel", input.channel);
            if (input.message) query.set("message", input.message);

            return (
              <li key={record.id} className="card flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand">
                      {record.selectedIndex !== null ? "내가 고른 문구" : "첫 번째 제안"}
                    </span>
                    {record.isSample && (
                      <span className="rounded-full bg-cream px-2 py-1 text-[0.6875rem] text-ink-soft">
                        체험용
                      </span>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-ink-soft">
                    {new Intl.DateTimeFormat("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(record.createdAt)}
                  </time>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>
                {hashtags.length > 0 && (
                  <p className="text-xs leading-5 text-brand">
                    {hashtags.map((tag) => `#${tag}`).join(" ")}
                  </p>
                )}
                <details className="rounded-xl bg-cream px-3 py-2">
                  <summary className="cursor-pointer text-xs font-bold text-ink-soft">
                    당시 만든 문구 3개 비교
                  </summary>
                  <ol className="mt-3 flex flex-col gap-3">
                    {(record.options as CopyOption[]).map((candidate, index) => (
                      <li key={index} className="border-t border-line pt-3 first:border-0 first:pt-0">
                        <p className="text-xs font-bold text-brand">
                          {["담백한 안내", "분위기 강조", "친근한 대화"][index] ??
                            `문구 ${index + 1}`}
                          {record.selectedIndex === index ? " · 선택한 문구" : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink-soft">
                          {candidate.text ?? "내용 없음"}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
                <CopyHistoryActions
                  id={record.id}
                  text={text}
                  hashtags={hashtags}
                  reuseHref={`/create/copy?${query.toString()}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
