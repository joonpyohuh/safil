# SAFIL — Handoff

## Current Status (2026-07-20)
**홍보 문구 + 홍보 이미지 루프가 `main`에 구현됨. 이미지 파이프라인 전면 개편.**

- Supabase + Vercel 연결 완료 (`safil` / `safil-uo56` env 모두 설정)
- Copy: `gpt-5-mini`
- Image: **배경만 AI 생성(글자 금지 프롬프트) + 한글은 클라이언트 캔버스 오버레이**
  - 한글 깨짐 원천 제거, 글자·위치·색 즉시 수정(재생성 불필요)
  - 비전(`gpt-5-mini`)이 사진 분위기 분석 → 제목·보조문구 자동 제안
  - 사진만 올리면 자동 생성 시작(원탭), 제목 선택사항
  - 클라이언트 압축(HEIC→JPEG, 1600px)으로 업로드 실패 해결
- Human Judge(40대 아이폰 사장님): **92/100 PASS** (1차 81 → 2차 92)
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
