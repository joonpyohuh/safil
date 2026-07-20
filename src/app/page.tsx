import Link from "next/link";
import { ActionCard } from "@/components/dashboard/action-card";
import { RecentHistoryEmpty } from "@/components/dashboard/recent-history-empty";
import { listGenerations } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import {
  isProfileReady,
  previewCopyInput,
  previewCopyResult,
  previewImageInput,
  previewImageResult,
  previewImageUrl,
} from "@/lib/profile-utils";

export const dynamic = "force-dynamic";

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default async function Home() {
  const [profileResult, recentResult] = await Promise.allSettled([
    getCafeProfile(),
    listGenerations({ limit: 5 }),
  ]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const recent = recentResult.status === "fulfilled" ? recentResult.value : [];
  const recentUnavailable = recentResult.status === "rejected";
  if (profileResult.status === "rejected") {
    console.error("[safil home profile]", profileResult.reason);
  }
  if (recentResult.status === "rejected") {
    console.error("[safil home history]", recentResult.reason);
  }
  const profileReady = isProfileReady(profile);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">오늘 무엇을 만들어볼까요?</h1>
        <p className="mt-1 text-sm text-ink-soft">
          문구와 이미지를 만들어 바로 인스타그램에 올려보세요
        </p>
      </div>

      {!profileReady && (
        <Link
          href="/settings"
          className="card block border-brand/30 bg-brand-soft/40 active:scale-[0.99]"
        >
          <p className="text-sm font-bold text-brand">먼저 카페 정보를 등록해 주세요</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            카페 이름과 위치를 알려주시면 더 잘 맞는 홍보 문구를 만들 수 있어요.
          </p>
          <span className="mt-3 inline-block text-sm font-bold text-brand">등록하러 가기 →</span>
        </Link>
      )}

      <div className="flex flex-col gap-3">
        <ActionCard
          href="/create/copy"
          title="홍보 문구 만들기"
          description="인스타그램, 네이버 플레이스에 바로 올릴 문구"
          icon={
            <svg {...ICON_PROPS}>
              <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
              <path d="M13 6l3 3" />
            </svg>
          }
        />
        <ActionCard
          href="/create/image"
          title="홍보 이미지 만들기"
          description="제목만 적으면 SNS용 이미지를 바로 만들기"
          icon={
            <svg {...ICON_PROPS}>
              <rect x="3.5" y="5" width="17" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="m5 17 4.5-4.5a1.5 1.5 0 0 1 2 0L15 16l1.5-1.5a1.5 1.5 0 0 1 2 0L20 16" />
            </svg>
          }
        />
        <ActionCard
          href="/create/notice"
          title="매장 안내물 만들기"
          description="와이파이·영업시간 안내문"
          disabled
          icon={
            <svg {...ICON_PROPS}>
              <rect x="4" y="3.5" width="16" height="17" rx="2" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          }
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-soft">최근 만든 것</h2>
        {recentUnavailable ? (
          <div className="card">
            <p className="text-sm font-semibold">최근 기록을 잠시 불러오지 못했어요</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              새 문구 만들기는 그대로 사용할 수 있어요. 잠시 후 다시 확인해 주세요.
            </p>
          </div>
        ) : recent.length === 0 ? (
          <RecentHistoryEmpty />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent
              .filter((item) => item.type === "copy" || item.type === "image")
              .slice(0, 4)
              .map((item) => {
                const isImage = item.type === "image";
                const preview = isImage
                  ? previewImageResult(item) || previewImageInput(item.input) || "홍보 이미지"
                  : previewCopyResult(item) || previewCopyInput(item.input) || "홍보 문구";
                const thumb = isImage ? previewImageUrl(item) : "";
                return (
                  <li key={item.id}>
                    <Link href="/history" className="card block active:scale-[0.99]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-brand">
                          {isImage ? "홍보 이미지" : "홍보 문구"}
                        </span>
                        <time className="text-xs text-ink-soft">
                          {new Intl.DateTimeFormat("ko-KR", {
                            month: "short",
                            day: "numeric",
                          }).format(item.createdAt)}
                        </time>
                      </div>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="mt-2 aspect-[16/9] w-full rounded-xl object-cover"
                        />
                      ) : null}
                      <p className="mt-2 line-clamp-2 text-sm leading-6">{preview}</p>
                      {(item.copied || item.downloaded) && (
                        <span className="mt-2 inline-block text-xs font-semibold text-brand">
                          {item.downloaded ? "저장함" : "복사함"}
                        </span>
                      )}
                      <span className="float-right mt-2 text-xs font-bold text-brand">
                        다시 보기 →
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
