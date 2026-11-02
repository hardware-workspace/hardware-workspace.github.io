# Communication Team Task Manager

React + Vite workspace for hardware engineering tasks, Gantt scheduling, products, and team capacity.

## Run locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure the Supabase project URL and publishable key using the variable names in `.env.example`. Never commit credentials. Local development offers sample manager/member access; this is disabled in production.

## Build and publish

```sh
npm run build
node src/security.test.js
```

The app uses `npm run build` and publishes `dist`. Node 24 is selected by `.nvmrc`.

GitHub Pages is the primary hosting target, at `https://rohanrajdev77-alt.github.io/hw---tool-/` once deployment is enabled and its workflow succeeds. In the repository, choose **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Variables**. The latter accepts the Supabase publishable key; never use a secret or service-role key. The local `.env.local` file is not uploaded. The Pages workflow stops if either variable is missing, builds the app with `npm run build -- --base=/hw---tool-/`, and deploys `dist` on pushes to `main`. It can also be started manually from **Actions → Deploy to GitHub Pages → Run workflow**.

In Supabase authentication URL settings, allow `https://rohanrajdev77-alt.github.io/hw---tool-/` as a redirect URL for email verification and password recovery. Both flows retain the project subpath. The app uses in-page navigation, so it does not need server-side route rewrites on Pages.

The existing `netlify.toml` and `vercel.json` files remain available for those alternate hosts; GitHub Pages does not apply them or their custom security headers. For an alternate root-domain deployment, use `npm run build` with output `dist` and configure its Supabase build variables separately.

## Publish local changes when ready

Changes stay on your computer until you choose to publish. Ask this chat **“publish changes”**, or run:

```sh
npm run publish:changes -- "Describe the update"
```

The publisher checks that you are on `main` in this project and that `origin` points to `https://github.com/rohanrajdev77-alt/hw---tool-.git`. It fetches GitHub's latest `main`, stops if remote changes are missing locally, builds the app, and runs the CSV security checks. It then stages all eligible local changes, creates a commit if needed, and pushes to GitHub. Your connected hosting provider builds new commits automatically once Git integration is enabled. Check the provider's deployment result to confirm that the update is live.

This is an on-demand command, not an automatic push after every edit. Review your changes first: the command includes eligible added files, edits, deletions, and any existing staged changes. It refuses tracked or candidate `.env` files (except `.env.example`), `.netlify`, `.vercel`, `node_modules`, and `dist`. Keep other private data out of source files as well. `.env.local` remains local; hosting configuration belongs in your hosting provider's environment variables.

To validate without staging, committing, or pushing:

```sh
npm run publish:check
```

Checks refresh the local `origin/main` reference and rebuild `dist`, but do not change your source files or Git index. Publishing requires working GitHub access and a configured Git commit name/email. The command never force-pushes, rebases, resets, or resolves conflicts automatically. If a check or push fails, your work remains local so you can address the reported issue and retry.

## Current status

Supabase authentication and a database-authorized admin screen are implemented. Database schema/admin bootstrap still need to be applied to the connected project. Task data currently initializes from bundled sample records; edits remain in memory and reset on refresh. See SECURITY_SETUP.md for limitations.
