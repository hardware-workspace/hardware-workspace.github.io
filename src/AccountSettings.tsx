import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserRound, LockKeyhole, Mail, LogOut, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient';
import { realAccount } from './taskEmails';

export default function AccountSettings({ account, onUpdated, onSignOut }) {
  const [name,setName]=useState(account.name || '');
  const [email,setEmail]=useState(account.email || '');
  const [emailPassword,setEmailPassword]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState({section:'',text:'',error:false});
  const [confirmAll,setConfirmAll]=useState(false);
  const [pendingEmail,setPendingEmail]=useState('');
  const enabled=!!supabase && realAccount(account.id);
  useEffect(()=>{setName(account.name||'');setEmail(account.email||'');},[account.name,account.email]);
  useEffect(()=>{let active=true;if(enabled)supabase.auth.getUser().then(({data})=>{if(active)setPendingEmail(data.user?.new_email||'');});return()=>{active=false;};},[enabled,account.email]);
  async function reauthenticate(secret) {
    // Use an isolated client: checking the password must not remount the workspace.
    const verifier=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    try {const {error}=await verifier.auth.signInWithPassword({email:account.email,password:secret});if(error)throw Error('Your current password could not be verified. Check it and try again.');}
    finally {await verifier.auth.signOut({scope:'local'});}
  }
  async function perform(section,operation) {
    if(busy||!enabled)return;setBusy(section);setNotice({section:'',text:'',error:false});
    try {const text=await operation();setNotice({section,text,error:false});}
    catch(error){setNotice({section,text:error.message||'Unable to save. Please try again.',error:true});}
    finally{setBusy('');setEmailPassword('');setCurrentPassword('');setPassword('');setConfirm('');}
  }
  async function saveName(event){event.preventDefault();await perform('profile',async()=>{
    const fullName=name.trim();if(!fullName||fullName.length>100)throw Error('Enter a name between 1 and 100 characters.');
    const {data,error}=await supabase.auth.updateUser({data:{full_name:fullName}});if(error)throw Error('Unable to update your profile. Check your connection and try again.');
    onUpdated({name:data.user.user_metadata.full_name});return 'Your profile has been updated.';
  });}
  async function saveEmail(event){event.preventDefault();await perform('email',async()=>{
    const next=email.trim().toLowerCase();if(next===account.email.toLowerCase())throw Error('Enter a different email address.');
    await reauthenticate(emailPassword);
    const {data,error}=await supabase.auth.updateUser({email:next},{emailRedirectTo:new URL(import.meta.env.BASE_URL,location.origin).href});
    if(error)throw Error(error.code==='over_email_send_rate_limit'?'The email service limit was reached. Wait before trying again.':'Unable to change your email. The address may already be in use, or email delivery may be unavailable.');
    setPendingEmail(data.user.new_email||'');
    if(data.user.email===next){onUpdated({email:next});return 'Your email address has been updated.';}
    return 'Check your new email for a confirmation link. Depending on your security settings, you may also need to approve the change from your current email. Your current address stays active until the change is completed.';
  });}
  async function savePassword(event){event.preventDefault();await perform('password',async()=>{
    if(password.length<12)throw Error('Use at least 12 characters.');if(password!==confirm)throw Error('The new passwords do not match.');if(password===currentPassword)throw Error('Choose a password different from your current password.');
    await reauthenticate(currentPassword);
    const {error}=await supabase.auth.updateUser({password});if(error)throw Error(error.code==='reauthentication_needed'?'Sign in again before changing your password.':'Unable to update the password. Check your connection or sign in again.');
    setShowPassword(false);return 'Password updated. Use your new password the next time you sign in.';
  });}
  async function signOut(scope) {
    if(!enabled){await onSignOut('local');return;}
    await perform('sessions',async()=>{const result=await onSignOut(scope);if(result===false)throw Error('Sign out failed. Check your connection and try again.');return '';});
  }
  const input='w-full mt-2 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';
  const button='bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40';
  const disabled=!enabled||!!busy;
  const feedback=section=>notice.section===section&&<p role={notice.error?'alert':'status'} className={'text-sm rounded-lg p-3 '+(notice.error?'bg-rose-50 text-rose-800':'bg-emerald-50 text-emerald-800')}>{notice.text}</p>;
  return <section className="space-y-5 mb-6" aria-labelledby="account-settings-title"><header><p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold">Personal settings</p><h2 id="account-settings-title" className="text-2xl font-bold mt-2">Your account</h2><p className="text-sm text-slate-500 mt-2">Manage your profile, sign-in details, and sessions.</p></header>
    {!enabled&&<p role="status" className="bg-amber-50 text-amber-900 p-3 rounded-lg text-sm">You are using a local demo account. Sign in with your real account to update personal details or security settings.</p>}
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl"><h3 className="font-semibold flex gap-2 items-center"><UserRound size={18}/>Profile</h3><p className="text-sm text-slate-500 mt-2">Your name appears on tasks and comments.</p><form onSubmit={saveName} className="space-y-4 mt-5"><label className="block text-sm font-medium">Full name<input value={name} required maxLength={100} autoComplete="name" disabled={disabled} onChange={e=>setName(e.target.value)} className={input}/></label><dl className="text-sm flex justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><dt className="text-slate-500">Workspace role</dt><dd className="capitalize font-medium">{account.role}</dd></dl><p className="text-xs text-slate-500">Role and workspace access are managed by your system administrator.</p>{feedback('profile')}<button className={button} disabled={disabled||!name.trim()||name.trim()===account.name}>{busy==='profile'?'Saving…':'Save profile'}</button></form></section>
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl"><h3 className="font-semibold flex gap-2 items-center"><Mail size={18}/>Email address</h3><p className="text-sm text-slate-500 mt-2 break-all">Current sign-in email: {account.email}</p>{pendingEmail&&<p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-lg mt-3 break-all">Awaiting confirmation: {pendingEmail}</p>}<form onSubmit={saveEmail} className="space-y-4 mt-5"><label className="block text-sm font-medium">New email address<input type="email" required autoComplete="email" value={email} disabled={disabled} onChange={e=>setEmail(e.target.value)} className={input}/></label><label className="block text-sm font-medium">Current password to change email<input type="password" autoComplete="current-password" required value={emailPassword} disabled={disabled} onChange={e=>setEmailPassword(e.target.value)} className={input}/></label><p className="text-xs text-slate-500">Confirmation follows your email security settings. Follow any confirmation links sent to your addresses.</p>{feedback('email')}<button className={button} disabled={disabled||!emailPassword||email.trim().toLowerCase()===account.email.toLowerCase()}>{busy==='email'?'Updating…':'Change email'}</button></form></section>
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl"><h3 className="font-semibold flex gap-2 items-center"><LockKeyhole size={18}/>Change password</h3><p className="text-sm text-slate-500 mt-2">Choose a unique password with at least 12 characters.</p><form onSubmit={savePassword} className="space-y-4 mt-5"><label className="block text-sm font-medium">Current password<input type="password" required autoComplete="current-password" value={currentPassword} disabled={disabled} onChange={e=>setCurrentPassword(e.target.value)} className={input}/></label><label className="block text-sm font-medium">New password<div className="relative"><input type={showPassword?'text':'password'} required minLength={12} autoComplete="new-password" value={password} disabled={disabled} onChange={e=>setPassword(e.target.value)} className={input+' pr-12'}/><button type="button" disabled={disabled} aria-label={showPassword?'Hide new password':'Show new password'} aria-pressed={showPassword} className="absolute right-3 top-5 text-slate-500" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><label className="block text-sm font-medium">Confirm new password<input type="password" required autoComplete="new-password" value={confirm} disabled={disabled} onChange={e=>setConfirm(e.target.value)} className={input}/></label>{confirm&&confirm!==password&&<p className="text-xs text-rose-600">Passwords do not match.</p>}{feedback('password')}<button className={button} disabled={disabled||!currentPassword||password.length<12||password!==confirm}>{busy==='password'?'Updating…':'Update password'}</button></form></section>
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl"><h3 className="font-semibold flex gap-2 items-center"><ShieldCheck size={18}/>Sign-in sessions</h3><p className="text-sm text-slate-500 mt-2">Sign out of this browser, or end sessions across your devices. Access tokens on other devices may stay valid until they expire.</p><p className="bg-amber-50 text-amber-900 rounded-lg p-3 text-xs mt-4">Current task edits are temporary and reset when the workspace is closed or reloaded. Export anything you need before signing out.</p><div className="space-y-4 mt-6">{feedback('sessions')}<button className="inline-flex gap-2 items-center border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm" disabled={!!busy} onClick={()=>signOut('local')}><LogOut size={16}/>Sign out of this browser</button><div className="border-t border-slate-100 dark:border-slate-800 pt-5"><label className="text-sm flex items-start gap-3"><input type="checkbox" disabled={disabled} checked={confirmAll} onChange={e=>setConfirmAll(e.target.checked)}/>I want to sign out across all my devices.</label><button className="mt-4 text-rose-700 border border-rose-200 rounded-lg px-4 py-2.5 text-sm disabled:opacity-40" disabled={disabled||!confirmAll} onClick={()=>signOut('global')}>Sign out of all devices</button></div></div></section>
    </div>
  </section>;
}

