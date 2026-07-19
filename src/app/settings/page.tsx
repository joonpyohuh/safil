import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCafeProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "카페 프로필 설정" };

export default function SettingsPage() {
  const profile = getCafeProfile();
  return <div className="flex flex-col gap-8"><header className="reveal"><p className="mb-2 text-sm font-bold text-primary">내 카페</p><h1 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-4xl">사장님의 카페를<br className="sm:hidden" /> 알려주세요</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">한 번만 등록하면 카페의 분위기와 말투를 기억해, 매번 더 잘 맞는 홍보물을 만들어드려요.</p></header><ProfileForm initial={profile} /></div>;
}
