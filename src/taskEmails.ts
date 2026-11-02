import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
export const realAccount = id => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id || '');
export function useTaskEmailEvents(tasks, comments, account) {
  const previous = useRef(null);
  const chain = useRef(Promise.resolve());
  const [error, setError] = useState('');
  useEffect(() => {
    const old = previous.current;
    previous.current = {tasks:new Map(tasks.map(t=>[t.id,{...t}])),comments:new Set(comments.map(c=>c.id))};
    if (!old || !realAccount(account.id) || !supabase) return;
    const events = [];
    for (const task of tasks) {
      const before = old.tasks.get(task.id);
      if (!realAccount(task.assignee_id) && !realAccount(before?.assignee_id)) continue;
      if (!before || ['assignee_id','status','due_date','title'].some(key=>task[key]!==before[key])) {
        events.push({task_data:{id:task.id,title:task.title,status:task.status,due_date:task.due_date || null,assignee_id:realAccount(task.assignee_id)?task.assignee_id:null},event_id:crypto.randomUUID()});
      }
    }
    for (const [id,task] of old.tasks) if(realAccount(task.assignee_id) && !tasks.some(t=>t.id===id)) events.push({task_data:{id},event_id:crypto.randomUUID(),removed:true});
    for (const comment of comments) {
      const task = tasks.find(t=>t.id===comment.task_id);
      if(!old.comments.has(comment.id) && task && realAccount(task.assignee_id)) events.push({task_data:{id:task.id},event_id:comment.id,comment_body:comment.body});
    }
    // Preserve task-before-comment ordering and avoid replacing the signed-in session.
    for (const event of events) chain.current=chain.current.then(async()=>{
      let failure;
      for(let attempt=0;attempt<2;attempt++) {
        const result=await supabase.rpc('record_task_email_event',event); failure=result.error;
        if(!failure) break;
      }
      if(failure) setError('Task email updates could not be saved. Email setup may be pending; your task edit remains in this workspace.');
    }).catch(()=>setError('Task email updates could not be saved. Check your connection.'));
  }, [tasks,comments,account.id]);
  return error;
}
