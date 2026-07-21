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
- **Decision**: Text `gpt-5-mini` (`OPENAI_TEXT_MODEL`), image default `gpt-image-2` (`OPENAI_IMAGE_MODEL`, quality `medium`, WebP). Env override respected.
- **Status**: Confirmed (updated 2026-07-20)
- **Reason**: Owner asked for these models; medium quality for usable SNS output

### Photo-first promo images
- **Decision**: When owner uploads photos, use original photos as poster backgrounds (no image API). AI image generation only when no photos. Always return **3 mood variations** (`menu_hero` / `space_story` / `promo_clear`) with different template + `photoTreatment` (crop/filter), inspired by specialty café Instagram feeds (나무사이로·커피리브르). Facts in `message` render verbatim. PNG export only on save/share.
- **Status**: Confirmed (updated 2026-07-21)
- **Reason**: Two near-identical layout overlays felt weak; owners need distinct mood/use cases for feed vs promo

### Cafe research UX
- **Decision**: Place search prefers Kakao/Naver Local APIs; deep research is single-pass Responses+web_search JSON (no double LLM). UI shows stepped progress for search vs analyze.
- **Status**: Confirmed (2026-07-21)

### Café Place Search
- **Decision**: Place lookup uses Kakao/Naver Local APIs when keys exist; otherwise OpenAI Responses `web_search` with `gpt-4o-mini` (`OPENAI_SEARCH_MODEL`). Do **not** use `gpt-5-mini` for web_search (slow / asks clarifying questions).
- **Status**: Confirmed (2026-07-20)
- **Reason**: Search step was timing out and returning empty results with gpt-5-mini + web_search

### Quality Eval & Outcomes
- **Decision**: Golden dataset (`evals/golden`, 50–100 posts) with axis scores (brandFit, typography, photoAuthenticity, postability, specificity, toneMatch, noHype). Regression via `npm run eval:compare` against committed baselines. Product KPI is **`posted`**, not copy/download. Selected vs discarded options stored for preference learning.
- **Status**: Confirmed (2026-07-20)
- **Reason**: Prompt/model changes need same-data comparison; copy rate overstates success vs actual posting

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
