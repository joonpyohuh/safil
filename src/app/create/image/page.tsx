import type { Metadata } from "next";
import Link from "next/link";
import { ImageGenerator } from "@/components/create/image-generator";
import { getCafeProfile } from "@/lib/profile";
import { isProfileReady } from "@/lib/profile-utils";
import type { CafeProfile } from "@/lib/schemas";

export const metadata: Metadata = { title: "홍보 이미지 만들기" };
export const dynamic = "force-dynamic";

const fallbackProfile: CafeProfile = {
  name: "우리 카페",
  location: "내 동네",
  concept: "",
  introduction: "",
  menus: [],
  tone: "warm",
  customerType: "",
  logoPath: null,
  photoPaths: [],
  createdAt: 0,
  updatedAt: 0,
};

export default async function CreateImagePage() {
  const profileResult = await getCafeProfile()
    .then((profile) => ({ profile, unavailable: false }))
    .catch((error) => {
      console.error("[safil image profile]", error);
      return { profile: null, unavailable: true };
    });
  const { profile, unavailable: profileUnavailable } = profileResult;

  if (!profileUnavailable && !isProfileReady(profile)) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft"
        >
          ← 홈으로
        </Link>
        <section className="card flex flex-col gap-4 text-center">
          <div>
            <p className="text-sm font-bold text-brand">시작하기 전에</p>
            <h1 className="mt-1 text-xl font-bold">카페 정보를 먼저 알려주세요</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              카페 이름과 위치만 등록하면 우리 카페에 맞는 이미지를 만들 수 있어요.
            </p>
          </div>
          <Link href="/settings" className="btn-primary">
            1분 만에 등록하기
          </Link>
        </section>
      </div>
    );
  }

  return (
    <ImageGenerator
      profile={isProfileReady(profile) ? profile : fallbackProfile}
      profileUnavailable={profileUnavailable}
    />
  );
}
