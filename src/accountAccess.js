const workspaceRoles = new Set(['member', 'manager']);
const missingProfileTable = new Set(['PGRST205', '42P01']);

// Registration is intentionally open to both workspace roles. Neither role
// grants system-administrator access, which is checked separately on the server.
export function signupRole(value) {
  return workspaceRoles.has(value) ? value : 'member';
}

export function resolveWorkspaceAccount(user, profile, profileError = null) {
  if (!user?.id) throw new Error('Your session expired. Please sign in again.');
  if (profileError && !missingProfileTable.has(profileError.code)) {
    throw new Error('Unable to load your workspace settings. Please try again.');
  }
  if (profile && (profile.id !== user.id || !workspaceRoles.has(profile.role))) {
    throw new Error('Your workspace profile is invalid. Contact the system administrator.');
  }
  if (profile && profile.is_active !== true) {
    throw new Error('This account has been disabled. Contact the system administrator.');
  }

  const metadata = user.user_metadata || {};
  const rawName = profile?.name || metadata.full_name;
  const name = (typeof rawName === 'string' && rawName.trim())
    ? rawName.trim().slice(0, 100)
    : (user.email?.split('@')[0] || 'Team member');

  return {
    ...profile,
    id: user.id,
    email: user.email || '',
    name,
    // Once a database profile exists it is authoritative. Before that setup,
    // the verified account's explicit public role choice opens the sample app.
    role: profile?.role || signupRole(metadata.requested_role),
    is_active: true,
    color: profile?.color || 'bg-indigo-600',
    initials: profile?.initials || name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(),
    notification_prefs: profile?.notification_prefs || {},
  };
}

export async function loadWorkspaceAccess(client) {
  const { data: verified, error } = await client.auth.getUser();
  if (error || !verified?.user) throw new Error('Your session expired. Please sign in again.');

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id,name,email,role,is_active,color,initials,notification_prefs')
    .eq('id', verified.user.id)
    .maybeSingle();
  const account = resolveWorkspaceAccount(verified.user, profile, profileError);

  let systemAdmin = false;
  try {
    const result = await client.rpc('is_system_admin');
    systemAdmin = !result.error && result.data === true;
  } catch {
    // Unavailable administration setup never promotes a self-registered user.
  }
  return { account, systemAdmin };
}
