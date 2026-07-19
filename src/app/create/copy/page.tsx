import type { Metadata } from "next";
import Link from "next/link";
import { CopyGenerator } from "@/components/create/copy-generator";
import { getCafeProfile } from "@/lib/profile";
import { listGenerations } from "@/lib/history";
import { isProfileReady } from "@/lib/profile-utils";
import {
  channelValues,
  purposeValues,
  type CafeProfile,
  type Channel,
  type Purpose,
} from "@/lib/schemas";

export const metadata: Metadata = { title: "홍보 문구 만들기" };

export default async function CreateCopyPage({
  searchParams,
}: {
  searchParams: Promise<{
    purpose?: string;
    channel?: string;
    message?: string;
    profile?: string;
  }>;
}) {
  const [profileResult, params, recent] = await Promise.all([
    getCafeProfile()
      .then((profile) => ({ profile, unavailable: false }))
      .catch((error) => {
        console.error("[safil copy profile]", error);
        return { profile: null, unavailable: true };
      }),
    searchParams,
    listGenerations({ type: "copy", limit: 5 }).catch((error) => {
      console.error("[safil copy suggestions]", error);
      return [];
    }),
  ]);
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
              카페 이름과 위치만 등록하면 우리 카페에 맞는 문구를 만들 수 있어요.
            </p>
          </div>
          <Link href="/settings" className="btn-primary">
            1분 만에 등록하기
          </Link>
        </section>
      </div>
    );
  }

  const purpose = (purposeValues as readonly string[]).includes(params.purpose ?? "")
    ? (params.purpose as Purpose)
    : undefined;
  const channel = (channelValues as readonly string[]).includes(params.channel ?? "")
    ? (params.channel as Channel)
    : undefined;
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
  const activeProfile = isProfileReady(profile) ? profile : fallbackProfile;
  const recentMessages = recent
    .map((record) => {
      if (!record.input || typeof record.input !== "object") return "";
      return String((record.input as Record<string, unknown>).message ?? "");
    })
    .filter(Boolean);
  const suggestions = [
    ...activeProfile.menus.slice(0, 2).map((menu) => `오늘 ${menu}를 추천하고 싶어요`),
    ...recentMessages,
    "오늘 카페 분위기를 알리고 싶어요",
  ].filter((item, index, all) => all.indexOf(item) === index).slice(0, 3);

  return (
    <CopyGenerator
      profile={activeProfile}
      profileUnavailable={profileUnavailable}
      suggestions={suggestions}
      profileJustSaved={params.profile === "saved"}
      initial={{
        purpose,
        channel,
        message: params.message?.slice(0, 200),
      }}
    />
  );
}
