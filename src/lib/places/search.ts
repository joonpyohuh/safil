export type CafePlaceCandidate = {
  placeName: string;
  placeAddress: string;
  placeUrl: string;
  whyMatch: string;
};

type KakaoDocument = {
  place_name?: string;
  road_address_name?: string;
  address_name?: string;
  place_url?: string;
  category_name?: string;
};

type NaverItem = {
  title?: string;
  address?: string;
  roadAddress?: string;
  link?: string;
  category?: string;
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

/** 카카오 로컬 키워드 검색 (KAKAO_REST_API_KEY) */
export async function searchKakaoPlaces(
  name: string,
  location: string,
): Promise<CafePlaceCandidate[]> {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return [];

  const query = `${name} ${location}`.trim();
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");
  // CE7 = 카페
  url.searchParams.set("category_group_code", "CE7");

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    // 카페 카테고리로 안 나오면 전체 재검색
    url.searchParams.delete("category_group_code");
    const retry = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!retry.ok) {
      console.error("[safil kakao search]", retry.status, await retry.text());
      return [];
    }
    const data = (await retry.json()) as { documents?: KakaoDocument[] };
    return mapKakao(data.documents ?? [], name);
  }

  const data = (await res.json()) as { documents?: KakaoDocument[] };
  const mapped = mapKakao(data.documents ?? [], name);
  if (mapped.length > 0) return mapped;

  url.searchParams.delete("category_group_code");
  const retry = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!retry.ok) return [];
  const data2 = (await retry.json()) as { documents?: KakaoDocument[] };
  return mapKakao(data2.documents ?? [], name);
}

function mapKakao(docs: KakaoDocument[], name: string): CafePlaceCandidate[] {
  return docs.slice(0, 5).map((d) => ({
    placeName: d.place_name ?? name,
    placeAddress: d.road_address_name || d.address_name || "",
    placeUrl: d.place_url ?? "",
    whyMatch: d.category_name
      ? `카카오맵 · ${d.category_name}`
      : "카카오맵 검색 결과",
  }));
}

/** 네이버 지역 검색 (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET) */
export async function searchNaverPlaces(
  name: string,
  location: string,
): Promise<CafePlaceCandidate[]> {
  const id = process.env.NAVER_CLIENT_ID?.trim();
  const secret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!id || !secret) return [];

  const query = `${name} ${location}`.trim();
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "comment");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": id,
      "X-Naver-Client-Secret": secret,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    console.error("[safil naver search]", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as { items?: NaverItem[] };
  return (data.items ?? []).slice(0, 5).map((item) => ({
    placeName: stripHtml(item.title ?? name),
    placeAddress: item.roadAddress || item.address || "",
    placeUrl: item.link ?? "",
    whyMatch: item.category
      ? `네이버 · ${stripHtml(item.category)}`
      : "네이버 지역 검색 결과",
  }));
}
