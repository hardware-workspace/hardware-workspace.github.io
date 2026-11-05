# Hardware Workspace — AI and engineer handoff

Updated 5 November 2026. Repository: https://github.com/hardware-workspace/hardware-workspace.github.io. Production: https://hardware-workspace.github.io/. Local workspace: `D:\_Projects\hardware tool`.

## Current production state

- The connected Supabase project is `xqhxjolkaqqxqblqvrwg`. Frontend configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key). Never use a service-role key in frontend code.
- Production shared workspace was replaced from the user-provided `hardware-tool-projects.json`: 15 project groups, 25 products, and 177 tasks. The earlier 175 production tasks were intentionally cleared. This is database state, separate from Git deployment.
- All 177 imported tasks lack start and due dates, have zero planned days, status backlog, and no assignee. The published Gantt now shows them as unscheduled rows. Do not invent scheduling dates.
- The Gantt includes undated tasks as “Unscheduled” rows. It opens on the current Cairo month, shows month bands, and defaults to projects and products with task rows collapsed. Expand and collapse work in stages. The filters include project, product, assignee, and criticality. Right-click opens task details or, for managers, project editing.
- Managers can also right-click a product row to edit its name and description. The task panel can collapse dependency controls or disable dependencies per task; disabling preserves links but pauses their date adjustments and Gantt wires. Task scheduling uses 8.5 hours per regular day, plus optional per-task extra weekday hours and Friday/Saturday hours; these are stored with each task in the shared JSON workspace. Existing tasks keep their dates until edited.
- The horizontal scrollbar is under the timeline, leaving the sticky task column outside it. Task notes, title, blocked reason, and weight commit when editing finishes instead of recording each keystroke. The task panel closes only when a pointer press and release both occur on its backdrop. Audit display uses member names for assignee IDs and groups nearby changes to the same field.
- `hardware-tool-projects.json` and `production-clear-proof.png` are untracked local files. Review them before any bulk staging. The JSON is an import source, not an app bundle input.

## Application layout

- React 18, Vite 6, Tailwind CSS, and Lucide. `src/main.tsx` loads `src/AuthGate.tsx`, which loads `src/App.tsx` or the guarded `src/AdminPage.tsx`.
- `src/AuthGate.tsx` implements Supabase email/password signup, login, and password recovery. Signup offers Member and Manager without administrator approval. System administrator is assigned separately through trusted database administration.
- `src/App.tsx` includes Dashboard, Gantt, Kanban, Team, Settings, task/project editing, comments, dependencies, and undo. Account and notification settings are in `src/AccountSettings.tsx` and `src/EmailPreferences.tsx`.
- The UI's top-level “Projects” are `productLines` / `product_lines`. Nested `projects` records are UI “Products”; each task references a product with `project_id`. Preserve this mapping in imports.
- `src/sharedWorkspace.ts` reads and saves `productLines`, `projects`, `tasks`, `comments`, and `activityLog` through Supabase RPCs. It polls every three seconds and uses a revision check to reject concurrent overwrites. The UI reports save failures and conflicts. A displayed edit may be unsaved until the save succeeds.
- `supabase/migrations/202611040001_shared_workspace.sql` defines the private singleton JSON store and authenticated read/save RPCs. Server checks active membership, role, revision, basic record validity, and member edit scope.
- Local development has a demo manager/member login and a seeded 175-task dataset. It is separate from the production shared workspace; never use demo task counts as proof of production state.

## Production save repair

On 4 November 2026, task saves returned HTTP 400 / PostgreSQL 21000 because the project enforces safe updates and `save_shared_workspace` updated the singleton table without a WHERE clause. `supabase/migrations/202611040002_shared_workspace_safe_update.sql` adds `where singleton = true` to the function. The equivalent change was applied in the Supabase SQL Editor. A temporary task was created, saved, deleted, and the task count returned to 177. The test revision was restored to 7 to preserve compatibility with a browser tab holding earlier unsaved edits. The app now displays the underlying save error and waits 900 ms between edits.

The user's original browser tab may still contain edits that failed before the repair. **Do not refresh or discard that tab before clicking “Retry save.”** Its successful retry has not been independently verified. If it reports a revision conflict, preserve the visible edits and resolve the conflict before reloading.

Frontend changes and this migration were pushed to `main` through commit `306fbbd`; the final GitHub Pages deployment completed successfully. Local build, authentication checks, and CSV security checks passed. The temporary production save test was verified after reload.

## Scheduling and access rules

- Dates use the Cairo calendar. Friday and Saturday remain off by default; task-level hours can schedule work on either day. Planned, actual, and blocked days are distinct.
- The Gantt has period/zoom controls, task bars, dependencies, and a daily weight view. Undated tasks need explicit dates before they can appear as bars or contribute to scheduled daily weight.
- Priority P1–P4 is separate from criticality. Task weight is 1–10, with 10 as one person's daily capacity.
- `src/accountAccess.js` checks verified user/profile and system administrator privileges. The admin UI alone is not the security boundary; server functions must authorize privileged calls.
- Admin user CRUD code is in `supabase/functions/admin-users` with migration `202611020001_admin_user_crud.sql`. See `supabase/ADMIN_USERS_SETUP.md` for deployment and verification.
- Email queue/worker code is in `supabase/functions/send-task-emails` with migrations `202611020002_task_emails.sql` and `202611020003_brevo_retry_window.sql`. Brevo was selected, but delivery is not confirmed active. See `supabase/TASK_EMAIL_SETUP.md`; do not claim email delivery without configured sender, secrets, schedule, and an inbox test.

## Run and publish

```sh
npm ci
copy .env.example .env.local
npm run dev
npm run build
npm run test:auth
npm run publish:check
```

Set the two `VITE_` variables locally; GitHub Actions uses repository variables for Pages. `AGENTS.md` is the short operating guide and `README.md` has release commands. Requested edits now go to production by default unless the user says local-only. The publisher stages tracked files only; stage new source files explicitly and never stage the untracked import JSON or proof image. Pages verifies the live build commit after deployment. Versioned Supabase migrations have guarded status/plan/deploy commands and a manually dispatched workflow. Automatic migration deployment is gated behind AUTO_DEPLOY_DB=true, HARDWARE_DB_BASELINE_VERIFIED=<project ref>, and a protected Actions token; direct SQL Editor changes may be absent from migration history, so reconcile the baseline before enabling it. Database data imports remain separate.

## Next work

1. Confirm the earlier unsaved browser edits have been retried and persisted. Avoid overwriting them from another tab in the meantime.
2. Let the user supply dates, durations, and assignees intentionally. Do not fabricate a schedule from the import.
3. Verify live admin CRUD and email deployment independently. Older setup documents contain historical “not connected” statements.
