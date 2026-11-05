# Hardware Workspace agent notes

- Start with `web/technical_architecture_ai_handoff_guide.md`, then open only files needed for the requested change. Keep the handoff concise and update it for material facts only.
- Production is the default for user-requested edits unless the user says “do it locally.” Push frontend changes to `main`, wait for the Pages workflow, and verify the live commit. Database changes use versioned migrations and the guarded database workflow.
- Run `npm run check:focused` for logic changes and `npm run build` for frontend changes. Do not rerun broad checks without a concrete risk.
- Never stage `hardware-tool-projects.json`, `production-clear-proof.png`, local `.env` files, secrets, or exports. Stage new source files explicitly. The publisher stages tracked changes only.
- Before destructive production data work, back up affected records. Do not reload any browser tab with potentially unsaved edits.
- Keep Supabase access tokens and database credentials in local protected environment settings or GitHub Actions secrets; publishable frontend variables are not service credentials.
