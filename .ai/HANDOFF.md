# Latest handoff

## Request and result

Latest request: admin rename showed "The account service is unavailable…". Verified the `admin-users` Edge Function IS deployed (returns its own 401 JSON). The message was a misleading fallback: `functions.invoke` hides non-2xx bodies in `error.context`. `src/AdminPage.tsx` now reads that body and shows the real reason (commit `c3e05ad`). Also fixed a stray Windows-1252 byte in the "Delete user…" button. Next step: get the real error text from the user; if it is the 403 "System administrator accounts…" guard, that is intentional server-side protection.

Before that: removed the "Rows 100% (Alt+Shift+Wheel)" hint from the Gantt controls bar (Alt+Shift+Wheel row zoom still works).

Before that: added text labels (Total, Done, In Progress, Blocked, Backlog, Overdue) beside each number in the compact header count pill in `src/App.tsx`.

Before that: added a compact single-row Gantt controls bar next to `Show Gantt controls` when the Gantt is in expanded / hidden-controls mode in `src/App.tsx` (Expand/Collapse All, Jump to Today, Week/Month/Quarter/Year period switch, Sort tasks, Dependencies toggle, and Zoom slider).

Earlier work: combined `Hide Gantt controls` and `Expand Gantt` into one toggle button on the top-left of the Gantt controls bar, removed the `Cairo · Weekend hours optional` badge from the top header, replaced the 6-card KPI strip with compact header numbers, and added the read-only 4-digit product number (`itemNumber`) to the `Edit product` modal.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
