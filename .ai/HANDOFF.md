# Latest handoff

## Request and result

Latest request: added a compact single-row Gantt controls bar next to `Show Gantt controls` when the Gantt is in expanded / hidden-controls mode in `src/App.tsx` (Expand/Collapse All, Jump to Today, Week/Month/Quarter/Year period switch, Sort tasks, Dependencies toggle, and Zoom slider).

Earlier work: combined `Hide Gantt controls` and `Expand Gantt` into one toggle button on the top-left of the Gantt controls bar, removed the `Cairo · Weekend hours optional` badge from the top header, replaced the 6-card KPI strip with compact header numbers, and added the read-only 4-digit product number (`itemNumber`) to the `Edit product` modal.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
