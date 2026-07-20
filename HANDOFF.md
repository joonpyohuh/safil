# SAFIL — Handoff

## Current Status (2026-07-20)
**홍보 문구 + 이미지 + 카페 딥리서치/분위기 정렬 + 품질 eval 루프.**

- Supabase + Vercel (`safil` / `safil-uo56`)
- 설정: 카페 찾기(카카오/네이버 로컬 API 또는 `gpt-4o-mini` web_search) → “이 카페가 맞나요?” → 리뷰 요약 → 컨셉·분위기 저장
- 생성: 프로필 분위기 + 브랜드 시각 브리프(`brand-visual`) + 선택/폐기/게시 컨텍스트로 문구/이미지 정렬
- Image: HTML→PNG 포스터, 갤러리 저장(모바일 공유 시트)
- Eval: `evals/` 골든셋 72건, `npm run eval:compare` 회귀, KPI=`posted`
- Notice frontend는 placeholder

## Active Task
In-store notice frontend (see TASKS.md NEXT)

## Stack
| Area | Choice |
|------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind 4 (cream/ink/brand tokens) |
| DB | Supabase Postgres |
| Storage | Supabase Storage (`uploads`) |
| AI text | `gpt-5-mini` |
| AI image | `gpt-image-1` |
| Deploy | Vercel |

## Env (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # optional but preferred
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5-mini
OPENAI_SEARCH_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
KAKAO_REST_API_KEY=          # optional, faster place search
NAVER_CLIENT_ID=             # optional
NAVER_CLIENT_SECRET=         # optional
```

## Key Files
- `evals/README.md` — golden / regression / posted KPI
- `src/lib/eval/` — rubrics, judge, preference learning
- `src/components/history/mark-posted-button.tsx` — 「실제로 올렸어요」
- `src/components/create/copy-generator.tsx`
- `src/components/create/image-generator.tsx`
- `src/components/create/image-result-card.tsx` — HTML→PNG·갤러리 저장
- `src/lib/client/compress-image.ts` — HEIC/대용량 클라이언트 압축
- `src/lib/ai/generate.ts` — 비전 기획(planImage) + 배경 생성
- `src/lib/storage.ts` — Supabase Storage + publicUploadUrl
- `src/lib/supabase/server.ts`

## API Routes
| Route | Status |
|-------|--------|
| GET/PUT `/api/profile` | ✅ |
| POST `/api/generate/copy` | ✅ |
| POST `/api/generate/image` | ✅ UI connected |
| PATCH `/api/history/[id]` | ✅ |
| POST `/api/generate/notice` | API only |

## Risks
- No auth — pilot URL only
- Image generation can take 20–40s; Vercel `maxDuration=60`
- RLS disabled on cafe_profile/generations for pilot
