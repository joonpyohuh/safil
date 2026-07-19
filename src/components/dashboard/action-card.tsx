import Link from "next/link";

export function ActionCard({
  href,
  title,
  description,
  icon,
  disabled = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{description}</span>
      </span>
      {disabled ? (
        <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-ink-soft">
          준비 중
        </span>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        className="flex items-center gap-4 rounded-2xl border border-line bg-paper/60 p-5 opacity-70"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
    >
      {content}
    </Link>
  );
}
