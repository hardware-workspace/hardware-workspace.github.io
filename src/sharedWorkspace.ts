import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';

const empty = { productLines: [], projects: [], tasks: [], comments: [], activityLog: [] };

export function useSharedWorkspace(seed, shared) {
  const [state, setState] = useState(shared ? empty : seed);
  const [ready, setReady] = useState(!shared);
  const [status, setStatus] = useState('');
  const [remoteRevision, setRemoteRevision] = useState(0);
  const [retry, setRetry] = useState(0);
  const baseline = useRef(null);
  const latest = useRef(state);
  latest.current = state;
  const running = useRef(false);
  const conflict = useRef(false);

  useEffect(() => {
    if (!shared) return;
    let active = true;
    async function read() {
      if (running.current || (baseline.current && latest.current !== baseline.current.state)) return;
      const before = baseline.current;
      running.current = true;
      try {
        const {data,error} = await supabase.rpc('read_shared_workspace');
        if (!active || latest.current !== (before?.state ?? empty)) return;
        if (error || !data?.state) throw error || new Error('Workspace unavailable');
        if (!before || data.revision !== before.revision) {
          baseline.current = data;
          latest.current = data.state;
          setState(data.state);
          setRemoteRevision(data.revision);
        }
        setReady(true);
        setStatus('');
      } catch {
        if (active) setStatus('Could not load the shared workspace. Retrying automatically.');
      } finally { running.current = false; }
    }
    void read();
    const interval = setInterval(read, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [shared, retry]);

  useEffect(() => {
    if (!shared || !ready || state === baseline.current?.state || conflict.current) return;
    let stopped = false;
    let timer;
    async function save() {
      if (stopped) return;
      if (running.current) { timer = setTimeout(save, 100); return; }
      running.current = true;
      const snapshot = latest.current;
      setStatus('Saving workspace…');
      try {
        const {data,error} = await supabase.rpc('save_shared_workspace', {
          expected_revision: baseline.current.revision, next_state: snapshot,
        });
        if (error) throw error;
        baseline.current = { revision: data, state: snapshot };
        conflict.current = false;
        setStatus(latest.current === snapshot ? 'Saved to shared workspace' : 'Saving workspace…');
      } catch (error) {
        conflict.current = true;
        setStatus(error.code === '40001'
          ? 'Someone else saved changes. Your edits are still on this screen. Reload the shared copy before editing again.'
          : error.code === '42501' || error.code === '22023'
          ? error.message
          : `Save failed (${error?.code || 'network'}): ${error?.message || 'Connection unavailable'}. Your edits remain on this screen. Retry save when the issue is resolved.`);
      } finally { running.current = false; }
    }
    timer = setTimeout(save, 900);
    return () => { stopped = true; clearTimeout(timer); };
  }, [state, shared, ready, retry]);

  useEffect(() => {
    if (!shared) return;
    const warn = event => {
      if (!baseline.current || latest.current === baseline.current.state) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [shared]);

  function setter(key) {
    return value => setState(previous => {
      const next = typeof value === 'function' ? value(previous[key]) : value;
      return next === previous[key] ? previous : {...previous, [key]:next};
    });
  }
  return { state, setter, ready, status, remoteRevision, failed: conflict.current,
    retrySave() { conflict.current = false; setRetry(value => value + 1); },
    reload() {
      if (running.current || !window.confirm('Discard unsaved edits and reload the shared workspace?')) return;
      conflict.current = false;
      latest.current = baseline.current?.state ?? empty;
      setState(latest.current);
      setRetry(value => value + 1);
    },
  };
}
