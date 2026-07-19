import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function ActionCard({ href, title, description, eyebrow, icon, delay = "" }: { href: string; title: string; description: string; eyebrow: string; icon: React.ReactNode; delay?: string }) {
  return (
    <Link href={href} className={`surface reveal ${delay} group flex min-h-52 flex-col justify-between rounded-[1.5rem] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_45px_rgb(72_53_39/.12)] sm:p-6`}>
      <span className="flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">{icon}</span>
        <ArrowUpRight className="size-5 text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wider text-primary">{eyebrow}</span>
        <span className="text-xl font-bold tracking-tight text-foreground">{title}</span>
        <span className="text-sm leading-6 text-muted">{description}</span>
      </span>
    </Link>
  );
}
