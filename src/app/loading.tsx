export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-lg bg-brand-soft" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-brand-soft/70" />
      <div className="card mt-2 flex flex-col gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-brand-soft" />
        <div className="h-12 animate-pulse rounded-2xl bg-cream" />
        <div className="h-12 animate-pulse rounded-2xl bg-cream" />
      </div>
      <span className="sr-only">화면을 불러오는 중입니다.</span>
    </div>
  );
}
