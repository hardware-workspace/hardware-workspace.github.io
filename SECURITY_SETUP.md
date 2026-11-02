# Authentication and security setup

The frontend now requires a Supabase session and an active public.users profile whose ID matches auth.users.id. Roles come from the database, never signup metadata. Production has no demo bypass. Local development offers demo access; public registration is available but does not automatically grant workspace access.

## Enable accounts

1. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY locally and in hosting. Never use a service-role/secret key in Vite variables.
2. Enable Supabase email/password authentication. Configure the production Site URL and allow the local and production origins as recovery redirect URLs.
3. Create/invite team accounts through Supabase administration. Create matching public.users rows with the auth user UUID, name, email, active status, and approved member/manager role. Existing seed IDs do not grant access.
4. Enable RLS on public.users. Allow authenticated users to read their own profile; do not allow clients to insert/update roles or active status. Provision these through trusted administration.
5. Configure email delivery and authentication rate limits in Supabase.

## Important remaining limitation

App.tsx still initializes tasks/projects/comments from bundled sample data and edits React memory. Changes are not saved across refreshes or shared between users. Authentication is implemented, but a complete persistence migration and database authorization review are still required before real task data is loaded. Frontend permission checks do not replace RLS. Do not put confidential records into bundled seed data.

The supplied original SQL is a reference, not a production migration: it includes sample identities, broad authenticated read policies, and a SECURITY DEFINER function without a pinned search_path. Review and migrate this deliberately against the actual database. In particular, prevent role self-escalation, enforce active membership for every policy, protect manager-only fields in database triggers, require created_by/author_id to equal auth.uid(), and bind real user IDs to auth.users. No database migration was applied by this change.

## Verification

- npm run build
- node src/security.test.js
- npm audit (zero known vulnerabilities at review time)
- Browser: unauthenticated login and password-recovery navigation checked.
- Live successful login, disabled-account rejection, recovery email delivery, and database RLS require a provisioned test account; these have not been verified.

Netlify headers apply after deployment; they do not apply to the Vite development server. If using a custom Supabase hostname, update the CSP connect-src allowlist.

## Self-service registration

The login page now includes Create account (full name, work email, password, confirmation). Registration uses Supabase Auth; enable email signups and email confirmation in the dashboard and configure email redirect URLs. Names are stored as display metadata only; roles never come from that metadata. New registrations do not receive workspace access automatically. An administrator must provision a matching public.users row with the auth UUID and approved role/active status. No automatic profile trigger or role-granting policy has been applied. Registration delivery must be tested with a real user-controlled email address.

## System administration (prepared, not activated)

The new AdminPage is displayed only after is_system_admin() returns true. User listing and role/access changes go through admin_list_users and admin_update_user, both of which independently authorize the calling user in the database. Demo and manager accounts cannot open it. System administrator membership is separate from workspace role.

web/admin_account_setup_proposal.sql is an unapplied proposal, not a verified migration. Review the actual schema and policies first. It provisions new signups as inactive members, prevents client profile writes, and restricts account management to system admins. The first administrator must be bootstrapped in a trusted database session after registering and verifying their email. No automatic first-user elevation exists. Existing accounts require profile backfill before use.

The frontend is connected to the selected Supabase project. Database setup and administrator bootstrap have not been verified because the Supabase connector is unavailable and the browser account could not access the project. Test anonymous/member/manager denials, admin success, signup email delivery, disabled accounts, and role changes before deployment. This does not migrate the sample task workspace to persistent database storage.
