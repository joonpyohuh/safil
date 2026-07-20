import { handleRouteError, jsonError, jsonOk } from "@/lib/api-helpers";
import { deepResearchCafe, searchCafePlaces } from "@/lib/ai/cafe-research";
import { mobileMsg } from "@/lib/mobile-messages";
import {
  cafeResearchConfirmSchema,
  cafeResearchSearchSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { action: "search" | "confirm", ... } */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string;

    if (action === "search") {
      const input = cafeResearchSearchSchema.parse(body);
      const result = await searchCafePlaces(input.name, input.location);
      if (result.candidates.length === 0) {
        return jsonError("검색 결과가 없어요. 이름·위치를 다시 확인해 주세요.", 404);
      }
      return jsonOk({
        step: "confirm",
        candidates: result.candidates,
        message: "이 중에서 우리 카페가 맞는지 골라 주세요.",
      });
    }

    if (action === "confirm") {
      const input = cafeResearchConfirmSchema.parse(body);
      const deep = await deepResearchCafe(input);
      return jsonOk({
        step: "done",
        research: deep,
        message: "리뷰와 검색을 반영해 카페 정보를 정리했어요. 확인 후 저장해 주세요.",
      });
    }

    return jsonError(mobileMsg.invalidInput, 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
