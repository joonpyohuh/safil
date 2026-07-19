import { ActionCard } from "@/components/dashboard/action-card";
import { RecentHistoryEmpty } from "@/components/dashboard/recent-history-empty";

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

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">오늘 무엇을 만들어볼까요?</h1>
        <p className="mt-1 text-sm text-ink-soft">
          사진과 한 문장만 있으면 바로 사용할 수 있는 결과물을 만들어드려요
        </p>
      </div>

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
          description="메뉴, 이벤트 사진으로 만드는 홍보 이미지"
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
          description="와이파이, 화장실, 영업시간 등 매장 안내문"
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
        <RecentHistoryEmpty />
      </div>
    </div>
  );
}
