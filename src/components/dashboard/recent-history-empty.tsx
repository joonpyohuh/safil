export function RecentHistoryEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-10 text-center">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-ink-soft"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium text-ink">아직 만든 결과물이 없어요</p>
      <p className="text-sm text-ink-soft">
        위에서 하나를 선택하면 여기에서 최근 결과물을 확인할 수 있어요
      </p>
    </div>
  );
}
