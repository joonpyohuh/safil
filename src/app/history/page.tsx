import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, FileText, Image, MessageSquareText, Plus } from "lucide-react";
import { listGenerations } from "@/lib/history";
import type { GenerationType } from "@/lib/schemas";

export const metadata: Metadata = { title: "히스토리" };
const labels = { copy: "홍보 문구", image: "홍보 이미지", notice: "매장 안내물" };
const icons = { copy: MessageSquareText, image: Image, notice: FileText };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const active = (["copy", "image", "notice"] as string[]).includes(type ?? "") ? (type as GenerationType) : undefined;
  const records = listGenerations({ type: active, limit: 100 });
  const filters: Array<[string, string]> = [["", "전체"], ["copy", "문구"], ["image", "이미지"], ["notice", "안내물"]];

  return <div className="flex flex-col gap-8">
    <header className="reveal flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-bold text-primary">내 작업실</p><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">만든 결과물</h1><p className="mt-2 text-sm leading-6 text-muted">지금까지 만든 홍보물을 한곳에서 다시 확인하세요.</p></div><Link href="/" className="btn-primary text-sm"><Plus className="size-4" />새로 만들기</Link></header>
    <nav className="reveal reveal-delay-1 flex gap-2 overflow-x-auto pb-1" aria-label="결과 유형 필터">{filters.map(([value, label]) => <Link key={value} href={value ? `/history?type=${value}` : "/history"} aria-current={(active ?? "") === value ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${(active ?? "") === value ? "border-foreground bg-foreground text-card" : "bg-card text-muted hover:text-foreground"}`}>{label}</Link>)}</nav>
    {records.length === 0 ? <section className="surface reveal reveal-delay-2 flex flex-col items-center gap-4 rounded-[1.75rem] px-6 py-16 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary"><Clock3 className="size-6" /></span><div><h2 className="text-lg font-bold">아직 저장된 결과물이 없어요</h2><p className="mt-2 text-sm text-muted">첫 홍보물을 만들면 이곳에서 언제든 다시 볼 수 있어요.</p></div><Link href="/" className="btn-secondary text-sm">첫 결과물 만들기</Link></section> : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records.map((record, index) => { const Icon = icons[record.type]; const option = record.options[record.selectedIndex ?? 0] as Record<string, unknown> | undefined; const heading = String(option?.text ?? option?.headline ?? option?.title ?? labels[record.type]); return <article key={record.id} className="surface reveal flex flex-col justify-between gap-6 rounded-[1.5rem] p-5" style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}><div className="flex flex-col gap-4"><div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon className="size-5" /></span><time className="text-xs text-muted">{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(record.createdAt)}</time></div><div><span className="text-xs font-bold text-primary">{labels[record.type]}</span><h2 className="mt-2 line-clamp-3 text-base font-semibold leading-6">{heading}</h2></div></div><div className="flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-muted">{record.isSample ? "샘플 생성" : record.selectedIndex !== null ? "선택 완료" : "제안 확인"}</span><Link href={`/create/${record.type}`} className="flex items-center gap-1 text-xs font-bold hover:text-primary">비슷하게 만들기 <ArrowRight className="size-3.5" /></Link></div></article>; })}</section>}
  </div>;
}
