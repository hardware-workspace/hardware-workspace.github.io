# Latest handoff

## Request and result

Latest request: replaced the 6-card KPI strip above the Gantt/Kanban views with a compact numbers-only pill in the top header bar in `src/App.tsx` (preserving status color-coding, tooltips, and click-to-filter).

Earlier work: added the read-only 4-digit product number (`itemNumber`) to the `Edit product` modal in `src/App.tsx`, replaced the Gantt column width lock text button with `Lock` / `Unlock` icons, made the Backlog → In Progress kickoff note optional, and added manager drag ordering for Gantt projects and products.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
