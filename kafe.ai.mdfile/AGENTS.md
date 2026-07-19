# SAFIL — Agent Operating Rules

These rules apply to Claude Code, Cursor, Codex, and any other coding agent working in this repository.

## 1. Source of Truth
Before any work, read:
1. PROJECT.md
2. PRODUCT_PRINCIPLES.md
3. MVP_SCOPE.md
4. DECISIONS.md
5. TASKS.md
6. HANDOFF.md

If code conflicts with these documents, do not guess.
Report the conflict before changing the implementation.

## 2. One Task at a Time
Only work on the task marked active in HANDOFF.md.

Do not:
- Add unrelated features
- Refactor unrelated code
- Change the visual system without request
- Introduce a library for convenience alone
- Start P1 or P2 work

## 3. Plan Before Editing
For any task affecting multiple files:
1. Inspect relevant files
2. Explain the proposed change
3. List files to modify
4. Identify risks
5. Then implement

For a small one-file fix, a short plan is sufficient.

## 4. Protect Product Intent
SAFIL is for café owners with low digital confidence.

Avoid:
- Technical jargon in UI
- Excessive configuration
- Dense dashboards
- Prompt-like input experiences
- Generic AI chatbot interfaces
- Requiring the owner to understand marketing terminology

Prefer:
- Plain Korean
- One clear action
- Strong defaults
- Completed outputs
- Optional explanation
- Visible trust and control

## 5. Verification Checklist
Before declaring a task done:
- Does it solve the active user problem?
- Is the primary action obvious?
- Can a first-time user complete it without explanation?
- Are loading, error, empty, and success states covered?
- Does it work on mobile?
- Does TypeScript pass?
- Does lint pass?
- Did the implementation avoid unsupported claims?
- Can the result be shown honestly to a café owner?

## 6. Documentation Update
After implementation:
- Mark completed items in TASKS.md
- Update HANDOFF.md
- Add meaningful decisions to DECISIONS.md
- List files changed
- Record tests run and results
- Record unresolved risks

## 7. Agent Roles

### Claude Code
Primary architect and integration owner.
Use for:
- Repository-wide inspection
- Architecture
- Multi-file implementation
- Refactoring
- Final integration
- Test execution

### Cursor
Focused implementation partner.
Use for:
- One component
- One bug
- Local UI refinement
- Type errors
- Small refactors

### Codex
Independent reviewer.
Use for:
- Code review
- Edge cases
- Security review
- Test cases
- Architecture criticism

Codex should produce review findings before rewriting code.

### v0
UI concept and component draft generator.
Use for:
- Layout concepts
- Static screens
- Component visual direction

v0 output is a draft.
Claude Code must adapt it to the current repository and product rules.

## 8. No Silent Assumptions
When information is missing:
- Add an Open item to DECISIONS.md
- Use the least irreversible implementation
- Avoid hard-coding business assumptions
