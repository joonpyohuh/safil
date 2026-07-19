# SAFIL — Tasks

## Current Phase
Phase 1 preparation: build the smallest usable MVP after validating the product structure.

## Rule
Work on one task at a time.
Do not start a Next task until the active task is completed and tested.

---

## NOW — Project Foundation

### Task 1. Inspect Existing Repository — DONE (2026-07-19)
- [x] Read PROJECT.md
- [x] Read PRODUCT_PRINCIPLES.md
- [x] Read MVP_SCOPE.md
- [x] Read DECISIONS.md
- [x] Inspect current repository structure
- [x] Summarize what already exists
- [x] Identify conflicts between current code and these documents
- [x] Write findings into HANDOFF.md

### Task 2. Propose Technical Architecture — DONE, confirmed (2026-07-19)
- [x] Propose folder structure (ARCHITECTURE.md §2)
- [x] Propose data model (ARCHITECTURE.md §3)
- [x] Propose auth and storage approach (ARCHITECTURE.md §1·§6)
- [x] Propose AI generation boundary (ARCHITECTURE.md §4)
- [x] List required environment variables (.env.example)
- [x] Identify security and privacy risks (ARCHITECTURE.md §6)
- [x] Demand research (RESEARCH.md)

### Task 3. Build Static Product Shell — DONE
- [x] Responsive app shell
- [x] Mobile navigation
- [x] Desktop navigation
- [x] Home dashboard
- [x] Empty recent-history section
- [x] Three primary creation actions
- [x] No real AI integration yet

### Task 4. Backend Implementation — DONE (2026-07-19)
- [x] SQLite + Drizzle schema and bootstrap (`src/lib/db`)
- [x] Café profile API (`GET/PUT /api/profile`)
- [x] Photo upload + serving (`POST /api/uploads`, `GET /api/files/[name]`)
- [x] Copy generation API — 3 options with reasons and hashtags
- [x] Image design-spec generation API — 2 options, original photo preserved
- [x] Notice generation API — 2 options
- [x] History API — list/filter, detail, select/copied/downloaded patch, delete
- [x] Sample mode when OPENAI_API_KEY is absent (`isSample: true`)
- [x] Build, lint, and production smoke tests passing

---

## NEXT — Core MVP (frontend wiring; backend is ready)

### Café Profile
- [ ] Build onboarding form
- [ ] Validate required fields
- [ ] Add image upload
- [x] Persist profile (backend)
- [ ] Add edit screen

### Promotional Copy
- [ ] Build purpose selection
- [ ] Build one-line input
- [ ] Build channel selection
- [ ] Define structured AI response schema
- [ ] Generate 3 copy options
- [ ] Show reason for each option
- [ ] Add copy action
- [ ] Save generation history

### Promotional Image
- [ ] Build photo upload
- [ ] Build purpose input
- [ ] Generate or compose 2 options
- [ ] Add editable text overlay
- [ ] Add download action
- [ ] Save generation history

### In-store Notice
- [ ] Add notice type selection
- [ ] Add editable information form
- [ ] Generate café-tone-aligned layout
- [ ] Add print preview
- [ ] Add image download
- [ ] Save generation history

### History
- [ ] List previous generations
- [ ] Filter by output type
- [ ] Open generation detail
- [ ] Reuse previous input
- [ ] Delete an item

---

## LATER
- [ ] Weekly marketing guide
- [ ] Naver Place checklist
- [ ] Transparent report
- [ ] Local event suggestions
- [ ] Billing
- [ ] Usage quota
- [ ] Pilot analytics

---

## Definition of Done
A task is complete only when:
- The implementation matches PROJECT.md and PRODUCT_PRINCIPLES.md
- TypeScript passes
- Lint passes
- Relevant tests pass
- Mobile layout is checked
- Empty, loading, error, and success states are handled
- HANDOFF.md is updated
- TASKS.md is updated
