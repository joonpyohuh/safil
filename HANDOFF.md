# SAFIL — Handoff

## Current Status (2026-07-20)
**홍보 문구 + 홍보 이미지 루프가 `main`에 구현됨.**

- Supabase + Vercel 연결 완료 (`safil` / `safil-uo56` env 모두 설정)
- Copy: `gpt-5-mini`
- Image: `gpt-image-1` (quality medium, 참고사진 최대 6장, 2장 병렬)
- 30대 사장님 Human Judge: **90/100 PASS**
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
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Key Files
- `src/components/create/copy-generator.tsx`
- `src/components/create/image-generator.tsx`
- `src/lib/ai/generate.ts` — copy + gpt-image-1
- `src/lib/storage.ts` — generated image upload
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
