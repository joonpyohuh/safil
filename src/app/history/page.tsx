import Link from "next/link";
import { CopyHistoryActions } from "@/components/history/copy-history-actions";
import { ImageResultCard } from "@/components/create/image-result-card";
import { listGenerations } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import type { Channel, ImagePalette, ImageTemplate, Purpose } from "@/lib/schemas";

type CopyOption = {
  text?: string;
  reason?: string;
  hashtags?: string[];
};

type ImageOption = {
  imageUrl?: string;
  headline?: string;
  subline?: string;
  bodyText?: string;
  dateText?: string;
  templateId?: ImageTemplate;
  palette?: ImagePalette;
  reason?: string;
  cafeName?: string;
  cafeLocation?: string;
  brandCue?: string;
};

type CopyInput = {
  purpose?: Purpose;
  channel?: Channel;
  message?: string;
};

type ImageInput = {
  purpose?: Purpose;
  title?: string;
  dateText?: string;
  message?: string;
  photoPaths?: string[];
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [records, profile] = await Promise.all([
    listGenerations({ limit: 50 }),
    getCafeProfile().catch(() => null),
  ]);
  const visible = records.filter((record) => record.type === "copy" || record.type === "image");
  const profileName = profile?.name?.trim() || "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">히스토리</h1>
        <p className="mt-1 text-sm text-ink-soft">
          만들고 저장한 홍보 문구·이미지를 다시 볼 수 있어요
        </p>
      </div>

      {visible.length === 0 ? (
        <section className="card flex flex-col items-center gap-3 py-10 text-center">
          <p className="font-bold">아직 만든 결과물이 없어요</p>
          <p className="text-sm leading-6 text-ink-soft">
            첫 문구나 이미지를 만들면 여기에 자동으로 저장돼요.
          </p>
          <div className="mt-1 grid w-full max-w-xs grid-cols-2 gap-2">
            <Link href="/create/copy" className="btn-secondary">
              문구
            </Link>
            <Link href="/create/image" className="btn-primary !w-auto">
              이미지
            </Link>
          </div>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((record) => {
            if (record.type === "image") {
              const input = record.input as ImageInput;
              const optionIndex = record.selectedIndex ?? 0;
              const option = (record.options[optionIndex] ?? {}) as ImageOption;
              const headline = option.headline ?? input.title ?? "홍보 이미지";
              const reuse = new URLSearchParams();
              if (input.purpose) reuse.set("purpose", input.purpose);
              if (input.title) reuse.set("title", input.title);
              if (input.dateText) reuse.set("dateText", input.dateText);
              if (input.message) reuse.set("message", input.message);
              if (Array.isArray(input.photoPaths) && input.photoPaths.length) {
                reuse.set("photos", input.photoPaths.join(","));
              }

              return (
                <li key={record.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand">홍보 이미지</span>
                      {record.posted ? (
                        <span className="rounded-full bg-brand-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand">
                          올림
                        </span>
                      ) : record.downloaded ? (
                        <span className="rounded-full bg-cream px-2 py-1 text-[0.6875rem] font-semibold text-ink-soft">
                          저장만
                        </span>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-xs text-ink-soft">
                      {new Intl.DateTimeFormat("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(record.createdAt)}
                    </time>
                  </div>
                  {option.imageUrl ? (
                    <ImageResultCard
                      label={headline}
                      imageUrl={option.imageUrl}
                      initialHeadline={headline}
                      initialBodyText={
                        option.bodyText ||
                        option.subline ||
                        option.brandCue ||
                        profile?.concept?.slice(0, 18) ||
                        ""
                      }
                      initialBrandCue={option.brandCue || profile?.concept?.slice(0, 18) || ""}
                      initialDateText={option.dateText ?? input.dateText ?? ""}
                      initialTemplate={option.templateId ?? "fade_bottom"}
                      initialPalette={option.palette ?? "auto"}
                      cafeName={option.cafeName || profileName}
                      cafeLocation={option.cafeLocation || profile?.location || ""}
                      isSample={record.isSample}
                      shareTitle={`${option.cafeName || profileName || "카페"} 홍보 이미지`}
                      persistId={record.id}
                    />
                  ) : (
                    <Link href="/create/image" className="btn-primary">
                      비슷하게 만들기
                    </Link>
                  )}
                  <Link
                    href={`/create/image?${reuse.toString()}`}
                    className="btn-secondary"
                  >
                    비슷하게 다시 만들기
                  </Link>
                </li>
              );
            }

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
                      {record.selectedIndex !== null ? "내가 고른 문구" : "홍보 문구"}
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
                  posted={record.posted}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
