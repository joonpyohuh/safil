import OpenAI from "openai";

export const AI_TEXT_TIMEOUT_MS = 18_000;
export const AI_IMAGE_TIMEOUT_MS = 55_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5-mini";
}

/** 장소 검색·웹 리서치용 (gpt-5-mini + web_search 는 느리거나 되묻기만 함) */
export function getSearchModel(): string {
  return process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-4o-mini";
}

/** 이미지 모델 — 사진 없을 때만 사용. env 우선 */
export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
}

/** @deprecated use getTextModel */
export function getModel(): string {
  return getTextModel();
}

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
