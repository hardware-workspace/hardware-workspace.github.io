# Hardware Workspace: shared agent instructions

This file is the common protocol for every coding agent. GitHub `main` is the source of truth. Work in the same repository, one agent at a time; do not create an agent-specific project, database, or memory copy. No AI provider API key is needed to develop or deploy this application.

## Start a session

1. Read `.ai/CURRENT_STATE.md`, `.ai/HANDOFF.md`, and `.ai/NEXT_TASK.md`. Open `web/technical_architecture_ai_handoff_guide.md` only for architecture or historical detail needed by the task.
2. Run `git status --short`, `git branch --show-current`, and `git log -1 --oneline`. Fetch before publishing. Preserve all existing uncommitted work.
3. Inspect only files relevant to the request. Use `rg` to locate them. Do not repeat a full repository audit without a concrete reason.
4. Follow the user's current request. Do not start an old suggested task automatically. Ask only when a missing decision prevents work.

## Project map and local setup

- React 18, Vite 6, TypeScript/JavaScript, Tailwind; `src/` contains the app, authentication, dashboard, scheduling, and Supabase client.
- `supabase/migrations/` contains versioned schema changes; `supabase/functions/` contains Edge Functions; `scripts/` contains release and database guards.
- `.github/workflows/deploy-pages.yml` deploys `main` to GitHub Pages. `.github/workflows/deploy-database.yml` guards schema deployment. `web/technical_architecture_ai_handoff_guide.md` is the detailed architecture reference.
- Windows PowerShell: `npm ci`; `Copy-Item .env.example .env.local`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`; `npm run dev`. Node version is in `.nvmrc`. Keep `.env.local` out of Git.

## Make a change

- Keep edits scoped; preserve existing behavior and the UI project/product to database mapping explained in the handoff guide.
- Run `npm run check:focused` for logic changes and `npm run build` for frontend changes. Do not rerun broad checks without a concrete risk.
- Production is the default for requested edits unless the user says “do it locally.” Push frontend changes to `main`, wait for Pages, and verify the live commit. The Pages workflow ignores Markdown-only pushes; do not claim those alter the live app. Existing user authorization for routine publishing persists. Never force-push, rewrite history, or discard uncommitted work.
- Stage intended new files by exact path. `npm run publish:changes -- "Message"` stages tracked changes only and performs guarded checks, commit, and push. Check `git diff --cached --name-only` first. Never stage `hardware-tool-projects.json`, `production-clear-proof.png`, local `.env` files, secrets, or exports.
- Database changes require a numbered migration, `npm run db:status` and `npm run db:plan`, and the guarded database workflow. Earlier SQL Editor changes may be absent from migration history: reconcile the baseline before deployment. Back up affected records before destructive production data work. Do not reload a browser tab with potentially unsaved edits.
- Keep Supabase access tokens and database credentials in protected local settings or GitHub Actions secrets. The frontend publishable key is not a service credential. Never put service-role keys or provider API keys in frontend code or committed files.

## End a session

Update `.ai/CURRENT_STATE.md` with verified current facts, `.ai/HANDOFF.md` with the work and exact next step, and `.ai/NEXT_TASK.md` only when a real next task is known. Add a short `.ai/CHANGELOG.md` entry only for meaningful changes. Keep these files brief; link to existing architecture and setup documents instead of copying them. Distinguish completed, partial, and unverified work. Include test results and the commit when known.

## Agent access modes

- **Local files:** open this checkout, read these instructions, inspect Git status, edit, test, and publish through the existing Git workflow.
- **GitHub only:** inspect the repository and these same files, work in a branch or draft PR if direct push is unavailable, and report what remains unmerged. Do not claim local tests or a live deployment without evidence.
- **MCP or external tools:** use them only for the needed service; apply the same repository, secret, database, and handoff rules. An integration is optional, never a second source of truth.
- **Chat without file or GitHub write access:** provide a patch or concrete instructions for a human to apply. It cannot claim to have edited or deployed this project.

To add an agent, give it repository access appropriate to one of these modes and point it to `AGENTS.md`. If it requires a native context filename, create a short pointer to this file; do not copy project memory. Finish the previous agent's commit or preserve its uncommitted changes before switching. Provider changes never require application code changes.
