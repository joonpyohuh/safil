# SAFIL — Handoff

## Current Status (2026-07-19)
**First complete user loop (홍보 문구) implemented on `main`.**

- Supabase replaces SQLite (Vercel-ready)
- Profile settings + home banner + copy generation + history reuse
- Three-round Human Judge loop passed: 90 / 90 / 91
- Image/notice frontends remain placeholders

## Active Task
Promotional image frontend (see TASKS.md NEXT)

## Stack
| Area | Choice |
|------|--------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind 4 (cream/ink/brand tokens) |
| DB | Supabase Postgres |
| Storage | Supabase Storage (`uploads`) |
| AI | OpenAI (sample mode without key) |
| Deploy | Vercel |

## Env (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=          # optional
OPENAI_TEXT_MODEL=gpt-5-mini
OPENAI_IMAGE_MODEL=gpt-image-1
```

Run `docs/supabase-schema.sql` in Supabase SQL Editor before first use.

## Key Files
- `src/components/settings/profile-form.tsx` — profile CRUD UI
- `src/components/create/copy-generator.tsx` — copy loop UI
- `src/lib/supabase/server.ts` — Supabase client
- `src/lib/profile.ts`, `src/lib/history.ts` — data layer
- `src/lib/mobile-messages.ts` — user-facing API messages

## API Routes
| Route | Status |
|-------|--------|
| GET/PUT `/api/profile` | ✅ wired to UI |
| POST `/api/generate/copy` | ✅ wired to UI |
| PATCH `/api/history/[id]` | ✅ select/copy |
| POST `/api/generate/image` | API only |
| POST `/api/generate/notice` | API only |

## Test Result
- 2026-07-19: `npx tsc --noEmit`, `npm run lint`, `npm run build` passed
- Human Judge report: `docs/HUMAN_JUDGE.md`

## Risks
- No auth — pilot URL should not be publicized widely
- Supabase env required on Vercel for persistence
- Without Supabase locally, profile/history reads return empty; writes return 503
- Client timeout can still complete server-side and create a duplicate generation on retry
- Real-device iPhone/VoiceOver and low-end Android checks remain
