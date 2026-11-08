import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Users, ShieldCheck, UserCheck, Download, X, ArrowLeft } from 'lucide-react';
import { supabase } from './supabaseClient';
import { escapeCsvCell } from './security';

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [access, setAccess] = useState('all');
  const [sort, setSort] = useState('name');
  const [selected, setSelected] = useState(null);
  const [draftRole, setDraftRole] = useState('member');
  const [draftActive, setDraftActive] = useState(true);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  async function load() {
    setError(''); setLoading(true);
    try {
      const result = await supabase.rpc('admin_list_users');
      if (result.error) throw result.error;
      setUsers(result.data || []);
    } catch { setError('Unable to load users. Check your connection and administrator access, then try again.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => users.filter(user =>
    `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (role === 'all' || user.role === role) && (access === 'all' || user.is_active === (access === 'enabled'))
  ).sort((a,b) => String(a[sort] || '').localeCompare(String(b[sort] || ''))), [users, query, role, access, sort]);
  function edit(user) { setSelected(user); setDraftName(user.name || ''); setDraftEmail(user.email || ''); setDraftPassword(''); setDeleteEmail(''); setDeleting(false); setDraftRole(user.role); setDraftActive(user.is_active); setConfirmed(false); setError(''); }
  async function save() {
    if (selected.is_active && !draftActive && !confirmed) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (selected.id && (draftRole === 'viewer' || selected.role === 'viewer')) {
        const { error } = await supabase.rpc('admin_update_user', { target_id: selected.id, new_role: draftRole, active: draftActive });
        if (error) throw error;
        setMessage('Workspace role and access updated.');
        setSelected(null);
        await load();
        return;
      }
      const result = await supabase.functions.invoke('admin-users', { body: {
        action: selected.id ? 'update' : 'create', id: selected.id,
        name: draftName, email: draftEmail, password: draftPassword,
        role: draftRole, is_active: draftActive
      }});
      if (result.error || result.data?.error) throw new Error(result.data?.error || 'The account service is unavailable. It must be deployed before these controls can save.');
      setMessage(selected.id ? 'User updated.' : 'User created. They can sign in with the supplied password.');
      setSelected(null); setDraftPassword(''); await load();
    } catch (failure) { setError(failure.message || 'Unable to save this user.'); }
    finally { setSaving(false); }
  }
  async function removeUser() {
    if (!selected?.id || deleteEmail !== selected.email) return;
    setSaving(true); setError('');
    try {
      const result = await supabase.functions.invoke('admin-users', { body: { action:'delete', id:selected.id, confirmEmail:deleteEmail }});
      if (result.error || result.data?.error) throw new Error(result.data?.error || 'The account service is unavailable. It must be deployed before deletion is available.');
      setSelected(null); setMessage('User account deleted.'); await load();
    } catch (failure) { setError(failure.message || 'Unable to delete this user.'); }
    finally { setSaving(false); }
  }
  function exportUsers() {
    const csv = [['Name','Email','Role','Access'], ...visible.map(user => [user.name,user.email,user.role,user.is_active?'Enabled':'Disabled'])].map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url; link.download='workspace-users.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const control = 'border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return <main className="admin-page min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8"><div className="max-w-7xl mx-auto">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-500 mb-7 hover:text-indigo-600"><ArrowLeft size={16}/>Back to workspace</button>
    <header className="flex flex-wrap justify-between items-start gap-4 mb-7"><div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">System administration</p><h1 className="text-3xl font-bold mt-2">People & access</h1><p className="text-sm text-slate-500 mt-2">Find team members, manage roles, and control workspace access.</p></div><div className="flex gap-2"><button className="bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold" onClick={()=>edit({name:"",email:"",role:"member",is_active:true})}>+ Create user</button><button className={control+' inline-flex items-center gap-2'} onClick={exportUsers} disabled={loading || !visible.length}><Download size={16}/>Export CSV</button><button className={control+' inline-flex items-center gap-2'} onClick={load} disabled={loading || saving}><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button></div></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{[
      ['Total users',users.length,Users,'all','all'],['Enabled',users.filter(u=>u.is_active).length,UserCheck,'all','enabled'],['Managers',users.filter(u=>u.role==='manager').length,ShieldCheck,'manager','all'],['Disabled',users.filter(u=>!u.is_active).length,Users,'all','disabled']
    ].map(([label,count,Icon,r,a])=><button key={label} onClick={()=>{setRole(r);setAccess(a);}} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-400 transition-colors"><div className="flex justify-between text-sm text-slate-500">{label}<Icon size={18}/></div><p className="text-3xl font-bold mt-3">{loading?'—':count}</p><span className="text-xs text-indigo-600">View users →</span></button>)}</div>
    {message && <p role="status" className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 mb-4">{message}</p>}
    {error && <p role="alert" className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 mb-4">{error}</p>}
    <section aria-label="User directory" className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="p-4 flex flex-wrap gap-3 border-b border-slate-200"><label className="relative flex-1 min-w-[200px]"><span className="sr-only">Search users</span><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input className={control+' w-full pl-10'} placeholder="Search by name or email…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter by role" className={control} value={role} onChange={e=>setRole(e.target.value)}><option value="all">All roles</option><option value="manager">Managers</option><option value="member">Members</option><option value="viewer">Viewers</option></select><select aria-label="Filter by access" className={control} value={access} onChange={e=>setAccess(e.target.value)}><option value="all">All access</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select><select aria-label="Sort users" className={control} value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Sort: name</option><option value="email">Sort: email</option><option value="role">Sort: role</option></select>{(query || role!=='all' || access!=='all')&&<button className="text-sm text-indigo-600 px-2" onClick={()=>{setQuery('');setRole('all');setAccess('all');}}>Clear filters</button>}</div>
    <div className="admin-users-table overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Team member','Role','Access',''].map((label,i)=><th key={i} className="px-5 py-3">{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead><tbody>{!loading && visible.map(user=><tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><div className="flex gap-3 items-center"><span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">{(user.name || user.email || '?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</span><div><p className="font-semibold">{user.name || 'Unnamed user'}</p><p className="text-slate-500 mt-1 break-all">{user.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2.5 py-1 capitalize font-medium">{user.role}</span></td><td className="px-5 py-4"><span className={user.is_active?'text-emerald-700':'text-slate-500'}>● {user.is_active?'Enabled':'Disabled'}</span></td><td className="px-5 py-4 text-right"><button className={control+' text-indigo-600 whitespace-nowrap'} onClick={()=>edit(user)}>View / edit</button></td></tr>)}</tbody></table></div>
    {(loading || !visible.length)&&<div className="p-12 text-center"><Users className="mx-auto text-slate-300 mb-3" size={32}/><p role="status" className="font-semibold">{loading?'Loading users…':users.length?'No matching users':'No users to display'}</p><p className="text-sm text-slate-500 mt-2">{loading?'Fetching the latest account settings.':users.length?'Try another search or clear your filters.':'Refresh to try loading the directory again.'}</p></div>}<footer className="px-5 py-3 border-t text-xs text-slate-500">Showing {loading?'…':visible.length} of {users.length} users</footer></section>
    <p className="text-xs text-slate-500 mt-4 flex items-center gap-2"><ShieldCheck size={15}/>System administrator access is assigned separately. Signup roles are Member and Manager.</p>
    {selected && <div className="fixed inset-0 bg-slate-900/40 z-50 flex justify-end" onClick={()=>!saving&&setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="manage-user-title" className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center"><h2 id="manage-user-title" className="text-xl font-bold">{selected.id ? "User details" : "Create user"}</h2><button autoFocus disabled={saving} aria-label="Close user settings" className={control} onClick={()=>setSelected(null)}><X size={18}/></button></div><label className="block text-sm font-semibold mt-7">Full name<input className={control+' w-full mt-2'} value={draftName} maxLength={100} disabled={saving || draftRole==='viewer' || selected.role==='viewer'} onChange={e=>setDraftName(e.target.value)}/></label><label className="block text-sm font-semibold mt-5">Email address<input type="email" className={control+' w-full mt-2'} value={draftEmail} disabled={saving || draftRole==='viewer' || selected.role==='viewer'} onChange={e=>setDraftEmail(e.target.value)}/></label>{!selected.id&&<label className="block text-sm font-semibold mt-5">Initial password<input type="password" autoComplete="new-password" className={control+' w-full mt-2'} value={draftPassword} disabled={saving} onChange={e=>setDraftPassword(e.target.value)}/><span className="text-xs font-normal text-slate-500">At least 12 characters. Share privately with the user.</span></label>}<label className="block text-sm font-semibold mt-7">Workspace role<select className={control+' w-full mt-2'} value={draftRole} disabled={saving} onChange={e=>setDraftRole(e.target.value)}><option value="member">Member</option><option value="manager">Manager</option>{selected.id&&<option value="viewer">Viewer (view only)</option>}</select></label><p className="text-xs text-slate-500 mt-2">Managers manage projects and team tasks. Members work on assigned tasks.</p><label className="flex items-center gap-3 mt-6 text-sm"><input type="checkbox" checked={draftActive} disabled={saving} onChange={e=>{setDraftActive(e.target.checked);setConfirmed(false);}}/>Workspace access enabled</label><p className="text-xs text-slate-500 mt-2">Disabling access blocks this account from entering the workspace.</p>{selected.is_active&&!draftActive&&<label className="flex gap-3 p-3 bg-amber-50 text-amber-900 rounded-lg mt-5 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm that this user should lose workspace access.</label>}{error&&<p role="alert" className="text-rose-700 text-sm mt-4">{error}</p>}<div className="flex gap-3 mt-8"><button disabled={saving || (selected.id && draftRole===selected.role && draftActive===selected.is_active && draftName===selected.name && draftEmail===selected.email) || !draftName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftEmail) || (!selected.id && draftPassword.length<12) || (selected.is_active&&!draftActive&&!confirmed)} onClick={save} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40">{saving?'Saving…':'Save changes'}</button><button disabled={saving} className={control} onClick={()=>setSelected(null)}>Cancel</button></div>{selected.id&&<div className="mt-10 pt-6 border-t border-rose-100"><h3 className="font-semibold text-rose-700">Delete account</h3><p className="text-sm text-slate-500 mt-2">Permanently remove this user's login and workspace profile. This cannot be undone.</p>{!deleting?<button className="text-rose-700 border border-rose-200 rounded-lg px-3 py-2 mt-4 text-sm" onClick={()=>setDeleting(true)}>Delete user�</button>:<div className="mt-4"><label className="text-sm">Type <strong>{selected.email}</strong> to confirm<input className={control+' w-full mt-2'} value={deleteEmail} disabled={saving} onChange={e=>setDeleteEmail(e.target.value)}/></label><button disabled={saving || deleteEmail!==selected.email} className="bg-rose-600 text-white rounded-lg px-3 py-2 mt-3 disabled:opacity-40" onClick={removeUser}>Permanently delete user</button></div>}</div>}</section></div>}
  </div></main>;
}
