"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type {
  CafeProfile,
  GenerationRecord,
  ImageGenerationInput,
  Purpose,
} from "@/lib/schemas";
import { purposeLabels } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const purposes: Purpose[] = ["new_menu", "event", "daily", "notice"];

type ImageOption = {
  imagePath: string;
  imageUrl: string;
  headline: string;
  reason: string;
};

type ImageGenerationRecord = GenerationRecord & {
  persisted?: boolean;
  profileApplied?: boolean;
};

type ImageGeneratorProps = {
  profile: CafeProfile;
  profileUnavailable?: boolean;
};

export function ImageGenerator({ profile, profileUnavailable }: ImageGeneratorProps) {
  const [purpose, setPurpose] = useState<Purpose>("new_menu");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    profileUnavailable
      ? "카페 정보를 잠시 불러오지 못했어요. 입력한 내용으로 이미지를 만들 수 있어요."
      : "",
  );
  const [record, setRecord] = useState<ImageGenerationRecord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [actionPending, setActionPending] = useState<number | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetchWithTimeout("/api/uploads", { method: "POST", body }, 30_000);
      const json = await res.json().catch(() => null);
      if (!json?.ok) throw new Error(json?.error || "사진을 올리지 못했어요.");
      setPhotoPath(json.data.storedName);
      setPhotoPreview(URL.createObjectURL(file));
      setStatus("참고 사진을 올렸어요. 없어도 제목만으로 만들 수 있어요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 올리지 못했어요.");
      setPhotoPath(null);
      setPhotoPreview("");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90_000);
    try {
      const body: ImageGenerationInput = {
        purpose,
        title,
        dateText,
        photoPath,
      };
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("응답을 읽지 못했어요. 다시 시도해 주세요.");
      if (!json.ok) throw new Error(json.error);
      setRecord(json.data);
      setSelected(null);
      const notices: string[] = [];
      if (json.data.isSample) notices.push("체험용 이미지예요.");
      if (!json.data.persisted) notices.push("기록 저장은 잠시 안 되지만 바로 받을 수 있어요.");
      setStatus(notices.length ? notices.join(" ") : "홍보 이미지 2장을 만들었어요.");
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      }, 50);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("만드는 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "만들지 못했어요.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function downloadOption(option: ImageOption, index: number) {
    setError("");
    setActionPending(index);
    try {
      const response = await fetch(option.imageUrl);
      if (!response.ok) throw new Error("이미지를 받지 못했어요.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${option.headline || "safil-image"}-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setSelected(index);
      setStatus("이미지를 저장했어요.");

      if (record?.persisted) {
        await fetchWithTimeout(`/api/history/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloaded: true, selectedIndex: index }),
        }).catch(() => null);
      }
    } catch {
      setError("저장하지 못했어요. 이미지를 길게 눌러 저장해 주세요.");
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">이미지</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 이미지 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          제목만 적으면 SNS에 올릴 이미지 2장을 만들어드려요.
        </p>
      </header>

      <section className="rounded-2xl bg-brand-soft/60 px-4 py-3 text-sm">
        <p className="truncate font-bold text-ink">{profile.name}</p>
        <p className="truncate text-xs text-ink-soft">{profile.location}</p>
      </section>

      {status && (
        <p role="status" aria-live="polite" className="alert-success">
          {status}
        </p>
      )}

      <form id="image-form" onSubmit={submit} className="card flex flex-col gap-5" aria-busy={loading}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">어떤 소식인가요?</legend>
          <div className="grid grid-cols-2 gap-2">
            {purposes.map((p) => (
              <button
                key={p}
                type="button"
                className={`chip ${purpose === p ? "chip-active" : ""}`}
                onClick={() => setPurpose(p)}
                aria-pressed={purpose === p}
              >
                {purposeLabels[p]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">이미지 제목 *</span>
          <input
            className="field"
            required
            maxLength={60}
            placeholder="예: 딸기라떼 신메뉴"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            enterKeyHint="done"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">날짜/기간 (선택)</span>
          <input
            className="field"
            maxLength={40}
            placeholder="예: 이번 주말까지"
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">참고 사진 (선택)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={uploading || loading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "올리는 중…" : photoPath ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="참고 사진 미리보기"
              className="mt-1 aspect-square w-full rounded-2xl object-cover"
            />
          )}
          <p className="text-xs text-ink-soft">
            사진이 있으면 그 느낌을 살리고, 없어도 제목으로 이미지를 만들어요.
          </p>
        </div>

        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}

        {loading && (
          <p role="status" aria-live="polite" className="text-center text-sm text-ink-soft">
            이미지를 그리고 있어요. 보통 20~40초 걸려요.
          </p>
        )}

        <button type="submit" className="btn-primary hidden md:inline-flex" disabled={loading || uploading}>
          {loading ? "만드는 중…" : "이미지 2장 만들기"}
        </button>
      </form>

      <div className="sticky-action md:hidden">
        <button
          type="submit"
          form="image-form"
          className="btn-primary"
          disabled={loading || uploading}
        >
          {loading ? "만드는 중…" : record ? "다시 만들기" : "이미지 2장 만들기"}
        </button>
      </div>

      {record && (
        <section
          id="image-results"
          ref={resultsRef}
          tabIndex={-1}
          className="flex scroll-mt-4 flex-col gap-4 pb-4 outline-none"
        >
          <div>
            <p className="text-sm font-bold text-brand">완성</p>
            <h2 className="text-xl font-bold">마음에 드는 이미지를 저장하세요</h2>
          </div>

          {(record.options as ImageOption[]).map((option, index) => (
            <article
              key={index}
              className={`card flex flex-col gap-3 ${
                selected === index ? "ring-2 ring-brand ring-offset-2" : ""
              }`}
            >
              <span className="text-xs font-bold text-brand">
                {index === 0 ? "깔끔한 버전" : "따뜻한 버전"}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.imageUrl}
                alt={option.headline}
                className="aspect-square w-full rounded-2xl bg-cream object-cover"
              />
              <p className="text-sm font-semibold">{option.headline}</p>
              <details className="rounded-xl bg-cream px-3 py-2">
                <summary className="cursor-pointer text-xs font-bold text-ink-soft">
                  이 이미지를 제안한 이유
                </summary>
                <p className="mt-2 text-xs leading-5 text-ink-soft">{option.reason}</p>
              </details>
              <button
                type="button"
                className="btn-primary"
                onClick={() => downloadOption(option, index)}
                disabled={actionPending === index}
              >
                {actionPending === index ? "저장 중…" : "이미지 저장"}
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
