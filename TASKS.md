# SAFIL — Tasks

## Current Phase
**Phase 2 — First complete user loop (copy)**

## DONE

### Foundation
- [x] Supabase data layer (profile, generations, storage uploads)
- [x] SQLite removed
- [x] Docs moved to repo root + `docs/`
- [x] `CLAUDE.md`, `AGENTS.md` at root
- [x] API errors: no internal message leak (`api-helpers.ts`)

### Café Profile
- [x] Settings screen → `GET/PUT /api/profile`
- [x] Home profile registration banner when name/location missing

### Promotional Copy Loop
- [x] Copy generation page (`CopyGenerator`)
- [x] Purpose, message, channel input
- [x] `POST /api/generate/copy` → 3 options + reasons
- [x] Select + copy → `PATCH /api/history/[id]`
- [x] Home recent copy generations

## NEXT

### Promotional Image (frontend)
- [ ] Build image creation UI
- [ ] Connect `POST /api/generate/image`

### In-store Notice (frontend)
- [ ] Build notice creation UI
- [ ] Connect `POST /api/generate/notice`

### History Page
- [ ] List and filter generations UI

### Production Hardening
- [ ] Supabase Auth
- [ ] Rate limits on generate APIs

## NOT IN SCOPE NOW
- Auto-posting, billing, multi-location

## Definition of Done
- Matches PROJECT.md / PRODUCT_PRINCIPLES.md
- tsc, lint, build pass
- Mobile checked
- HANDOFF.md updated
