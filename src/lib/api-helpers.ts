import { NextResponse } from "next/server";
import { z } from "zod";
import { mobileMsg } from "@/lib/mobile-messages";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** 내부 오류 메시지는 노출하지 않고 짧은 한국어 메시지만 반환 */
export function handleRouteError(error: unknown) {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return jsonError(first?.message ?? mobileMsg.invalidInput, 400);
  }
  if (error instanceof SyntaxError) {
    return jsonError(mobileMsg.invalidJson, 400);
  }
  if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
    return jsonError(mobileMsg.dbNotReady, 503);
  }
  console.error("[safil api]", error);
  return jsonError(mobileMsg.serverError, 500);
}
