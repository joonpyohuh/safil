import Link from "next/link";
import { ActionCard } from "@/components/dashboard/action-card";
import { RecentHistoryEmpty } from "@/components/dashboard/recent-history-empty";
import { listGenerations } from "@/lib/history";
import { getCafeProfile } from "@/lib/profile";
import { isProfileReady, previewCopyInput, previewCopyResult } from "@/lib/profile-utils";

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
  const [profile, recent] = await Promise.all([
    getCafeProfile(),
    listGenerations({ type: "copy", limit: 3 }),
  ]);
  const profileReady = isProfileReady(profile);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">오늘 무엇을 만들어볼까요?</h1>
        <p className="mt-1 text-sm text-ink-soft">
          한 줄만 입력하면 바로 게시할 수 있는 홍보 문구를 만들어드려요
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
          description="곧 준비할게요"
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
          description="곧 준비할게요"
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
        {recent.length === 0 ? (
          <RecentHistoryEmpty />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li key={item.id} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-brand">홍보 문구</span>
                  <time className="text-xs text-ink-soft">
                    {new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(
                      item.createdAt,
                    )}
                  </time>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6">
                  {previewCopyResult(item) || previewCopyInput(item.input) || "홍보 문구"}
                </p>
                {item.copied && (
                  <span className="mt-2 inline-block text-xs font-semibold text-brand">복사함</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
