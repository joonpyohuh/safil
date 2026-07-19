# SAFIL — Decision Log

This file is the source of truth for product and technical decisions.
Do not silently override a recorded decision.

## Status Legend
- Confirmed: use until explicitly changed
- Proposed: may change after review
- Open: requires a decision

---

## 2026-07-19

### Product Name
- Decision: Use **SAFIL** as the working name
- Status: Proposed
- Note: Naming and trademark validation are not complete

### Product Form
- Decision: Build a responsive web app first
- Status: Confirmed
- Reason: Faster pilot testing and no app store dependency

### Primary User
- Decision: Design first for independent café owners with low digital confidence
- Status: Confirmed

### Core Value
- Decision: Prioritize completed outputs over editing tools
- Status: Confirmed

### Publishing
- Decision: Do not auto-publish during MVP
- Status: Confirmed
- Reason: Preserve owner control and reduce platform/API complexity

### Initial Channels
- Decision: Support Instagram and Naver Place first
- Status: Confirmed

### Initial Technical Stack
- Decision:
  - Next.js
  - TypeScript
  - Tailwind CSS
  - Vercel
- Status: Confirmed

### Backend
- Decision: Supabase is the default candidate for auth, database, and file storage
- Status: Proposed
- Action required: Confirm before implementation

### Design Direction
- Decision:
  - Calm, trustworthy, and warm
  - More like a local brand partner than an AI dashboard
  - Avoid excessive gradients, neon AI visuals, dense analytics, and developer-oriented language
- Status: Confirmed

### MVP Output Types
- Decision:
  1. Promotional copy
  2. Promotional image
  3. In-store notice
- Status: Confirmed

### First Pilot
- Decision: 기투커피 로스터스 is the first pilot candidate
- Status: Confirmed

---

## 2026-07-19 (Architecture Confirmation)

### Demand Validation
- Decision: Proceed with MVP build. Desk research supports demand (market size ~95k cafés, marketing pain 17–39%, 83% digital-beginner owners, ad-spend gap vs franchises)
- Status: Confirmed
- Evidence: RESEARCH.md

### Pilot Database
- Decision: SQLite (better-sqlite3) + Drizzle ORM for the pilot phase, single file at `.data/safil.db`
- Status: Confirmed
- Reason: Zero external dependency, instant local dev, schema declared in Drizzle so migration to Supabase/Postgres is mechanical
- Supersedes: "Supabase as default candidate" is deferred to production deployment (see ARCHITECTURE.md §7)

### Backend Shape
- Decision: All backend as Next.js Route Handlers under `src/app/api/**`
- Status: Confirmed
- Reason: Simple client fetch, reusable for future mobile/native clients

### Auth for Pilot
- Decision: Single-café mode without authentication during pilot (기투커피)
- Status: Confirmed
- Reason: One pilot tenant; auth adds friction without validating the core loop. Multi-user requires Supabase Auth + owner_id scoping later

### AI Text Model
- Decision: OpenAI structured output (Zod-validated), model configurable via `OPENAI_MODEL` (default gpt-4o-mini)
- Status: Confirmed
- Note: Without `OPENAI_API_KEY`, the system runs in sample mode and every response is marked `isSample: true` so the UI stays honest

### Image Output Method
- Decision: Hybrid — original photo is preserved; AI generates a design spec (headline, palette, layout) and the client composes/downloads the overlay
- Status: Confirmed
- Reason: Guarantees MVP_SCOPE requirements (preserve photo, no misleading food edits, editable text) by construction

### Upload Storage
- Decision: Local `.data/uploads` + validated serving route (`/api/files/[name]`); Supabase Storage at production
- Status: Confirmed

---

## Open Decisions
- [ ] Confirm final name and domain
- [ ] Confirm Supabase timing for production deployment
- [ ] Select image generation/editing model for P1 (beyond template hybrid)
- [ ] Define pilot consent and data retention policy
- [ ] Define initial pricing only after pilot interviews
- [ ] Evaluate 스마트상점 SaaS형 등록 as distribution channel (see RESEARCH.md §4)
