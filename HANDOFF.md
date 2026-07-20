# SAFIL — Handoff

## Current Status (2026-07-20)
**홍보 문구 + 이미지 + 카페 딥리서치/분위기 정렬 루프.**

- Supabase + Vercel (`safil` / `safil-uo56`)
- 설정: 카페 이름 검색(네이버·구글 web_search) → “이 카페가 맞나요?” → 리뷰 요약 → 컨셉·분위기 저장
- 생성: 프로필 분위기 + 최근 히스토리 컨텍스트로 문구/이미지 정렬
- Image: HTML→PNG 포스터, 갤러리 저장(모바일 공유 시트)
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
- `src/components/create/image-generator.tsx` — 원탭 업로드→자동 생성
- `src/components/create/image-result-card.tsx` — 캔버스 한글 오버레이·즉시 편집·공유
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
