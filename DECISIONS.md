# SAFIL — Decision Log

## Status Legend
- **Confirmed** — 변경 시 이 파일에 기록
- **Open** — 미결정

---

## 2026-07-19 — Supabase & Vercel

### Production Database
- **Decision**: Supabase Postgres replaces SQLite for all environments on Vercel
- **Status**: Confirmed
- **Reason**: Vercel serverless filesystem is ephemeral; SQLite is dev-only invalid on Vercel

### File Storage
- **Decision**: Supabase Storage bucket `uploads` (public read)
- **Status**: Confirmed

### Auth (Pilot)
- **Decision**: No auth; single café row (`cafe_profile.id = 1`); service role on server only
- **Status**: Confirmed
- **Risk**: Public API without auth — acceptable for private pilot URL only; add auth before public launch

### AI
- **Decision**: OpenAI structured output; sample mode when no `OPENAI_API_KEY`
- **Status**: Confirmed

### MVP Frontend Scope
- **Decision**: Promotional copy + promotional image loops shipped; notice UI deferred
- **Status**: Confirmed (updated 2026-07-20)

### AI Models
- **Decision**: Text `gpt-5-mini` (`OPENAI_TEXT_MODEL`), image `gpt-image-1` (`OPENAI_IMAGE_MODEL`, quality `medium`)
- **Status**: Confirmed (updated 2026-07-20)
- **Reason**: Owner asked for these models; medium quality for usable SNS output

### Image References
- **Decision**: Up to 6 reference photos via `photoPaths`; edit API when present, generate fallback with honest UX copy
- **Status**: Confirmed

### Documentation Layout
- **Decision**: Product docs at repo root; `docs/` for architecture/research; `CLAUDE.md` + `AGENTS.md` at root
- **Status**: Confirmed

---

## Open Decisions
- [ ] Add Supabase Auth + `owner_id` before public launch
- [ ] Rate limiting on `/api/generate/*`
- [ ] Pilot data retention policy
- [ ] Pricing after pilot interviews
