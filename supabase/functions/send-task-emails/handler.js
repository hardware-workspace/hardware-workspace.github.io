// Portable worker handler. Dependencies are injected so tests never send real mail.
export function createTaskEmailHandler({ env, createDatabase, fetchEmail, pause, logError = () => {} }) {
  return async request => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    const secret = env('TASK_EMAIL_CRON_SECRET');
    if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
    // A sender key alone must not activate an unfinished notification deployment.
    if (env('TASK_EMAIL_ENABLED') !== 'true') return new Response('Email delivery is disabled', { status: 503 });
    const provider = env('TASK_EMAIL_PROVIDER') || 'resend';
    if (!['resend', 'brevo'].includes(provider)) return new Response('Unsupported email provider', { status: 503 });
    const key = env(provider === 'brevo' ? 'BREVO_API_KEY' : 'RESEND_API_KEY');
    const sender = provider === 'brevo' ? env('TASK_EMAIL_FROM_EMAIL') : env('TASK_EMAIL_FROM');
    const senderName = env('TASK_EMAIL_FROM_NAME') || 'Hardware Workspace';
    let site;
    try {
      site = new URL(env('TASK_EMAIL_SITE_URL'));
      if (site.protocol !== 'https:' || site.username || site.password) throw Error('Invalid site');
    } catch { return new Response('Configure an HTTPS workspace URL', { status: 503 }); }
    if (!key || !sender || !env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) return new Response('Email delivery is not configured', { status: 503 });
    const db = createDatabase();
    const prepared = await db.rpc('prepare_scheduled_task_emails');
    if (prepared.error) return new Response('Unable to prepare reminders', { status: 500 });
    const claimed = await db.rpc(provider === 'brevo' ? 'claim_brevo_task_emails' : 'claim_task_emails');
    if (claimed.error) return new Response('Unable to claim emails', { status: 500 });
    let accepted = 0;
    let failures = 0;
    for (const [index, message] of (claimed.data || []).entries()) {
      // Conservative sequential pacing; actual account limits are provider-controlled.
      if (index > 0) await pause(600);
      let receipt = null;
      try {
        const link = new URL(site);
        if (message.task_id) link.searchParams.set('task', message.task_id);
        const text = `${message.body}\n\nOpen workspace: ${link.href}\n\nManage email preferences in Settings â†’ Email notifications.`;
        const brevo = provider === 'brevo';
        const response = await fetchEmail(brevo ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails', {
          method: 'POST',
          headers: brevo ? { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }
            : { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `task-email/${message.id}` },
          body: JSON.stringify(brevo ? { sender: { email: sender, name: senderName }, to: [{ email: message.email }],
            subject: message.subject, textContent: text, headers: { idempotencyKey: message.id } }
            : { from: sender, to: [message.email], subject: message.subject, text }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        // Brevo documents duplicate_parameter for a reused UUID within its 30-minute TTL.
        // Treat this specific idempotency result as already processed, not a fresh send.
        const deduplicated = brevo && result.code === 'duplicate_parameter' && /idempotency/i.test(result.message || '');
        receipt = (brevo ? result.messageId : result.id) ?? null;
        if (deduplicated) receipt = `brevo-deduplicated:${message.id}`;
        if ((!response.ok && !deduplicated) || !receipt) throw Error(`Email provider returned ${response.status}`);
        const saved = await db.rpc('finish_task_email', { message_id: message.id, receipt, failure: null });
        if (saved.error) throw Error('Unable to record provider acceptance');
        accepted++;
      } catch (error) {
        failures++;
        // Keep any known provider receipt; do not store provider response bodies or keys.
        const saved = await db.rpc('finish_task_email', { message_id: message.id, receipt, failure: String(error) });
        if (saved.error) logError('Unable to record task email outcome');
      }
    }
    return Response.json({ accepted, failed: failures, processed: claimed.data?.length || 0 });
  };
}
