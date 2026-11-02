import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  async function load() {
    setError(''); setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) { setUsers([]); setError('Unable to load users. Administrator access and database setup are required.'); }
    else setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  async function update(user, patch) {
    setSaving(user.id); setError('');
    const { error } = await supabase.rpc('admin_update_user', { target_id: user.id, new_role: patch.role ?? user.role, active: patch.is_active ?? user.is_active });
    if (error) setError('Update failed. Your administrator access may have changed.');
    else await load();
    setSaving('');
  }
  return <main className="min-h-screen bg-stone-50 p-4 sm:p-10 text-slate-800"><div className="max-w-5xl mx-auto"><button className="text-indigo-600 text-sm mb-6" onClick={onBack}>← Back to workspace</button><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold">Administration</p><h1 className="text-2xl font-bold mt-2">Workspace users</h1><p className="text-sm text-slate-500 mt-2">Manage team roles and account access.</p></div><button onClick={load} disabled={loading || !!saving} className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button></div>{error && <p role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-lg my-4">{error}</p>}<div className="bg-white border rounded-xl mt-6 overflow-x-auto">{loading ? <p role="status" className="p-6">Loading users…</p> : <table className="w-full text-sm text-left"><thead className="bg-stone-100 text-slate-600"><tr>{['Name','Email','Role','Access'].map(label=><th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody>{users.map(user=><tr key={user.id} className="border-t"><td className="p-4 font-semibold">{user.name}</td><td className="p-4">{user.email}</td><td className="p-4"><select aria-label={`Role for ${user.email}`} value={user.role} disabled={!!saving} onChange={e=>update(user,{role:e.target.value})} className="border rounded-lg p-2"><option value="member">Member</option><option value="manager">Manager</option></select></td><td className="p-4"><button disabled={!!saving} onClick={()=>update(user,{is_active:!user.is_active})} className={`border rounded-lg px-3 py-2 ${user.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>{saving === user.id ? 'Saving…' : user.is_active ? 'Enabled · Disable' : 'Disabled · Enable'}</button></td></tr>)}</tbody></table>}{!loading && !error && !users.length && <p className="p-6 text-slate-500">No workspace users found.</p>}</div><p className="text-xs text-slate-500 mt-4">System administrator privileges are assigned separately in the database.</p></div></main>;
}
