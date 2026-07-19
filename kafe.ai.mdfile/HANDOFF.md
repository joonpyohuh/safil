# SAFIL — Handoff

## Current Status (2026-07-19)
- 수요 리서치 완료 → RESEARCH.md
- 기술 아키텍처 확정 → ARCHITECTURE.md, DECISIONS.md(2026-07-19 Architecture Confirmation)
- 백엔드 전체 구현 완료 (프로필·업로드·생성 3종·히스토리), 빌드/린트/스모크 테스트 통과
- 다음 작업: **프론트엔드를 백엔드에 연결** (설정 화면 → 프로필 폼, 생성 3종 화면, 히스토리 목록)

## Required Reading Order
1. PROJECT.md
2. PRODUCT_PRINCIPLES.md
3. MVP_SCOPE.md
4. DECISIONS.md
5. ARCHITECTURE.md
6. TASKS.md
7. This file

## Repository Summary
- Framework: Next.js 16.2.10 (App Router, Turbopack)
- Language: TypeScript 5 (strict)
- Styling: Tailwind CSS 4 (브랜드 토큰: cream/ink/brand — `src/app/globals.css`)
- Database: SQLite (better-sqlite3) + Drizzle ORM, `.data/safil.db`, 부트스트랩 DDL 자동 실행
- Auth: 없음 — 파일럿 단일 매장 모드 (DECISIONS.md 참고)
- Storage: 로컬 `.data/uploads` + `/api/files/[name]` 서빙 (UUID 화이트리스트)
- AI: OpenAI Structured Output (Zod 검증), 키 없으면 샘플 모드(`isSample: true`)
- Deployment: 파일럿은 로컬/단일 서버. Vercel 배포 시 Supabase 전환 필수 (ARCHITECTURE.md §7)

## Existing Features
- UI 셸: 홈 대시보드, 모바일/데스크톱 내비, 생성 3종·설정·히스토리 페이지(플레이스홀더)
- API (전부 동작 확인됨):
  - `GET/PUT /api/profile` — 카페 프로필
  - `POST /api/uploads` — 사진 업로드 (jpeg/png/webp, 8MB 제한)
  - `GET /api/files/[name]` — 업로드 파일 서빙
  - `POST /api/generate/copy` — 홍보 문구 3안 (+이유, 해시태그)
  - `POST /api/generate/image` — 이미지 디자인 스펙 2안 (원본 사진 보존)
  - `POST /api/generate/notice` — 매장 안내물 2안
  - `GET /api/history`(?type=&limit=), `GET/PATCH/DELETE /api/history/[id]`
- 응답 규격: `{ ok: true, data }` / `{ ok: false, error: "쉬운 한국어 메시지" }`

## Important Files
- `src/lib/schemas.ts` — 모든 입력/출력 Zod 스키마의 단일 진실 (프론트에서 타입 재사용)
- `src/lib/db/` — Drizzle 스키마 + DB 부트스트랩
- `src/lib/ai/` — 프롬프트, 생성 함수, 샘플 모드
- `src/lib/profile.ts`, `src/lib/history.ts` — 저장 계층
- `src/app/api/**` — Route Handlers
- `.env.example` — 환경 변수 (OPENAI_API_KEY 없이도 샘플 모드로 전체 루프 동작)

## Conflicts or Risks
- SQLite는 Vercel 서버리스에서 비영속 → 배포 전 Supabase 전환 필요 (확정된 전환 경로 있음)
- 무인증 단일 매장 모드 → 공개 배포 금지, 파일럿 전용
- Windows PowerShell에서 curl 한글 body는 파일 기반(`--data-binary @file`)으로 테스트할 것
- 이미지 "디자인 스펙"의 클라이언트 렌더링(오버레이 합성·다운로드)은 프론트 작업으로 남아 있음

## Recommended Next Task
설정 화면을 카페 프로필 폼으로 교체 (`PUT /api/profile` 연결, 이미지 업로드 포함) → 이후 홍보 문구 생성 화면.

## Files Changed (this session)
- 신규: `src/lib/**`(schemas, db, ai, profile, history, api-helpers), `src/app/api/**` 9개 라우트, `.env.example`, RESEARCH.md, ARCHITECTURE.md
- 수정: `next.config.ts`(serverExternalPackages), `.gitignore`(.data, .env.example), DECISIONS.md, TASKS.md, HANDOFF.md
- 의존성 추가: better-sqlite3, drizzle-orm, zod, openai (+@types/better-sqlite3)

## Test Result
- `npx tsc --noEmit` 통과, `npm run build` 성공(15 라우트), `npm run lint` 통과
- 프로덕션 서버 스모크 테스트: 프로필 저장/조회, 문구·안내물 생성(샘플 모드), 업로드/서빙(200), 경로 조작 차단(400), PATCH 선택/복사 기록, 삭제 후 404 — 전부 정상
