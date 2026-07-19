# SAFIL — Confirmed Architecture (2026-07-19, Supabase)

## 1. 전체 구조

```
[모바일 퍼스트 UI]
        │ fetch JSON
        ▼
[Next.js Route Handlers /api/*]
        │
        ▼
[Supabase Postgres]  +  [Supabase Storage bucket: uploads]
        │
        ▼
[OpenAI Structured Output]  (키 없으면 샘플 모드)
```

- **배포**: Vercel (서버리스). **SQLite 사용 불가** — 비영속.
- **DB**: Supabase Postgres. 스키마: `docs/supabase-schema.sql`
- **Storage**: Supabase Storage `uploads` 버킷 (public)
- **인증**: 파일럿 단일 매장, 무인증. 서버는 `SUPABASE_SERVICE_ROLE_KEY`만 사용.
- **AI**: OpenAI + Zod. `OPENAI_API_KEY` 없으면 `isSample: true`.

## 2. 폴더

```
src/
├── app/api/          # profile, generate/*, history, uploads, files
├── components/
│   ├── settings/profile-form.tsx
│   └── create/copy-generator.tsx   # 홍보 문구 전용 (MVP 루프)
└── lib/
    ├── supabase/server.ts
    ├── profile.ts, history.ts      # async Supabase
    ├── mobile-messages.ts
    └── api-helpers.ts
docs/
├── ARCHITECTURE.md (this file)
├── RESEARCH.md
└── supabase-schema.sql
```

## 3. 환경 변수

| 변수 | 필수 (Vercel) | 설명 |
|------|---------------|------|
| NEXT_PUBLIC_SUPABASE_URL | 예 | Supabase 프로젝트 URL |
| SUPABASE_SERVICE_ROLE_KEY | 예 | 서버 전용 (클라이언트 노출 금지) |
| OPENAI_API_KEY | 아니오 | 없으면 샘플 모드 |

## 4. MVP 완성 루프 (copy)

1. `GET/PUT /api/profile` — 카페 프로필
2. 홈 — 프로필 미등록 시 `/settings` 안내
3. `POST /api/generate/copy` — 문구 3안
4. 선택 · 복사 → `PATCH /api/history/[id]`
5. 홈 — `listGenerations({ type: 'copy' })` 최근 3건

## 5. 미구현 (의도적)

- 홍보 이미지·매장 안내물 **프런트엔드** (API는 존재)
- 인증·다중 매장
