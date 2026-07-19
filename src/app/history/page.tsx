import { RecentHistoryEmpty } from "@/components/dashboard/recent-history-empty";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">히스토리</h1>
        <p className="mt-1 text-sm text-ink-soft">
          지금까지 만든 결과물을 다시 확인할 수 있어요
        </p>
      </div>
      <RecentHistoryEmpty />
    </div>
  );
}
