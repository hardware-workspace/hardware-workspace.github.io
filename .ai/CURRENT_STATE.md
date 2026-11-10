# Current verified state

- Repository: `https://github.com/hardware-workspace/hardware-workspace.github.io`; production frontend: `https://hardware-workspace.github.io/`.
- Working branch: `main`. Check `git log -1` for the latest published commit.
- Frontend: React/Vite; GitHub Pages builds on non-Markdown pushes to `main`. Backend: existing Supabase project `xqhxjolkaqqxqblqvrwg`; shared workspace uses authenticated RPCs. No backend configuration or production data was changed by the AI portability setup.
- The detailed handoff guide predates recent Gantt releases; use current code and Git history for those features. Existing release and migration guards remain in place.
- Known deployment constraint: earlier SQL Editor changes may not appear in Supabase migration history. Reconcile before any database workflow deployment.
- Gantt project and product rows support manager drag ordering; task rows can be sorted locally by date, status, or name. The eligible assignee directory refreshes while the app is open.
- Local untracked user files existed at the start of this setup: `User Guides/`, `hardware-tool-projects.json`, and `production-clear-proof.png`. Preserve them; never stage the JSON or image.

Only write verified facts here. Do not treat historical task counts as a live database check.
