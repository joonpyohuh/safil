"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  CafeProfile,
  GenerationRecord,
  ImageGenerationInput,
  ImageOption,
  Purpose,
} from "@/lib/schemas";
import { MAX_IMAGE_REFERENCE_PHOTOS, purposeLabels } from "@/lib/schemas";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import { compressImageFile } from "@/lib/client/compress-image";
import { ImageResultCard } from "@/components/create/image-result-card";

const purposes: Purpose[] = ["new_menu", "event", "daily", "notice"];

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
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initial?.title || initial?.dateText || initial?.message),
  );
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (initial?.photoPaths ?? []).map((path) => ({
      path,
      previewUrl: `/api/files/${path}`,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(
    profileUnavailable
      ? "카페 정보를 잠시 불러오지 못했어요. 지금 입력한 내용으로 이미지를 만들 수 있어요."
      : initial?.title
        ? "이전 내용을 불러왔어요. 사진이나 글자를 바꾼 뒤 다시 만들 수 있어요."
        : "",
  );
  const [noticeKind, setNoticeKind] = useState<"ok" | "sample" | "no-photo" | "">("");
  const [record, setRecord] = useState<ImageGenerationRecord | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // 페이지 이탈 시 미리보기 blob URL 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      setElapsedSec(sec);
      if (photosRef.current.length && sec < 8) {
        setLoadingStep(`올린 사진 ${photosRef.current.length}장의 분위기를 읽는 중…`);
      } else if (sec < 30) {
        setLoadingStep("배경 이미지 2장을 그리는 중… 보통 40초 안에 끝나요.");
      } else {
        setLoadingStep("조금만 더 기다려 주세요. 거의 다 됐어요.");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading]);

  async function uploadOne(file: File): Promise<PhotoItem> {
    let ready: File;
    try {
      ready = await compressImageFile(file);
    } catch {
      // 변환 실패: JPG/PNG/WEBP 원본이면 그대로 시도, 아니면 명확히 안내
      const compatible = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      if (!compatible) {
        throw new Error("사진 형식을 변환하지 못했어요. 다른 사진을 골라 주세요.");
      }
      ready = file;
    }
    const body = new FormData();
    body.append("file", ready);
    const res = await fetchWithTimeout("/api/uploads", { method: "POST", body }, 45_000);
    const json = await res.json().catch(() => null);
    if (!json?.ok) throw new Error(json?.error || "사진을 올리지 못했어요.");
    return {
      path: json.data.storedName as string,
      previewUrl: URL.createObjectURL(ready),
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
    setUploadNote(
      picked.length === 1 ? "사진 1장을 준비하는 중…" : `사진 ${picked.length}장을 준비하는 중…`,
    );
    try {
      const uploaded: PhotoItem[] = [];
      const failed: string[] = [];
      const results = await Promise.allSettled(picked.map((file) => uploadOne(file)));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") uploaded.push(result.value);
        else failed.push(picked[index]?.name ?? `사진 ${index + 1}`);
      });

      if (uploaded.length === 0) {
        throw new Error("사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
      }

      const nextPhotos = [...photos, ...uploaded];
      setPhotos(nextPhotos);

      if (failed.length > 0) {
        setStatus(`사진 ${uploaded.length}장을 올렸어요. ${failed.length}장은 올리지 못했어요.`);
      } else if (all.length > picked.length) {
        setStatus(`최대 ${MAX_IMAGE_REFERENCE_PHOTOS}장까지만 올릴 수 있어 ${picked.length}장만 담았어요.`);
      }

      // 원탭 플로우: 사진을 올리면 바로 만들기 시작 (제목은 AI가 제안)
      if (failed.length === 0 && !loading) {
        void runGenerate(title.trim(), dateText.trim(), message.trim(), nextPhotos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 올리지 못했어요.");
    } finally {
      setUploading(false);
      setUploadNote("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(path: string) {
    setPhotos((prev) => {
      const target = prev.find((item) => item.path === path);
      if (target && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.path !== path);
    });
  }

  function cancelGenerate() {
    abortRef.current?.abort();
  }

  async function runGenerate(
    nextTitle: string,
    nextDate: string,
    nextMessage: string,
    withPhotos?: PhotoItem[],
  ) {
    const usePhotos = withPhotos ?? photos;
    if (!nextTitle && usePhotos.length === 0) {
      setError("사진을 올리거나 제목을 적어 주세요.");
      return;
    }
    setLoading(true);
    setElapsedSec(0);
    setLoadingStep(
      usePhotos.length
        ? `올린 사진 ${usePhotos.length}장의 분위기를 읽는 중…`
        : "배경 이미지 2장을 그리는 중… 보통 40초 안에 끝나요.",
    );
    setError("");
    setStatus("");
    setNoticeKind("");
    // 서버 maxDuration(90초)보다 길게 잡아 "클라이언트만 실패" 상황을 방지
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 100_000);
    try {
      const body: ImageGenerationInput = {
        purpose,
        title: nextTitle,
        dateText: nextDate,
        message: nextMessage,
        photoPaths: usePhotos.map((photo) => photo.path),
      };
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("응답을 읽지 못했어요. 다시 시도해 주세요.");
      if (!json.ok) {
        throw new Error(json.error || "만들지 못했어요. 다시 시도해 주세요.");
      }
      setRecord(json.data);

      const options = (json.data.options ?? []) as ImageOption[];
      const reflected = options.filter((option) => option.usedReferencePhotos).length;
      if (json.data.isSample) {
        setNoticeKind("sample");
        setStatus("지금은 체험용 이미지예요. 아래 버튼으로 한 번 더 만들어 주세요.");
      } else if (usePhotos.length > 0 && reflected === 0) {
        setNoticeKind("no-photo");
        setStatus("사진을 반영하기 어려워 분위기만 살려 새로 그렸어요.");
      } else if (usePhotos.length > 0 && reflected < options.length) {
        setNoticeKind("ok");
        setStatus(
          `이미지 2장 중 ${reflected}장에 사진을 반영했어요. 각 이미지의 표시를 확인해 주세요.`,
        );
      } else {
        setNoticeKind("ok");
        setStatus(
          json.data.persisted
            ? "이미지 2장이 완성됐어요. 글자는 아래에서 바로 고칠 수 있어요."
            : "이미지가 완성됐어요. 기록 저장은 잠시 안 되지만 바로 받을 수 있어요.",
        );
      }
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        resultsRef.current?.focus({ preventScroll: true });
      }, 50);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("만들기를 멈췄거나 시간이 너무 오래 걸렸어요. 아래 버튼으로 다시 시도해 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "만들지 못했어요. 다시 시도해 주세요.");
      }
    } finally {
      window.clearTimeout(timeout);
      abortRef.current = null;
      setLoading(false);
      setLoadingStep("");
      setElapsedSec(0);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await runGenerate(title.trim(), dateText.trim(), message.trim());
  }

  const canAddMore = photos.length < MAX_IMAGE_REFERENCE_PHOTOS;
  const canSubmit = !loading && !uploading && (photos.length > 0 || title.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">이미지</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 이미지 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          메뉴·매장 사진만 올리면 바로 만들어드려요. 제목은 AI가 사진을 보고 제안하고, 한글 문구는
          완성 후 바로 고칠 수 있어요.
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">1. 사진 올리기</span>
            <span className="text-xs font-semibold text-ink-soft">
              {photos.length}/{MAX_IMAGE_REFERENCE_PHOTOS}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => onPickPhotos(e.target.files)}
          />
          <button
            type="button"
            className="btn-primary !min-h-14"
            disabled={uploading || loading || !canAddMore}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? uploadNote || "올리는 중…"
              : canAddMore
                ? photos.length
                  ? "사진 더 올리기"
                  : "사진 올리고 바로 만들기"
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
            아이폰 사진(HEIC)도 알아서 변환돼요. 사진만 올리면 AI가 분위기를 읽고 바로
            만들어드려요.
          </p>
        </div>

        <button
          type="button"
          className="flex min-h-11 items-center justify-between text-left text-sm font-semibold"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
        >
          <span>2. 직접 정하고 싶다면 (선택)</span>
          <span aria-hidden className="text-ink-soft">
            {detailsOpen ? "접기 ▲" : "펼치기 ▼"}
          </span>
        </button>

        {detailsOpen && (
          <div className="flex flex-col gap-4">
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
              <span className="text-sm font-semibold">이미지 제목 (비우면 AI가 제안)</span>
              <input
                className="field"
                maxLength={16}
                placeholder="예: 딸기라떼 신메뉴"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                enterKeyHint="done"
              />
              <span className="text-xs text-ink-soft">이미지에는 16자까지 또렷하게 들어가요</span>
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
          </div>
        )}

        {error && (
          <div role="alert" className="alert-error flex flex-col gap-3">
            <p>{error}</p>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || uploading || (photos.length === 0 && !title.trim())}
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
            <button type="button" className="btn-secondary" onClick={cancelGenerate}>
              멈추기
            </button>
          </div>
        )}

        <button type="submit" className="btn-primary hidden md:inline-flex" disabled={!canSubmit}>
          {loading ? "만드는 중…" : "이미지 2장 만들기"}
        </button>
      </form>

      <div className="sticky-action md:hidden">
        <button
          type="submit"
          form="image-form"
          className="btn-primary"
          disabled={!canSubmit}
        >
          {loading ? "만드는 중…" : record ? "새 배경으로 다시 만들기" : "이미지 2장 만들기"}
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
              한글 문구는 각 이미지에서 바로 고칠 수 있어요. 다시 만들 필요 없어요.
            </p>
          </div>

          {(record.options as ImageOption[]).map((option, index) => (
            <ImageResultCard
              key={`${record.id}-${index}-${option.imageUrl}`}
              label={index === 0 ? "밝고 깔끔한 버전" : "따뜻한 분위기 버전"}
              imageUrl={option.imageUrl}
              initialHeadline={option.headline}
              initialSubline={option.subline ?? ""}
              initialDateText={option.dateText ?? dateText}
              initialTemplate={option.templateId ?? "bottom_band"}
              initialPalette={option.palette ?? (index === 0 ? "cream" : "espresso")}
              reason={option.reason}
              isSample={record.isSample}
              usedReferencePhotos={
                photos.length > 0 ? Boolean(option.usedReferencePhotos) : undefined
              }
              shareTitle={`${profile.name} 홍보 이미지`}
              persistId={record.persisted ? record.id : undefined}
            />
          ))}

          <div className="card flex flex-col gap-2 text-center">
            <p className="font-bold">이미지를 쓰셨나요?</p>
            <p className="text-sm leading-6 text-ink-soft">
              만든 이미지는 히스토리에서 다시 보고 글자도 고칠 수 있어요.
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
