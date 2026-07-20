"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  CafeProfile,
  GenerationRecord,
  ImageGenerationInput,
  Purpose,
} from "@/lib/schemas";
import { MAX_IMAGE_REFERENCE_PHOTOS, purposeLabels } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

const purposes: Purpose[] = ["new_menu", "event", "daily", "notice"];

type ImageOption = {
  imagePath: string;
  imageUrl: string;
  headline: string;
  reason: string;
  usedReferencePhotos?: boolean;
};

type ImageGenerationRecord = GenerationRecord & {
  persisted?: boolean;
  profileApplied?: boolean;
};

type PhotoItem = {
  path: string;
  previewUrl: string;
};

type ImageGeneratorProps = {
  profile: CafeProfile;
  profileUnavailable?: boolean;
  initial?: {
    purpose?: Purpose;
    title?: string;
    dateText?: string;
    message?: string;
    photoPaths?: string[];
  };
};

export function ImageGenerator({
  profile,
  profileUnavailable,
  initial,
}: ImageGeneratorProps) {
  const [purpose, setPurpose] = useState<Purpose>(initial?.purpose ?? "new_menu");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dateText, setDateText] = useState(initial?.dateText ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (initial?.photoPaths ?? []).map((path) => ({
      path,
      previewUrl: `/api/files/${path}`,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    profileUnavailable
      ? "카페 정보를 잠시 불러오지 못했어요. 입력한 내용으로 이미지를 만들 수 있어요."
      : initial?.title
        ? "이전 내용을 불러왔어요. 사진이나 글자를 고친 뒤 다시 만들 수 있어요."
        : "",
  );
  const [noticeKind, setNoticeKind] = useState<"ok" | "sample" | "no-photo" | "">("");
  const [record, setRecord] = useState<ImageGenerationRecord | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [actionPending, setActionPending] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState(initial?.title ?? "");
  const [editDateText, setEditDateText] = useState(initial?.dateText ?? "");
  const [editMessage, setEditMessage] = useState(initial?.message ?? "");
  const resultsRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      setElapsedSec(sec);
      if (photos.length && sec < 8) {
        setLoadingStep(`올린 사진 ${photos.length}장을 살펴보는 중…`);
      } else if (sec < 25) {
        setLoadingStep("이미지 1·2장을 그리는 중… 보통 40초 안에 끝나요.");
      } else {
        setLoadingStep("조금만 더 기다려 주세요. 거의 다 됐어요.");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading, photos.length]);

  async function uploadOne(file: File): Promise<PhotoItem> {
    const body = new FormData();
    body.append("file", file);
    const res = await fetchWithTimeout("/api/uploads", { method: "POST", body }, 30_000);
    const json = await res.json().catch(() => null);
    if (!json?.ok) throw new Error(json?.error || "사진을 올리지 못했어요.");
    return {
      path: json.data.storedName as string,
      previewUrl: URL.createObjectURL(file),
    };
  }

  async function onPickPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    const remaining = MAX_IMAGE_REFERENCE_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`참고 사진은 최대 ${MAX_IMAGE_REFERENCE_PHOTOS}장까지예요.`);
      return;
    }

    const all = Array.from(fileList);
    const picked = all.slice(0, remaining);
    setUploading(true);
    try {
      const uploaded = await Promise.all(picked.map((file) => uploadOne(file)));
      setPhotos((prev) => [...prev, ...uploaded]);
      const total = photos.length + uploaded.length;
      const truncated = all.length > picked.length;
      setStatus(
        truncated
          ? `최대 ${MAX_IMAGE_REFERENCE_PHOTOS}장까지만 올릴 수 있어 ${picked.length}장만 담았어요.`
          : total === 1
            ? "참고 사진 1장을 올렸어요. 더 올리면 분위기를 더 잘 살릴 수 있어요."
            : `참고 사진 ${total}장을 올렸어요.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 올리지 못했어요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(path: string) {
    setPhotos((prev) => {
      const target = prev.find((item) => item.path === path);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.path !== path);
    });
    setStatus("사진을 빼었어요.");
  }

  async function runGenerate(
    nextTitle: string,
    nextDate: string,
    nextMessage: string,
  ) {
    setLoading(true);
    setElapsedSec(0);
    setLoadingStep(
      photos.length
        ? `올린 사진 ${photos.length}장을 살펴보는 중…`
        : "이미지 1·2장을 그리는 중… 보통 40초 안에 끝나요.",
    );
    setError("");
    setStatus("");
    setNoticeKind("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 70_000);
    try {
      const body: ImageGenerationInput = {
        purpose,
        title: nextTitle,
        dateText: nextDate,
        message: nextMessage,
        photoPaths: photos.map((photo) => photo.path),
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
      setEditTitle(nextTitle);
      setEditDateText(nextDate);
      setEditMessage(nextMessage);
      setTitle(nextTitle);
      setDateText(nextDate);
      setMessage(nextMessage);

      const options = (json.data.options ?? []) as ImageOption[];
      const usedPhotos = options.some((option) => option.usedReferencePhotos);
      if (json.data.isSample) {
        setNoticeKind("sample");
        setStatus("지금은 체험용 이미지예요. 아래 버튼으로 한 번 더 만들어 주세요.");
      } else if (photos.length > 0 && !usedPhotos) {
        setNoticeKind("no-photo");
        setStatus("사진을 반영하기 어려워 제목 중심으로 새로 그렸어요.");
      } else {
        setNoticeKind("ok");
        setStatus(
          json.data.persisted
            ? "홍보 이미지 2장을 만들었어요."
            : "이미지를 만들었어요. 기록 저장은 잠시 안 되지만 바로 받을 수 있어요.",
        );
      }
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      }, 50);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("만드는 시간이 오래 걸리고 있어요. 아래 버튼으로 다시 시도해 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "만들지 못했어요. 다시 시도해 주세요.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setLoadingStep("");
      setElapsedSec(0);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await runGenerate(title.trim(), dateText.trim(), message.trim());
  }

  async function regenerateWithEdits() {
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      setError("이미지에 넣을 제목을 적어 주세요.");
      return;
    }
    await runGenerate(nextTitle, editDateText.trim(), editMessage.trim());
  }

  async function downloadOption(option: ImageOption, index: number) {
    setError("");
    setActionPending(index);
    try {
      const response = await fetch(option.imageUrl);
      if (!response.ok) throw new Error("이미지를 받지 못했어요.");
      const blob = await response.blob();
      const fileName = `${option.headline || "safil-image"}-${index + 1}.png`;
      const file = new File([blob], fileName, { type: blob.type || "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: option.headline,
          text: `${profile.name} 홍보 이미지`,
        });
        setSelected(index);
        setStatus("공유할 앱을 선택했어요. 인스타그램에 올려보세요.");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setSelected(index);
        setStatus("이미지를 저장했어요. 안 되면 이미지를 길게 눌러 저장해 주세요.");
      }

      if (record?.persisted) {
        await fetchWithTimeout(`/api/history/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloaded: true, selectedIndex: index }),
        }).catch(() => null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("저장하지 못했어요. 이미지를 길게 눌러 저장해 주세요.");
    } finally {
      setActionPending(null);
    }
  }

  const canAddMore = photos.length < MAX_IMAGE_REFERENCE_PHOTOS;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">이미지</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 이미지 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          메뉴·매장 사진을 여러 장 올리고 제목만 적으면, 인스타에 올릴 이미지 2장을 만들어드려요.
        </p>
      </header>

      <section className="rounded-2xl bg-brand-soft/60 px-4 py-3 text-sm">
        <p className="truncate font-bold text-ink">{profile.name}</p>
        <p className="truncate text-xs text-ink-soft">{profile.location}</p>
      </section>

      {status && (
        <div
          role="status"
          aria-live="polite"
          className={
            noticeKind === "sample" || noticeKind === "no-photo"
              ? "alert-error"
              : "alert-success"
          }
        >
          <p>{status}</p>
          {(noticeKind === "sample" || noticeKind === "no-photo") && (
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={loading || uploading}
              onClick={() => runGenerate(title.trim(), dateText.trim(), message.trim())}
            >
              다시 만들기
            </button>
          )}
        </div>
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">참고 사진 (선택)</span>
            <span className="text-xs font-semibold text-ink-soft">
              {photos.length}/{MAX_IMAGE_REFERENCE_PHOTOS}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => onPickPhotos(e.target.files)}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={uploading || loading || !canAddMore}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? "올리는 중…"
              : canAddMore
                ? photos.length
                  ? "사진 더 올리기"
                  : "사진 여러 장 올리기"
                : "최대 장수예요"}
          </button>

          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <li key={photo.path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`참고 사진 ${index + 1}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-ink/85 px-2 text-xs font-bold text-paper"
                    onClick={() => removePhoto(photo.path)}
                    aria-label={`참고 사진 ${index + 1} 삭제`}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs leading-5 text-ink-soft">
            한 번에 여러 장을 고를 수 있어요. 최대 {MAX_IMAGE_REFERENCE_PHOTOS}장. 없어도 제목만으로
            만들 수 있어요.
          </p>
        </div>

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
          <span className="text-sm font-semibold">한 줄 설명 (선택)</span>
          <input
            className="field"
            maxLength={120}
            placeholder="예: 제철 딸기로 만든 라떼예요"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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

        {error && (
          <div role="alert" className="alert-error flex flex-col gap-3">
            <p>{error}</p>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || uploading || !title.trim()}
              onClick={() => runGenerate(title.trim(), dateText.trim(), message.trim())}
            >
              다시 시도하기
            </button>
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="flex flex-col gap-2 text-center">
            <p className="text-sm text-ink-soft">
              {loadingStep || "이미지를 만들고 있어요…"}
            </p>
            <p className="text-xs font-semibold text-ink-soft">{elapsedSec}초 지났어요</p>
            <div className="h-2 overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.min(95, 12 + elapsedSec * 2)}%` }}
              />
            </div>
          </div>
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
          {loading ? "만드는 중…" : record ? "처음부터 다시 만들기" : "이미지 2장 만들기"}
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
            <p className="mt-1 text-sm text-ink-soft">
              글자가 아쉬우면 아래에서 고친 뒤 다시 그릴 수 있어요.
            </p>
          </div>

          <div className="card flex flex-col gap-3">
            <p className="text-sm font-semibold">글자 수정 후 다시 그리기</p>
            <p className="text-xs leading-5 text-ink-soft">
              글자를 바꾸면 이미지를 새로 그려요. 참고 사진은 그대로 쓰입니다.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">제목</span>
              <input
                className="field"
                maxLength={60}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">한 줄 설명</span>
              <input
                className="field"
                maxLength={120}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">날짜/기간</span>
              <input
                className="field"
                maxLength={40}
                value={editDateText}
                onChange={(e) => setEditDateText(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || uploading}
              onClick={regenerateWithEdits}
            >
              이 글자로 다시 그리기
            </button>
          </div>

          {(record.options as ImageOption[]).map((option, index) => (
            <article
              key={`${record.id}-${index}-${option.imageUrl}`}
              className={`card flex flex-col gap-3 ${
                selected === index ? "ring-2 ring-brand ring-offset-2" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-brand">
                  {index === 0 ? "깔끔한 버전" : "따뜻한 버전"}
                </span>
                {record.isSample && (
                  <span className="rounded-full bg-cream px-2 py-1 text-[0.6875rem] text-ink-soft">
                    체험용
                  </span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.imageUrl}
                alt={option.headline}
                className="aspect-square w-full rounded-2xl bg-cream object-cover"
              />
              <p className="text-xs leading-5 text-ink-soft">
                저장이 안 되면 이미지를 길게 눌러 저장해 주세요.
              </p>
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
                {actionPending === index ? "준비 중…" : "저장하거나 공유하기"}
              </button>
            </article>
          ))}

          <div className="card flex flex-col gap-2 text-center">
            <p className="font-bold">이미지를 쓰셨나요?</p>
            <p className="text-sm leading-6 text-ink-soft">
              저장한 이미지는 홈의 최근 기록과 히스토리에서 다시 볼 수 있어요.
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Link href="/" className="btn-secondary">
                홈으로
              </Link>
              <Link href="/history" className="btn-primary !w-auto">
                기록 보기
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
