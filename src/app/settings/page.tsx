import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCafeProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "카페 설정" };

export default async function SettingsPage() {
  const profile = await getCafeProfile();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-bold text-brand">내 카페</p>
        <h1 className="mt-1 text-2xl font-bold">카페 정보 등록</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          카페를 찾아 조사한 뒤, 컨셉·분위기를 알려주시면 문구와 이미지가 우리 카페에 맞게
          만들어져요.
        </p>
      </header>
      <ProfileForm initial={profile} />
    </div>
  );
}
