# Hardware Workspace — AI and engineer handoff

Updated 4 November 2026. Repository: https://github.com/hardware-workspace/hardware-workspace.github.io. Production: https://hardware-workspace.github.io/. Local workspace: `D:\_Projects\hardware tool`.

## Current state and immediate issue

- The connected Supabase project is `xqhxjolkaqqxqblqvrwg`. Frontend configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key). Never use a service-role key in frontend code.
- Production shared workspace was replaced from the user-provided `hardware-tool-projects.json`. The resulting state was revision 7 with 15 project groups, 25 products, and 177 tasks. The earlier 175 production tasks were intentionally cleared. This is database state, separate from Git deployment.
- All 177 imported tasks lack start and due dates, have zero planned days, status backlog, and no assignee. The current published Gantt filters out undated tasks, so its empty message is misleading. Do not invent scheduling dates.
- The current `src/App.tsx` change includes undated tasks in the Gantt hierarchy, labels them “Unscheduled,” and lets users open them to set dates. It skips bars and dependency lines without dates. Gantt expansion now proceeds from project groups to products to task rows; the filter bar includes a product filter. `npm run build` passed.
- `hardware-tool-projects.json` and `production-clear-proof.png` are untracked local files. Review them before any bulk staging. The JSON is an import source, not an app bundle input.

## Application layout

- React 18, Vite 6, Tailwind CSS, and Lucide. `src/main.tsx` loads `src/AuthGate.tsx`, which loads `src/App.tsx` or the guarded `src/AdminPage.tsx`.
- `src/AuthGate.tsx` implements Supabase email/password signup, login, and password recovery. Signup offers Member and Manager without administrator approval. System administrator is assigned separately through trusted database administration.
- `src/App.tsx` includes Dashboard, Gantt, Kanban, Team, Settings, task/project editing, comments, dependencies, and undo. Account and notification settings are in `src/AccountSettings.tsx` and `src/EmailPreferences.tsx`.
- The UI's top-level “Projects” are `productLines` / `product_lines`. Nested `projects` records are UI “Products”; each task references a product with `project_id`. Preserve this mapping in imports.
- `src/sharedWorkspace.ts` reads and saves `productLines`, `projects`, `tasks`, `comments`, and `activityLog` through Supabase RPCs. It polls every three seconds and uses a revision check to reject concurrent overwrites. The UI reports save failures and conflicts. A displayed edit may be unsaved until the save succeeds.
- `supabase/migrations/202611040001_shared_workspace.sql` defines the private singleton JSON store and authenticated read/save RPCs. Server checks active membership, role, revision, basic record validity, and member edit scope.
- Local development has a demo manager/member login and a seeded 175-task dataset. It is separate from the production shared workspace; never use demo task counts as proof of production state.

## Scheduling and access rules

- Dates use the Cairo calendar. Friday and Saturday are off. Planned, actual, and blocked days are distinct.
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

Set the two `VITE_` variables locally; GitHub Actions uses repository variables for Pages. `README.md` describes the publish command. The user submits code on request. Review `git status`, stage only intended files, run checks, push to `main`, and verify Pages. Database imports and SQL deployments are separate from frontend publishing.

## Next work

1. Verify the published site lists all 177 undated tasks as unscheduled rows and that the staged expansion and product filter work.
2. Let the user supply dates, durations, and assignees intentionally. Do not fabricate a schedule from the import.
3. Verify live admin CRUD and email deployment independently. Older setup documents contain historical “not connected” statements.
