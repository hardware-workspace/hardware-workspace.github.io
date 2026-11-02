import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async request => {
  const secret = Deno.env.get('TASK_EMAIL_CRON_SECRET');
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', {status:401});
  const key = Deno.env.get('RESEND_API_KEY');
  const sender = Deno.env.get('TASK_EMAIL_FROM');
  const site = Deno.env.get('TASK_EMAIL_SITE_URL');
  if (!key || !sender || !site) return new Response('Email delivery is not configured', {status:503});
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false}});
  const prepared = await db.rpc('prepare_scheduled_task_emails');
  if (prepared.error) return new Response('Unable to prepare reminders', {status:500});
  const claimed = await db.rpc('claim_task_emails');
  if (claimed.error) return new Response('Unable to claim emails', {status:500});
  let accepted = 0;
  for (const message of claimed.data || []) {
    try {
      const link = new URL(site); if(message.task_id) link.searchParams.set('task',message.task_id);
      const response = await fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`task-email/${message.id}`},body:JSON.stringify({from:sender,to:[message.email],subject:message.subject,text:`${message.body}\n\nOpen workspace: ${link.href}\n\nManage email preferences in Settings → Email notifications.`}),signal:AbortSignal.timeout(15000)});
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(`Email provider returned ${response.status}`);
      const saved = await db.rpc('finish_task_email',{message_id:message.id,receipt:result.id,failure:null});
      if(saved.error) throw new Error('Unable to record provider acceptance');
      accepted++;
    } catch (error) {
      await db.rpc('finish_task_email',{message_id:message.id,receipt:null,failure:String(error)});
    }
  }
  return Response.json({accepted,processed:claimed.data?.length || 0});
});
