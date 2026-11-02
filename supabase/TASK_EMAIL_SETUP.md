# Task notification email setup and activation

## Current provider choice: Brevo (local preparation only)

The user chose Brevo because they do not own a sending domain. Set `TASK_EMAIL_PROVIDER=brevo`; the worker retains the Resend option when explicitly configured or when the selector is omitted. There is no automatic provider failover, to avoid duplicate deliveries.

Brevo uses `POST https://api.brevo.com/v3/smtp/email`, an HTTP `api-key` header, a sender object, recipient objects, `textContent`, and the returned `messageId`. It does not use Resend's authorization or idempotency headers.

### Brevo user setup

1. Create/sign into Brevo and complete account onboarding or transactional-sending activation/review if requested. Account approval and sending availability are determined by Brevo.
2. Under Senders, add the personal email address you control and verify the code/link sent there. A Gmail or similar address cannot be domain-authenticated; Brevo may replace its visible sender domain with `brevosend.com`. Do not promise that a personal sender will always be approved or delivered. An owned authenticated domain is still preferable later.
3. Create a **Brevo API key**, not an SMTP key. Add it privately to Supabase Edge Functions Secrets as `BREVO_API_KEY`.
4. Configure server secrets: `TASK_EMAIL_PROVIDER=brevo`, `TASK_EMAIL_FROM_EMAIL=<verified personal email>`, `TASK_EMAIL_FROM_NAME=Hardware Workspace`, `TASK_EMAIL_SITE_URL=https://hardware-workspace.github.io/`, `TASK_EMAIL_CRON_SECRET=<strong private token>`, and `TASK_EMAIL_ENABLED=false` until an authorized controlled test. Do not place provider keys in Vite variables or chat.
5. On submit, apply NEW migration `202611020003_brevo_retry_window.sql` and deploy BOTH `index.ts` and `handler.js`. Do not rerun the already-applied base notification migration. Configure gateway authentication and Cron as described below; no live configuration was changed during this review.
6. Complete durable shared task storage and provider-wide quotas before production activation. With user authorization, test one controlled recipient first, verify the actual inbox result, then enable scheduling. A personal sender does not remove these application prerequisites.

### Brevo-specific retry semantics

Official Brevo documentation specifies a UUID `idempotencyKey` inside the JSON `headers` object, a 30-minute retention window, and `duplicate_parameter` on duplicate requests. The worker uses its queue UUID and recognizes only an explicit idempotency duplicate response as already processed. The new Brevo claim RPC stops retries 25 minutes after the first claim, leaving margin below the provider window. Resend keeps its existing 23-hour queue window and HTTP `Idempotency-Key`. Never switch a partly processed queue between providers; reconcile it first. An ambiguous or expired attempt needs manual review, not an automatic resend beyond the provider window.

References checked 2 November 2026:
- https://developers.brevo.com/reference/send-transac-email
- https://developers.brevo.com/docs/heterogenous-versions-batch-emails
- https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email
- https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication

## Original Resend option and common queue architecture

Emails are sent only to the current task assignee. Assignments, status changes, comments/mentions, approaching deadlines, overdue reminders, and daily/weekly summaries are supported. Users edit preferences in Settings → Email notifications. Weekly summaries run on Monday after 09:00 Africa/Cairo; daily summaries run after 09:00. Due and overdue reminders are limited to one per task/assignee/Cairo calendar day. New registered assignees receive default preferences when a task is saved. The defaults enable immediate notifications and weekly summaries.

## Deployment

1. Apply migration `202611020002_task_emails.sql` after the existing account setup. It creates RLS-protected preferences, private task snapshots, a private email queue, and server-authorized event functions. Browser callers cannot select recipients or provide destination email addresses. Public signup continues to permit manager/member as requested.
2. Configure a verified Resend sender/domain. Set server secrets `RESEND_API_KEY`, `TASK_EMAIL_FROM`, `TASK_EMAIL_SITE_URL=https://hardware-workspace.github.io/`, and a random `TASK_EMAIL_CRON_SECRET`. Never put service or email keys in Vite variables.
3. Deploy `send-task-emails` using the accompanying config. This worker validates the custom cron bearer secret. It does not accept user payloads. Configure Supabase Cron to POST to the worker every five minutes with `Authorization: Bearer <TASK_EMAIL_CRON_SECRET>`, retrieving the secret from Supabase Vault. The function uses its server-only service-role key for queue operations.
4. Test on controlled real accounts: assignment, every status, comment, @full-name / @email mentions, reassignment, removal, inactive user, preference opt-out, due/overdue Cairo dates, and both summary schedules. Verify non-manager users cannot create or reassign notification tasks, and cannot update other assignees' snapshots.

