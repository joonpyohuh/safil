# SAFIL — Handoff

## Current Status (2026-07-21)
**홍보 문구 + AI 신규 홍보 이미지 3안(인스타 무드 리서치) + 카페 딥리서치 + eval.**

- 이미지: 카페 인스타·리뷰 비주얼 조사 후 `gpt-image-2`로 **새로 그린** 3안
- 사장님 사진은 참고(비전·edit)만 — 원본을 그대로 배경으로 쓰지 않음
- 3안: 메뉴 클로즈업 / 공간·분위기 / 소식·안내
- 한글 본문은 포스터 레이어에 사실 그대로
- PNG는 저장/공유 시에만 렌더

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
| AI image | `gpt-image-2` (always, 3 stills) |
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
- `src/lib/ai/cafe-visual-research.ts` — Instagram/review visual mood
- `src/lib/ai/generate.ts` — AI-new 3 mood stills (+ optional photo edit ref)
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
