import assert from 'node:assert/strict';
import { loadWorkspaceAccess, resolveWorkspaceAccount, signupRole } from './accountAccess.js';

const user = { id: 'verified-user', email: 'member@example.com', user_metadata: { full_name: 'Test User' } };
assert.equal(resolveWorkspaceAccount(user, null).role, 'member');
assert.equal(resolveWorkspaceAccount({ ...user, user_metadata: { requested_role: 'manager' } }, null).role, 'manager');
for (const requested_role of ['admin', 'system_admin', '', null]) {
  assert.equal(resolveWorkspaceAccount({ ...user, user_metadata: { requested_role, role: 'manager', admin: true } }, null).role, 'member');
}
assert.equal(signupRole('manager'), 'manager');
assert.equal(signupRole('system_admin'), 'member');
for (const code of ['PGRST205', '42P01']) {
  assert.equal(resolveWorkspaceAccount(user, null, { code }).is_active, true);
}
for (const code of ['42501', 'PGRST116', 'NETWORK_ERROR']) {
  assert.throws(() => resolveWorkspaceAccount(user, null, { code }));
}
const profile = { id: user.id, name: 'Managed user', role: 'member', is_active: true };
assert.equal(resolveWorkspaceAccount({ ...user, user_metadata: { requested_role: 'manager' } }, profile).role, 'member');
assert.equal(resolveWorkspaceAccount(user, { ...profile, role: 'manager' }).role, 'manager');
for (const badProfile of [{ ...profile, is_active: false }, { ...profile, is_active: null }, { ...profile, role: 'admin' }, { ...profile, id: 'someone-else' }]) {
  assert.throws(() => resolveWorkspaceAccount(user, badProfile));
}
assert.throws(() => resolveWorkspaceAccount(null, null));

function fakeClient({ authError = null, profileResult = { data: null, error: null }, adminResult = { data: null, error: { code: 'PGRST202' } } } = {}) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: authError }) },
    from: () => ({ select: () => ({ eq: (column, id) => {
      assert.equal(column, 'id'); assert.equal(id, user.id);
      return { maybeSingle: async () => profileResult };
    } }) }),
    rpc: async name => { assert.equal(name, 'is_system_admin'); return adminResult; },
  };
}
const noAdmin = await loadWorkspaceAccess(fakeClient());
assert.equal(noAdmin.account.id, user.id);
assert.equal(noAdmin.systemAdmin, false);
assert.equal((await loadWorkspaceAccess(fakeClient({ adminResult: { data: true, error: null } }))).systemAdmin, true);
assert.equal((await loadWorkspaceAccess(fakeClient({ adminResult: { data: true, error: { code: '42501' } } }))).systemAdmin, false);
await assert.rejects(loadWorkspaceAccess(fakeClient({ authError: { message: 'Invalid session' } })));
await assert.rejects(loadWorkspaceAccess(fakeClient({ profileResult: { data: null, error: { code: '42501' } } })));
console.log('Open registration and administrator isolation checks passed');
