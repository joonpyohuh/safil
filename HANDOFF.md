# SAFIL — Handoff

## Current Status (2026-07-20)
**홍보 문구 + 사진 우선 광고형 이미지 + 카페 딥리서치 + 품질 eval.**

- 이미지: 사진 있으면 원본+레이아웃 2안(이미지 API 없음), 없으면 `gpt-image-2` 배경 1장
- 포스터: Noto Sans/Serif KR, 8종 광고 레이아웃, 카페명·위치 락업, 사실 본문 그대로
- PNG는 저장/공유 시에만 렌더
- Eval: `evals/` 골든셋, KPI=`posted`

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
OPENAI_IMAGE_MODEL=gpt-image-2
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
