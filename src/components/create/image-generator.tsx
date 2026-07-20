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
  const [detailsOpen, setDetailsOpen] = useState(true);
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

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

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
      if (photosRef.current.length) {
        setLoadingStep(
          sec < 8
            ? "사진으로 광고 레이아웃 2안을 입히는 중…"
            : "거의 다 됐어요. 원본 사진을 그대로 쓰고 있어요.",
        );
      } else if (sec < 25) {
        setLoadingStep("사진이 없어 AI 배경을 그리는 중… 보통 30초 안이에요.");
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
        setStatus(`사진 ${uploaded.length}장을 올렸어요. ${failed.length}장은 올리지 못했어요. 준비가 되면 만들기를 눌러 주세요.`);
      } else if (all.length > picked.length) {
        setStatus(
          `최대 ${MAX_IMAGE_REFERENCE_PHOTOS}장까지만 올릴 수 있어 ${picked.length}장만 담았어요. 아래 만들기를 눌러 주세요.`,
        );
      } else {
        setStatus(
          nextPhotos.length === 1
            ? "사진을 올렸어요. 아래 만들기를 누르면 이미지를 만들어요."
            : `사진 ${nextPhotos.length}장을 올렸어요. 아래 만들기를 눌러 주세요.`,
        );
      }
      setNoticeKind("ok");
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
    if (!nextMessage.trim()) {
      setError("이번에 꼭 알릴 내용을 적어 주세요. (메뉴·맛·가격·기간 등)");
      return;
    }
    setLoading(true);
    setElapsedSec(0);
    setLoadingStep(
      usePhotos.length
        ? "사진으로 광고 레이아웃 2안을 입히는 중…"
        : "사진이 없어 AI 배경을 그리는 중…",
    );
    setError("");
    setStatus("");
    setNoticeKind("");
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(
      () => controller.abort(),
      usePhotos.length ? 35_000 : 90_000,
    );
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

      if (json.data.isSample) {
        setNoticeKind("sample");
        setStatus("지금은 체험용 이미지예요. 아래 버튼으로 한 번 더 만들어 주세요.");
      } else if (usePhotos.length > 0) {
        setNoticeKind("ok");
        setStatus(
          "올려주신 사진으로 레이아웃 2안을 만들었어요. 본문은 적어 주신 내용 그대로예요.",
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
  const canSubmit = !loading && !uploading && message.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ink-soft">
        ← 홈으로
      </Link>

      <header>
        <p className="text-sm font-bold text-brand">이미지</p>
        <h1 className="mt-1 text-2xl font-bold">홍보 이미지 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          꼭 알릴 내용(메뉴·가격·기간 등)을 적고 사진을 올리면, 원본 사진에 세련된 광고
          레이아웃 2안을 입혀드려요. 사진이 없을 때만 AI가 배경을 그려요.
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
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">1. 이번에 꼭 알릴 내용 (필수)</span>
          <textarea
            className="field min-h-28"
            maxLength={240}
            required
            placeholder={"예:\n딸기라떼 6,500원\n제철 딸기 · 이번 주만"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className="text-xs leading-5 text-ink-soft">
            메뉴명·맛·가격·기간·행사 등 사실을 적으면 포스터에 그대로 넣어요. AI가 바꾸지 않아요.
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">2. 사진 올리기 (권장)</span>
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
            className="btn-secondary !min-h-14"
            disabled={uploading || loading || !canAddMore}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? uploadNote || "올리는 중…"
              : canAddMore
                ? photos.length
                  ? "사진 더 올리기"
                  : "사진 올리기"
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
            사진을 올리면 AI가 음식을 새로 그리지 않고, 원본으로 광고 디자인만 입혀요.
          </p>
        </div>

        <button type="submit" className="btn-primary !min-h-14" disabled={!canSubmit}>
          {loading
            ? "만드는 중…"
            : record
              ? "다시 만들기"
              : photos.length
                ? "사진으로 광고 2안 만들기"
                : "이미지 2장 만들기"}
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center justify-between text-left text-sm font-semibold"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
        >
          <span>3. 제목·날짜·소식 종류 (선택)</span>
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
              <span className="text-sm font-semibold">짧은 제목 (비우면 자동)</span>
              <input
                className="field"
                maxLength={16}
                placeholder="예: 딸기라떼"
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
          </div>
        )}

        {error && (
          <div role="alert" className="alert-error flex flex-col gap-3">
            <p>{error}</p>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || uploading || !message.trim()}
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
                style={{ width: `${Math.min(95, 12 + elapsedSec * (photos.length ? 6 : 2))}%` }}
              />
            </div>
            <button type="button" className="btn-secondary" onClick={cancelGenerate}>
              멈추기
            </button>
          </div>
        )}
      </form>

      <div className="sticky-action md:hidden">
        <button
          type="submit"
          form="image-form"
          className="btn-primary"
          disabled={!canSubmit}
        >
          {loading
            ? "만드는 중…"
            : record
              ? "다시 만들기"
              : photos.length
                ? "사진으로 광고 2안 만들기"
                : "이미지 2장 만들기"}
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
              제목·본문·브랜드 한 줄·날짜는 각 카드에서 바로 고칠 수 있어요.
            </p>
          </div>

          {(record.options as ImageOption[]).map((option, index) => (
            <ImageResultCard
              key={`${record.id}-${index}-${option.imageUrl}-${option.templateId}`}
              label={index === 0 ? "안 A" : "안 B"}
              imageUrl={option.imageUrl}
              initialHeadline={option.headline}
              initialBodyText={option.bodyText || option.subline || message}
              initialBrandCue={option.brandCue || profile.concept.slice(0, 18)}
              initialDateText={option.dateText ?? dateText}
              initialTemplate={option.templateId ?? (index === 0 ? "fade_bottom" : "cream_panel")}
              initialPalette={option.palette ?? "auto"}
              cafeName={option.cafeName || profile.name}
              cafeLocation={option.cafeLocation || profile.location}
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
