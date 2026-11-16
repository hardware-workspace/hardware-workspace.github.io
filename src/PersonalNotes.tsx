import { useEffect, useState } from 'react';
import { ArrowRight, Check, Pencil, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { supabase } from './supabaseClient';

export interface PersonalNote {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  accountId: string;
  canConvert: boolean;
  onConvert: (note: PersonalNote) => void;
}

const storageKey = (accountId: string) => `hardware-personal-notes:${accountId}`;

export default function PersonalNotes({ accountId, canConvert, onConvert }: Props) {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setNotes([]);
    setDraft('');
    setEditingId(null);
    setError('');
    setLoading(true);
    if (!supabase) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey(accountId)) || '[]');
        if (active) setNotes(Array.isArray(saved) ? saved : []);
      } catch {
        if (active) setError('Could not read notes stored on this device.');
      }
      if (active) setLoading(false);
      return () => { active = false; };
    }
    supabase.from('personal_notes').select('id,body,created_at,updated_at')
      .eq('owner_id', accountId).order('updated_at', { ascending: false })
      .then(({ data, error: readError }) => {
        if (!active) return;
        if (readError) setError('Could not load your notes. Please try again.');
        else setNotes(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [accountId]);

  const saveOffline = (next: PersonalNote[]) => {
    localStorage.setItem(storageKey(accountId), JSON.stringify(next));
    setNotes(next);
  };

  const addNote = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      if (supabase) {
        const { data, error: writeError } = await supabase.from('personal_notes')
          .insert({ owner_id: accountId, body }).select('id,body,created_at,updated_at').single();
        if (writeError) throw writeError;
        setNotes(previous => [data, ...previous]);
      } else {
        const now = new Date().toISOString();
        saveOffline([{ id: crypto.randomUUID(), body, created_at: now, updated_at: now }, ...notes]);
      }
      setDraft('');
    } catch {
      setError('Could not save this note. Your text is still here.');
    } finally {
      setBusy(false);
    }
  };

  const updateNote = async (id: string) => {
    const body = editBody.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      if (supabase) {
        const { data, error: writeError } = await supabase.from('personal_notes')
          .update({ body, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_id', accountId)
          .select('id,body,created_at,updated_at').single();
        if (writeError) throw writeError;
        setNotes(previous => previous.map(note => note.id === id ? data : note));
      } else {
        saveOffline(notes.map(note => note.id === id ? { ...note, body, updated_at: new Date().toISOString() } : note));
      }
      setEditingId(null);
    } catch {
      setError('Could not update this note. Your changes are still here.');
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (supabase) {
        const { error: writeError } = await supabase.from('personal_notes')
          .delete().eq('id', id).eq('owner_id', accountId);
        if (writeError) throw writeError;
        setNotes(previous => previous.filter(note => note.id !== id));
      } else {
        saveOffline(notes.filter(note => note.id !== id));
      }
    } catch {
      setError('Could not remove this note. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="circuit-card rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Notes</h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Private to your account</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3 dark:border-cyan-900 dark:bg-slate-950/50">
          <label htmlFor="personal-note-draft" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Capture an idea or reminder</label>
          <textarea id="personal-note-draft" value={draft} onChange={event => setDraft(event.target.value)}
            maxLength={10000} rows={3} placeholder="Write whatever you want to remember…"
            className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          <div className="mt-2 flex justify-end">
            <button type="button" disabled={!draft.trim() || busy || loading} onClick={addNote}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Save note
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading your notes…</p> : notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No notes yet. Capture your first reminder above.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notes.map(note => (
              <article key={note.id} className="flex min-h-36 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                {editingId === note.id ? (
                  <>
                    <textarea aria-label="Edit note" value={editBody} onChange={event => setEditBody(event.target.value)} maxLength={10000} rows={4}
                      className="w-full flex-1 resize-y rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300"><X size={14} /> Cancel</button>
                      <button type="button" disabled={!editBody.trim() || busy} onClick={() => updateNote(note.id)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} /> Save</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-100">{note.body}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                      <span className="text-xs text-slate-500">{new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(note.updated_at))}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" title="Edit note" aria-label="Edit note" disabled={busy} onClick={() => { setEditingId(note.id); setEditBody(note.body); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button>
                        <button type="button" title="Delete note" aria-label="Delete note" disabled={busy} onClick={() => deleteNote(note.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 size={15} /></button>
                        <button type="button" disabled={!canConvert} title={canConvert ? 'Create a task from this note' : 'Viewer accounts cannot create shared tasks'}
                          onClick={() => onConvert(note)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
                          Convert to Task <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
