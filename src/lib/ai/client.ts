import OpenAI from "openai";

export const AI_TEXT_TIMEOUT_MS = 18_000;
export const AI_IMAGE_TIMEOUT_MS = 55_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5-mini";
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
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
