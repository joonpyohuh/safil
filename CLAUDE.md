# SAFIL — Claude Code Project Memory

카페 사장님용 AI 홍보 결과물 생성 앱. **Output First** — 사장님이 도구를 배우지 않고 완성된 결과물을 받는 것이 목표.

## 필수 읽기 (작업 전)

1. @PROJECT.md — 제품 정의, 타겟, 핵심 루프
2. @PRODUCT_PRINCIPLES.md — UX·신뢰 원칙
3. @MVP_SCOPE.md — P0/P1/P2 범위
4. @DECISIONS.md — 확정된 기술·제품 결정
5. @TASKS.md — 현재 작업 단계
6. @HANDOFF.md — 최신 구현 상태

## 기술·아키텍처

- @docs/ARCHITECTURE.md — Supabase + Next.js Route Handlers
- @docs/supabase-schema.sql — DB 스키마 (Supabase SQL Editor에서 실행)
- @docs/RESEARCH.md — 수요 리서치

## 현재 MVP 범위 (2026-07-19)

**완성된 루프:** 카페 프로필 → 홍보 문구 생성 → 선택·복사 → 히스토리

**아직 플레이스홀더:** 홍보 이미지, 매장 안내물 프런트엔드

## 스택

- Next.js 16 App Router, TypeScript, Tailwind CSS 4
- **Supabase** (Postgres + Storage) — Vercel 배포용 영속 저장소
- OpenAI Structured Output (키 없으면 샘플 모드, `isSample: true`)
- 파일럿: 무인증 단일 매장 모드

## 환경 변수

`.env.example` 참고. Vercel 배포 시 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 필수.

## 코딩 규칙

- UI는 쉬운 한국어, 마케팅 전문 용어 지양
- API 에러는 `src/lib/mobile-messages.ts`의 짧은 메시지만 사용자에게 노출
- 내부 오류 스택/메시지는 `console.error`만, 클라이언트에는 `mobileMsg.serverError`
- 한 번에 TASKS.md의 활성 Task 하나만
