# SAFIL — Agent Operating Rules

Cursor, Claude Code, Codex 등 모든 코딩 에이전트에 적용.

## 1. Source of Truth

작업 전 읽기:

1. `PROJECT.md`
2. `PRODUCT_PRINCIPLES.md`
3. `MVP_SCOPE.md`
4. `DECISIONS.md`
5. `TASKS.md`
6. `HANDOFF.md`

코드와 문서가 충돌하면 추측하지 말고 충돌을 보고한 뒤 진행.

## 2. One Task at a Time

`HANDOFF.md`의 Active Task만 작업. P1/P2, 무관한 리팩터링 금지.

## 3. Product Intent

- 대상: 디지털 자신감 낮은 독립 카페 사장님
- UI: 쉬운 한국어, 한 가지 명확한 행동, 완성된 결과물
- 금지: 과장·보장성 문구, 자동 게시, 전문 용어 나열

## 4. Tech Constraints

- DB/Storage: **Supabase** (SQLite·로컬 `.data` 사용 금지 — Vercel 비영속)
- AI: 서버 전용, `OPENAI_API_KEY` 없으면 샘플 모드
- API 에러: `src/lib/api-helpers.ts` — 내부 메시지 노출 금지

## 5. Documentation

구현 후 `TASKS.md`, `HANDOFF.md`, 의미 있는 결정은 `DECISIONS.md` 갱신.

## 6. Verification

- TypeScript, lint, build 통과
- 모바일 레이아웃 확인
- empty / loading / error / success 상태

## 7. Agent Roles

- **Claude Code**: 아키텍처, 다파일 통합 (`CLAUDE.md` 참고)
- **Cursor**: 단일 컴포넌트·버그 (`AGENTS.md` = 이 파일)
- **Codex**: 리뷰 전용

## 8. Architecture Docs

- `docs/ARCHITECTURE.md`
- `docs/RESEARCH.md`
- `docs/supabase-schema.sql`
