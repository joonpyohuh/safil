# SAFIL — Handoff

## Current Status (2026-07-21)
**홍보 문구 + 인스타 무드 3안 이미지 + 빠른 카페 딥리서치 + 품질 eval.**

- 이미지: 사진 있으면 원본+무드별 3안(이미지 API 없음), 없으면 `gpt-image-2` 배경 1장
- 3안: 메뉴 클로즈업 / 공간·분위기 / 소식·안내 — 템플릿·필터·크롭·용도 라벨이 다름
- 카페 찾기: Kakao/Naver 우선 → 단일 패스 딥리서치, Toss식 진행 UX
- 포스터: Noto Sans/Serif KR, 8종 레이아웃, 사실 본문 그대로
- PNG는 저장/공유 시에만 렌더
- Eval: `evals/` 골든셋, KPI=`posted`

## Active Task
In-store notice frontend (see TASKS.md NEXT)

## Stack
| Area | Choice |
|------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind 4 + Toss-like motion tokens |
| DB | Supabase Postgres |
| Storage | Supabase Storage (`uploads`) |
| AI text | `gpt-5-mini` |
| AI search | `gpt-4o-mini` + web_search |
| AI image | `gpt-image-2` (no-photo only) |
| Deploy | Vercel |

## Env (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5-mini
OPENAI_SEARCH_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-2
KAKAO_REST_API_KEY=   # optional, faster place search
NAVER_CLIENT_ID=      # optional
NAVER_CLIENT_SECRET=
```

## Key Files
- `src/lib/ai/cafe-research.ts` — place search + single-pass deep research
- `src/lib/ai/generate.ts` — IG-style 3 mood image variations
- `src/components/create/promo-poster.tsx` — photoTreatment filters/crops
- `src/components/create/image-generator.tsx` / `image-result-card.tsx`
- `src/components/settings/profile-form.tsx` — research progress UX
- `src/app/globals.css` — toss-rise / toss-press / research shimmer

## API Routes
| Route | Status |
|-------|--------|
| GET/PUT `/api/profile` | ✅ |
| POST `/api/profile/research` | ✅ |
| POST `/api/generate/copy` | ✅ |
| POST `/api/generate/image` | ✅ 3 options |
| PATCH `/api/history/[id]` | ✅ |
| POST `/api/generate/notice` | API only |

## Risks
- No auth — pilot URL only
- No-photo image gen can take 20–40s; Vercel `maxDuration=60`
- RLS disabled on cafe_profile/generations for pilot
