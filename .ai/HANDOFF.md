# Latest handoff

## Request and result

Added manager drag ordering for Gantt projects and products (within a project), a task sort control for manual order, planned end, completion, start, status, and name; a light strike on completed task titles; and an assignee directory refresh every 30 seconds or when the window regains focus. Product assignees show name and email from active non-viewer database users.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
