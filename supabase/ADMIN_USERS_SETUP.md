# User administration server setup

The administration page calls the `admin-users` Supabase Edge Function for create, edit, and permanent deletion. These controls require server deployment; a frontend-only publish is insufficient.

1. Apply `supabase/migrations/202611020001_admin_user_crud.sql` to the connected project. The migration requires a cascading profile foreign key and fails atomically if absent.
2. Deploy `supabase/functions/admin-users` using the Supabase dashboard or CLI. Keep the service-role key exclusively in the function environment. Never add it to Vite environment variables.
3. Verify with disposable member/manager accounts: create, view, update name/email/role/access, sign in, disable, and delete. Verify member and manager callers receive Forbidden and system-admin targets are protected.

Creation uses an administrator-supplied initial password and confirms the new email account. It does not send invitation email. Passwords are not stored in source or workspace profiles. System admins must be managed separately through trusted database administration.

Local checks completed: production frontend build and existing account-access tests. Live CRUD calls and server deployment remain pending until submission. No production accounts were modified during implementation.
