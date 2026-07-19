import Link from "next/link";
import { FileText, ImageIcon, MessageSquareText, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { ActionCard } from "@/components/dashboard/action-card";
import { RecentHistoryEmpty } from "@/components/dashboard/recent-history-empty";
import { listGenerations } from "@/lib/history";

const typeLabel = { copy: "홍보 문구", image: "홍보 이미지", notice: "매장 안내물" };

export default function Home() {
  const recent = listGenerations({ limit: 3 });
  return (
    <div className="flex flex-col gap-10">
      <section className="reveal flex flex-col gap-6 rounded-[1.75rem] bg-foreground p-6 text-card shadow-[0_20px_50px_rgb(36_31_27/.16)] sm:p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="flex w-fit items-center gap-2 rounded-full bg-card/10 px-3 py-1.5 text-xs font-semibold"><Sparkles className="size-4" aria-hidden="true" />오늘의 카페 홍보</span>
          <div><h1 className="text-balance text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl">사장님의 좋은 메뉴가<br />더 잘 보이도록.</h1><p className="mt-3 text-pretty text-sm leading-6 text-card/70 sm:text-base">사진과 몇 마디만 입력하면 바로 게시할 수 있는 홍보물을 만들어드려요.</p></div>
        </div>
        <div className="flex items-center gap-2 text-sm text-card/75"><CheckCircle2 className="size-5 text-primary-soft" aria-hidden="true" />평균 1분 안에 완성</div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="create-heading">
        <div><p className="mb-1 text-sm font-semibold text-primary">빠른 시작</p><h2 id="create-heading" className="text-2xl font-bold tracking-tight">무엇을 만들어볼까요?</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard href="/create/copy" eyebrow="글쓰기" title="홍보 문구" description="인스타그램과 네이버 플레이스에 바로 올릴 문구를 만들어요." icon={<MessageSquareText className="size-6" />} />
          <ActionCard href="/create/image" eyebrow="디자인" title="홍보 이미지" description="메뉴 사진을 눈에 띄는 SNS 홍보 이미지로 바꿔드려요." icon={<ImageIcon className="size-6" />} delay="reveal-delay-1" />
          <ActionCard href="/create/notice" eyebrow="매장 운영" title="매장 안내물" description="와이파이, 영업시간 등 깔끔한 안내문을 만들어요." icon={<FileText className="size-6" />} delay="reveal-delay-2" />
        </div>
      </section>

      <section className="reveal reveal-delay-3 flex flex-col gap-4" aria-labelledby="recent-heading">
        <div className="flex items-end justify-between"><div><p className="mb-1 text-sm font-semibold text-primary">내 작업실</p><h2 id="recent-heading" className="text-2xl font-bold tracking-tight">최근 만든 것</h2></div>{recent.length > 0 && <Link href="/history" className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">모두 보기 <ArrowRight className="size-4" /></Link>}</div>
        {recent.length === 0 ? <RecentHistoryEmpty /> : <div className="grid gap-3 md:grid-cols-3">{recent.map((item) => <Link href="/history" key={item.id} className="surface group flex flex-col gap-4 rounded-[1.25rem] p-5 transition-transform hover:-translate-y-1"><span className="flex items-center justify-between"><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{typeLabel[item.type]}</span><span className="text-xs text-muted">{new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(item.createdAt)}</span></span><p className="line-clamp-2 min-h-12 text-sm font-medium leading-6">{JSON.stringify(item.input).replace(/[{}\"\[\]]/g, " ").slice(0, 80)}</p><span className="flex items-center gap-1 text-xs font-semibold text-muted group-hover:text-primary">자세히 보기 <ArrowRight className="size-3.5" /></span></Link>)}</div>}
      </section>
    </div>
  );
}
