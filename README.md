# Communication Team Task Manager

React + Vite workspace for hardware engineering tasks, Gantt scheduling, products, and team capacity.

## Run locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure the Supabase project URL and publishable key using the variable names in `.env.example`. Never commit credentials. Local development offers sample manager/member access; this is disabled in production.

## Accounts and roles

Anyone can create an account and choose **Member** or **Manager** during registration. Both roles can sign in without administrator approval. Supabase may still require email verification, depending on the project's authentication settings.

System administrator is a separate privilege assigned manually through trusted database administration. It is never offered during signup or inferred from signup metadata. The admin page requires the server's `is_system_admin()` check to succeed.

The trusted database profile determines access to the production shared workspace. Explicitly disabled profiles remain blocked. Local development's demo accounts use a separate seeded workspace.

## Build and publish

```sh
npm run build
node src/security.test.js
```

The app uses `npm run build` and publishes `dist`. Node 24 is selected by `.nvmrc`.

GitHub Pages is the primary hosting target, at `https://hardware-workspace.github.io/` once deployment is enabled and its workflow succeeds. In the repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Variables**. The latter accepts the Supabase publishable key; never use a secret or service-role key. The local `.env.local` file is not uploaded. The Pages workflow stops if either variable is missing, builds the app with `npm run build -- --base=/`, and deploys `dist` on pushes to `main`. It can also be started manually from **Actions → Deploy to GitHub Pages → Run workflow**.

In Supabase authentication URL settings, allow `https://hardware-workspace.github.io/` as a redirect URL for email verification and password recovery. Both flows retain the project subpath. The app uses in-page navigation, so it does not need server-side route rewrites on Pages.

The existing `netlify.toml` and `vercel.json` files remain available for those alternate hosts; GitHub Pages does not apply them or their custom security headers. For an alternate root-domain deployment, use `npm run build` with output `dist` and configure its Supabase build variables separately.

## Release workflow

Requested edits are published to production by default unless you ask for local-only work. For a frontend change, run focused checks and build, stage intended new files explicitly, then publish:

```sh
npm run check:focused
npm run build
git add path/to/new-file
npm run publish:changes -- "Describe the update"
```

The publisher checks the branch and origin, fetches latest `main`, runs the build and focused checks, stages **tracked changes only**, commits, and pushes. New files must already be staged by name. Review `git diff --cached --name-only` before publishing. The Pages workflow deploys each push and verifies that the live HTML identifies the pushed commit and its JavaScript entrypoint loads. A failed verification job means the release is not confirmed live.

For a database schema change, add a numbered file under `supabase/migrations`. The pinned CLI offers `npm run db:status`, `npm run db:plan`, and `npm run db:deploy`. These commands target only project `xqhxjolkaqqxqblqvrwg`; deployment also requires `HARDWARE_DB_DEPLOY=xqhxjolkaqqxqblqvrwg`. Supply `SUPABASE_ACCESS_TOKEN` through a protected shell environment or GitHub Actions secret, never source code or chat. The **Deploy Supabase migrations** Actions workflow is manually dispatched with the project reference. Choose **plan** to inspect migration history and the dry run without applying changes; choose **deploy** only after baseline verification. It reports a failure if the token is missing.

**Before the first CLI database deployment:** compare `npm run db:status` with the live schema. Earlier migrations were executed in the SQL Editor, which may have bypassed Supabase migration history. Reconcile that history only after verifying the equivalent SQL exists; do not blindly replay the old files. Once the baseline is verified, set repository Actions variables `HARDWARE_DB_BASELINE_VERIFIED=xqhxjolkaqqxqblqvrwg` and `AUTO_DEPLOY_DB=true`, plus secret `SUPABASE_ACCESS_TOKEN`. New migration pushes will then deploy automatically. Shared workspace data replacements need separate backups and are never part of the schema workflow.

The publisher refuses tracked or candidate `.env` files (except `.env.example`), `.netlify`, `.vercel`, `node_modules`, and `dist`. Do not stage local import JSON or backup images. `.env.local` stays local; hosting configuration belongs in environment settings.

To validate without staging, committing, or pushing:

```sh
npm run publish:check
```

Checks refresh the local `origin/main` reference and rebuild `dist`, but do not change your source files or Git index. Publishing requires working GitHub access and a configured Git commit name/email. The command never force-pushes, rebases, resets, or resolves conflicts automatically. If a check or push fails, your work remains local so you can address the reported issue and retry.

## Current status

Production uses a Supabase shared workspace. The latest user-provided JSON import contains 15 project groups, 25 products, and 177 tasks; all imported tasks lack schedule dates and are in backlog. The Gantt displays them as unscheduled rows and provides staged expansion plus a product filter. See `web/technical_architecture_ai_handoff_guide.md` for current state and `SECURITY_SETUP.md` for access design. Local demo access still uses bundled sample records.
