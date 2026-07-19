import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Maps thrown errors to a user-safe Korean message. */
export function handleRouteError(error: unknown) {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return jsonError(first?.message ?? "입력값을 확인해 주세요.", 400);
  }
  if (error instanceof SyntaxError) {
    return jsonError("요청 형식이 올바르지 않습니다.", 400);
  }
  console.error("[safil api]", error);
  const message =
    error instanceof Error && error.message.length < 200
      ? error.message
      : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  return jsonError(message, 500);
}
