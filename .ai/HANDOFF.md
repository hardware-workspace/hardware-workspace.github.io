# Latest handoff

## Request

Make the existing project portable across AI coding agents, with GitHub as source of truth and one concise shared memory system.

## Completed

- Centralized startup, development, publishing, safety, and handoff rules in `AGENTS.md`.
- Added small shared memory files under `.ai/`, plus `CLAUDE.md` and `GEMINI.md` pointers.
- Documented local, GitHub-only, MCP-capable, and chat-only access modes without requiring provider credentials or application changes.
- Updated `README.md` to direct agents to the shared memory and remove an outdated task-count claim.

## Verification and boundaries

- Documentation-only change. No app code, dependencies, deployment workflow, Supabase schema, production records, or authentication settings changed.
- Verification: documentation diff and local links checked; no application tests are required for Markdown-only changes. Git publication outcome: see `git log -1`. Markdown-only pushes do not start the Pages workflow.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user-requested feature. Start with `AGENTS.md` and `.ai/CURRENT_STATE.md`; inspect only the relevant source files.
