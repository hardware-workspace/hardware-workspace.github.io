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

## Publish local changes when ready

Changes stay on your computer until you choose to publish. Ask this chat **“publish changes”**, or run:

```sh
npm run publish:changes -- "Describe the update"
```

The publisher checks that you are on `main` in this project and that `origin` points to `https://github.com/hardware-workspace/hardware-workspace.github.io.git`. It fetches GitHub's latest `main`, stops if remote changes are missing locally, builds the app, and runs account-access and CSV security checks. It then stages all eligible local changes, creates a commit if needed, and pushes to GitHub. Your connected hosting provider builds new commits automatically once Git integration is enabled. Check the provider's deployment result to confirm that the update is live.

This is an on-demand command, not an automatic push after every edit. Review your changes first: the command includes eligible added files, edits, deletions, and any existing staged changes. It refuses tracked or candidate `.env` files (except `.env.example`), `.netlify`, `.vercel`, `node_modules`, and `dist`. Keep other private data out of source files as well. `.env.local` remains local; hosting configuration belongs in your hosting provider's environment variables.

To validate without staging, committing, or pushing:

```sh
npm run publish:check
```

Checks refresh the local `origin/main` reference and rebuild `dist`, but do not change your source files or Git index. Publishing requires working GitHub access and a configured Git commit name/email. The command never force-pushes, rebases, resets, or resolves conflicts automatically. If a check or push fails, your work remains local so you can address the reported issue and retry.

## Current status

Production uses a Supabase shared workspace. The latest user-provided JSON import contains 15 project groups, 25 products, and 177 tasks; all imported tasks lack schedule dates and are in backlog. The Gantt displays them as unscheduled rows and provides staged expansion plus a product filter. See `web/technical_architecture_ai_handoff_guide.md` for current state and `SECURITY_SETUP.md` for access design. Local demo access still uses bundled sample records.
