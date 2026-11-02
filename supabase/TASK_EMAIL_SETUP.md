# Task notification email setup (pending deployment)

Emails are sent only to the current task assignee. Assignments, status changes, comments/mentions, approaching deadlines, overdue reminders, and daily/weekly summaries are supported. Users edit preferences in Settings → Email notifications. Weekly summaries run on Monday after 09:00 Africa/Cairo; daily summaries run after 09:00. Due and overdue reminders are limited to one per task/assignee/Cairo calendar day. New registered assignees receive default preferences when a task is saved. The defaults enable immediate notifications and weekly summaries.

## Deployment

1. Apply migration `202611020002_task_emails.sql` after the existing account setup. It creates RLS-protected preferences, private task snapshots, a private email queue, and server-authorized event functions. Browser callers cannot select recipients or provide destination email addresses. Public signup continues to permit manager/member as requested.
2. Configure a verified Resend sender/domain. Set server secrets `RESEND_API_KEY`, `TASK_EMAIL_FROM`, `TASK_EMAIL_SITE_URL=https://hardware-workspace.github.io/`, and a random `TASK_EMAIL_CRON_SECRET`. Never put service or email keys in Vite variables.
3. Deploy `send-task-emails` using the accompanying config. This worker validates the custom cron bearer secret. It does not accept user payloads. Configure Supabase Cron to POST to the worker every five minutes with `Authorization: Bearer <TASK_EMAIL_CRON_SECRET>`, retrieving the secret from Supabase Vault. The function uses its server-only service-role key for queue operations.
4. Test on controlled real accounts: assignment, every status, comment, @full-name / @email mentions, reassignment, removal, inactive user, preference opt-out, due/overdue Cairo dates, and both summary schedules. Verify non-manager users cannot create or reassign notification tasks, and cannot update other assignees' snapshots.

## Delivery and existing storage limitations

Task changes queue notifications only for registered UUID accounts. Seed/demo assignees cannot receive mail. The app loads the active registered account directory when this migration is available. Event writes are ordered and retried once with the same event ID. The UI reports failed writes; refreshing the page does not recover unsaved task events.

This is a notification snapshot store, not full shared workspace persistence. Existing task/project/comment editing still runs in browser memory. Saved notification snapshots remain available for scheduled mail when the browser is closed, until explicitly updated or removed. After refresh, task edits may be lost while the last notification snapshot remains. Full shared workspace storage must be completed before production use; otherwise reminder data can become stale. Email links open the workspace; task details open only when that task exists in the loaded workspace.

Delivery resolves current profile emails and preferences server-side. Former assignees, removed tasks, disabled users, and opted-out categories are skipped. Due/overdue messages are skipped for completed tasks. Queue IDs provide Resend idempotency keys. Five attempts are allowed with leases/backoff; work expires after 23 hours to stay within provider idempotency retention. This avoids automatic retry after the deduplication window, but means older failed mail is not automatically delivered. Queue records distinguish provider acceptance from delivery; actual inbox delivery is not asserted. A per-user queue cap of 100 per 24 hours limits repeated notifications. Summaries are snapshots of assigned tasks, not an activity-history report.

No production migration, schedule, sender verification, account access, or live delivery has been performed. Frontend build and account-access tests passed locally; backend database and email integration tests remain pending a configured development Supabase/Resend environment.

References: https://supabase.com/docs/guides/functions/schedule-functions and https://resend.com/docs/dashboard/emails/idempotency-keys
