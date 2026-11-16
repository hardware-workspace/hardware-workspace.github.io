# Current verified state

- Repository: `https://github.com/hardware-workspace/hardware-workspace.github.io`; production frontend: `https://hardware-workspace.github.io/`.
- Working branch: `main`. Check `git log -1` for the latest published commit.
- Frontend: React/Vite; GitHub Pages builds on non-Markdown pushes to `main`. Backend: existing Supabase project `xqhxjolkaqqxqblqvrwg`; shared workspace uses authenticated RPCs. No backend configuration or production data was changed by the AI portability setup.
- The detailed handoff guide predates recent Gantt releases; use current code and Git history for those features. Existing release and migration guards remain in place.
- Known deployment constraint: earlier SQL Editor changes may not appear in Supabase migration history. Reconcile before any database workflow deployment.
- Gantt project and product rows support manager drag ordering; task rows can be sorted locally by date, status, or name. The eligible assignee directory refreshes while the app is open.
- The Gantt controls show a live Cairo clock with large 12-hour hh:mm:ss AM/PM time above a smaller DD/MM/YYYY date.
- The Tools scientific calculator offers Classic, Explorer, and Modern keypad layouts. They share the existing calculation engine; the selected layout is saved in the browser.
- The Notes tool stores each signed-in user's notes in `public.personal_notes`, protected by owner-only RLS. Managers and members can open a prefilled task from a note; viewers can keep private notes but cannot create shared tasks. The note remains after conversion.
- Production migration history was reconciled against existing objects on 16 November 2026. All local migrations through `202611160001_personal_notes.sql` are recorded as applied; the previously missing Brevo retry migration was applied as part of that reconciliation.
- Local untracked user files existed at the start of this setup: `User Guides/`, `hardware-tool-projects.json`, and `production-clear-proof.png`. Preserve them; never stage the JSON or image.

Only write verified facts here. Do not treat historical task counts as a live database check.