## Delivery and existing storage limitations

Task changes queue notifications only for registered UUID accounts. Seed/demo assignees cannot receive mail. The app loads the active registered account directory when this migration is available. Event writes are ordered and retried once with the same event ID. The UI reports failed writes; refreshing the page does not recover unsaved task events.

This is a notification snapshot store, not full shared workspace persistence. Existing task/project/comment editing still runs in browser memory. Saved notification snapshots remain available for scheduled mail when the browser is closed, until explicitly updated or removed. After refresh, task edits may be lost while the last notification snapshot remains. Full shared workspace storage must be completed before production use; otherwise reminder data can become stale. Email links open the workspace; task details open only when that task exists in the loaded workspace.

Delivery resolves current profile emails and preferences server-side. Former assignees, removed tasks, disabled users, and opted-out categories are skipped. Due/overdue messages are skipped for completed tasks. For the Resend option, queue IDs provide Resend idempotency keys. Five attempts are allowed with leases/backoff; work expires after 23 hours to stay within Resend idempotency retention. The Brevo option uses the shorter retry window described above. This avoids automatic retry after the deduplication window, but means older failed mail is not automatically delivered. Queue records distinguish provider acceptance from delivery; actual inbox delivery is not asserted. A per-user queue cap of 100 per 24 hours limits repeated notifications. Summaries are snapshots of assigned tasks, not an activity-history report.

The migration and original worker have been deployed to the connected project. SQL queue tests were rolled back; account/access checks passed. No sender verification, provider keys, schedule, or real email delivery has been configured. The original deployed worker remains inactive with the legacy JWT gateway ON.

References: https://supabase.com/docs/guides/functions/schedule-functions and https://resend.com/docs/dashboard/emails/idempotency-keys



## Local Resend integration review - 2 November 2026

The user confirmed that no Resend account or sending domain is set up. No emails were sent and no production settings were changed during this review.

Local changes, not deployed: the worker is split into index.ts and handler.js. The handler requires TASK_EMAIL_ENABLED=true in addition to its cron secret and provider secrets, validates an HTTPS workspace URL, accepts POST only, paces requests conservatively, reports failed counts, and preserves a known provider receipt if saving the outcome fails. Deploy BOTH source files together. The previously deployed original worker does not yet contain this enable switch.

Run isolated tests without any provider/network access:

    node supabase/functions/send-task-emails/handler.test.js

Tests cover unauthorized/missing-secret calls, disabled delivery, invalid/missing config, HTTP methods, assignee-only payloads, queue idempotency keys, request pacing, provider rejection, and receipt-recording errors. Real provider delivery and SQL integration still need configured tests.

### User setup steps

1. Create a Resend account. Add a domain you own in Domains, install its DNS records with your domain provider, and wait for verification. github.io is not a sending domain you control.
2. Choose a sender such as notifications@your-owned-domain.com. Create a sending API key scoped to that domain where supported. Store the key privately in Supabase Edge Functions Secrets, never in frontend code or chat.
3. Configure RESEND_API_KEY, TASK_EMAIL_FROM, TASK_EMAIL_SITE_URL=https://hardware-workspace.github.io/, TASK_EMAIL_CRON_SECRET, and TASK_EMAIL_ENABLED=false initially.
4. Do NOT rerun the original CREATE migration on the current project: it is already applied. Review any future schema changes as a new migration.
5. On submit, deploy index.ts AND handler.js. Current gateway JWT verification is ON, whereas config.toml describes the future custom-secret setup with verification OFF. Changing that protection needs confirmation; alternatively retain gateway verification and consistently use an appropriate server-signed bearer token as the worker secret. An opaque custom secret will not pass the legacy JWT gateway.
6. Finish shared task persistence and add a provider-wide daily/monthly budget before production activation. The existing 100-per-user cap is not the whole account's free-tier limit.
7. With user authorization, enable delivery only for a controlled test, verify the actual inbox result, then configure Cron using Vault-held credentials. Keep the schedule disabled when configuration is incomplete.

Additional review points: keep sender, recipient and message payload stable across retries because Resend checks identical payloads for idempotency keys; profile email changes mid-retry may require manual conflict handling. Provider acceptance is not inbox delivery. Add bounce/delivery monitoring as needed. Notification snapshots still become stale when in-memory workspace tasks reset; a durable transactional task/comment event feed is the production target.
