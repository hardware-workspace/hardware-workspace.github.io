import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const token = request.headers.get('Authorization') || '';
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } }, auth: { persistSession: false } });
    const { data: identity, error: authError } = await caller.auth.getUser();
    if (authError || !identity.user) return reply(401, { error: 'Sign in again.' });
    const { data: allowed, error: roleError } = await caller.rpc('is_system_admin');
    if (roleError || allowed !== true) return reply(403, { error: 'System administrator access required.' });
    const body = await request.json();
    if (!['create', 'update', 'delete'].includes(body.action)) return reply(400, { error: 'Invalid action.' });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    if (body.action !== 'create') {
      if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) return reply(400, { error: 'Invalid user.' });
      const { data: protectedUser, error } = await caller.rpc('admin_user_protected', { target_id: body.id });
      if (error) return reply(503, { error: 'Install the user administration database migration first.' });
      if (protectedUser || body.id === identity.user.id) return reply(403, { error: 'System administrator accounts must be managed through trusted database administration.' });
    }
    if (body.action === 'delete') {
      const { data } = await admin.auth.admin.getUserById(body.id);
      if (!data.user || body.confirmEmail !== data.user.email) return reply(400, { error: 'Type the account email to confirm deletion.' });
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) throw error;
      return reply(200, { success: true });
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['member', 'manager'].includes(body.role) || typeof body.is_active !== 'boolean') return reply(400, { error: 'Enter a name, valid email, role, and access setting.' });
    if (body.action === 'create') {
      if (typeof body.password !== 'string' || body.password.length < 12) return reply(400, { error: 'Use a password with at least 12 characters.' });
      const { data, error } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true, user_metadata: { full_name: name, requested_role: body.role } });
      if (error) throw error;
      const { error: profileError } = await admin.from('users').update({ name, email, role: body.role, is_active: body.is_active }).eq('id', data.user.id).select('id').single();
      if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw profileError; }
    } else {
      // A database trigger synchronizes email/name into the workspace profile.
      const { error } = await admin.auth.admin.updateUserById(body.id, { email, user_metadata: { full_name: name } });
      if (error) throw error;
      const { error: profileError } = await caller.rpc('admin_update_user', { target_id: body.id, new_role: body.role, active: body.is_active });
      if (profileError) return reply(409, { error: 'Name/email saved, but role/access could not be saved. Refresh and retry.' });
    }
    return reply(200, { success: true });
  } catch { return reply(400, { error: 'Unable to complete the request. Check for an existing email address and try again.' }); }
});
