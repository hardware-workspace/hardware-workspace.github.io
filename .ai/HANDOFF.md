# Latest handoff

## Request and result

Latest request: combined the `Hide Gantt controls` and `Expand Gantt` buttons into a single toggle button placed at the top-left of the Gantt controls bar, and removed the `Cairo · Weekend hours optional` pill from the top header in `src/App.tsx`.

Earlier work: replaced the 6-card KPI strip above the Gantt/Kanban views with a compact numbers-only pill in the top header bar, added the read-only 4-digit product number (`itemNumber`) to the `Edit product` modal, replaced the Gantt column width lock text button with `Lock` / `Unlock` icons, and made the Backlog → In Progress kickoff note optional.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
