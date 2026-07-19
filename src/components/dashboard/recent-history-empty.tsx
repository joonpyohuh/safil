import { Clock3 } from "lucide-react";

export function RecentHistoryEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Clock3 className="size-5" aria-hidden="true" /></span>
      <div className="flex flex-col gap-1"><p className="font-semibold">첫 결과물을 기다리고 있어요</p><p className="max-w-sm text-sm leading-6 text-muted">위의 메뉴에서 하나를 선택해 만들어보세요. 완성한 작업은 여기에 차곡차곡 모아드려요.</p></div>
    </div>
  );
}
