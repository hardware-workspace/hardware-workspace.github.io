# Authentication and security setup

## Registration policy

Anyone may create an account and choose **member** or **manager** at signup. This is an intentional open-registration policy: neither role requires administrator approval. Email verification may still be required by Supabase authentication settings.

Only these two workspace roles are accepted. The signup field `requested_role` is mapped to `manager` only when its value is exactly `manager`; all other values default to `member`. Display names may also come from signup metadata. User metadata is editable, so it never grants system-administrator privileges.

The frontend verifies the account through `auth.getUser()`. If a trusted database profile exists, its role and active status take precedence. Explicitly disabled profiles remain blocked. While the profile table is absent, or a verified user has no profile yet, the app can use the selected member/manager role for its current sample workspace. This compatibility path does not create persistent database roles or authorize database operations.

## Connect authentication

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally and in hosting. The latter accepts a Supabase publishable key. Never use a secret or service-role key in frontend variables.
2. Enable email/password signup in Supabase. Configure email delivery and authentication rate limits.
3. Configure authentication redirect URLs, including `https://rohanrajdev77-alt.github.io/hardware-tool/` for GitHub Pages and the local development URL when needed. Verification and recovery callbacks retain the Pages project subpath.
4. Apply reviewed database profile setup when ready to persist accounts. Keep RLS enabled and allow users to read their own authentication profile. Do not permit direct client writes to profile roles or active status.

## Database profile setup

`web/admin_account_setup_proposal.sql` is a proposed setup, not a verified or applied migration. It requires the existing `public.users` schema. It sets the default active flag to true and creates an active profile on signup, storing only the selected member/manager role. The signup trigger ignores metadata claims for administrator access. Later metadata edits do not change a stored profile's role.

The local setup file includes profile-table creation and backfills only missing profiles as active accounts with the selected member/manager role. Existing profiles are preserved, including explicitly disabled accounts. There is no automatic activation of previously disabled accounts. Review existing schemas, constraints, and policies before applying either setup.

## System administration

System-administrator membership is separate from the workspace role and is stored in `private.system_admins`. Assign it manually through trusted database administration to the intended verified account. Never accept administrator membership from registration metadata, the signup role selector, or a client request. Manager self-registration does not grant system administration.

The admin page is shown only when `is_system_admin()` returns true. Its user-listing and role/access changes call `admin_list_users` and `admin_update_user`; both functions independently authorize the caller in the database. Missing or failed administrator checks do not grant access. The proposal prevents the account-management RPC from changing system-administrator accounts; those remain managed through trusted administration.

The profile and administrator setup has not been applied or verified through the connected Supabase project. The connector was unavailable and the browser account could not access the project. Public authentication can be connected independently of this database setup.

## Remaining storage work

`App.tsx` initializes tasks, projects, and comments from bundled sample data and edits React memory. Changes are not saved across refreshes or shared between users. Database setup and task persistence work are still required before real shared task data is loaded. Frontend permission checks do not replace database authorization. Do not put confidential records into bundled sample data.

The original schema/seed SQL under `web/` is a reference, not a production migration. It includes sample identities, broad authenticated read policies, and a `SECURITY DEFINER` function without a pinned `search_path`. Review it against the actual database, enforce stored account roles and active membership in server-side policies, protect manager-only fields in database triggers, require `created_by`/`author_id` to match the authenticated account, and bind real user IDs to `auth.users`.

## Verification and hosting

Run the build, CSV security checks, and the account-role tests when changing authentication. Live signup verification, successful login, member/manager behavior, disabled-account rejection, password recovery, and server administrator denials must be tested against the configured project before treating database setup as verified.

GitHub Pages does not apply the custom headers in `netlify.toml` or `vercel.json`. Those files remain for alternate hosting. Any configured CSP must allow the actual Supabase endpoint used by that host.
