export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-16 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-soft">{description}</p>
      <p className="mt-2 text-xs text-ink-soft">곧 준비할게요</p>
    </div>
  );
}
