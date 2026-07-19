import OpenAI from "openai";

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getTextModel(): string {
  return process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini";
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
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
