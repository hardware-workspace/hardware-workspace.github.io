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

Netlify uses `npm run build` and publishes `dist`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify build environment variables before enabling Git deployments. The latter accepts a Supabase publishable key. Node 24 is selected by `.nvmrc`.

## Current status

Supabase authentication and a database-authorized admin screen are implemented. Database schema/admin bootstrap still need to be applied to the connected project. Task data currently initializes from bundled sample records; edits remain in memory and reset on refresh. See SECURITY_SETUP.md for limitations.
