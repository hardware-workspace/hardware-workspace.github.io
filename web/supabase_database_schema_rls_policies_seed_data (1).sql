-- ============================================================================
-- COMMUNICATION TEAM TASK MANAGER — SUPABASE POSTGRESQL SCHEMA, RLS & SEED
-- Timezone: Africa/Cairo (Friday & Saturday = Weekend Days Off)
-- Hierarchy: product_lines (UI: Project) -> projects (UI: Product) -> tasks
-- ============================================================================

-- Enable UUID generation and pg_cron (for scheduled Cairo notifications)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- Enable in Supabase Dashboard -> Extensions

-- Set database session timezone to Cairo
ALTER DATABASE postgres SET timezone TO 'Africa/Cairo';

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1 USERS (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- In production: REFERENCES auth.users(id) ON DELETE CASCADE
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  is_active boolean DEFAULT true,
  color text DEFAULT 'bg-indigo-600',
  initials text,
  avatar_url text,
  notification_prefs jsonb DEFAULT '{
    "email_task_assigned": true,
    "email_due_reminder": true,
    "email_overdue": true,
    "email_blocked": true,
    "email_done": true,
    "email_comment": true,
    "email_weekly_summary": true
  }'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 1.2 PRODUCT LINES (Displayed in UI as top-level "Project", e.g., "Fire Alarm", "Madinaty")
CREATE TABLE IF NOT EXISTS public.product_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 1.3 PROJECTS (Displayed in UI as "Product" under a Project, e.g., "Sensor" under "Fire Alarm")
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_line_id uuid NOT NULL REFERENCES public.product_lines(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_priority smallint DEFAULT 2 CHECK (default_priority BETWEEN 1 AND 4),
  default_due_date date,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_line_id, name)
);

-- 1.4 TASKS (Assigned to a Product; includes Priority P1-P4, Criticality, Weight 1-10,
--     Planned Days, Actual Days, Blocked Days, and Dependency Link)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  priority smallint DEFAULT 2 CHECK (priority BETWEEN 1 AND 4), -- 1 = P1 (Highest) .. 4 = P4
  criticality text NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  weight smallint NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10), -- Daily person max = 10/day
  start_date date,
  due_date date,
  planned_days numeric(6,2) DEFAULT 1 CHECK (planned_days > 0), -- Main duration driver (set by Manager)
  actual_days numeric(6,2) DEFAULT 0 CHECK (actual_days >= 0),  -- Logged by Assignee / Manager
  blocked_days numeric(6,2) DEFAULT 0 CHECK (blocked_days >= 0), -- Represented as striped segment on Gantt
  depends_on_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL, -- Prerequisite task link
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'blocked', 'done')),
  blocked_reason text,
  approved_by text,
  time_spent_note text,
  position int DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  source_sheet text,
  source_row int,
  CONSTRAINT blocked_reason_required_when_blocked CHECK (
    status <> 'blocked' OR (blocked_reason IS NOT NULL AND length(trim(blocked_reason)) > 0)
  ),
  UNIQUE (source_sheet, source_row) -- Rule 17: Idempotent Excel re-imports
);

-- 1.5 COMMENTS (Threaded comments + state transition kickoff/completion notes)
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 1.6 ACTIVITY LOG (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'status_change', 'date_change', 'field_update', 'task_split'
  field text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- 1.7 NOTIFICATIONS (In-App & Email Adapter Log with Daily Deduplication)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'assigned', 'due_reminder', 'overdue', 'blocked', 'done',
    'comment', 'weekly_summary', 'manual_reminder'
  )),
  channel text NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'teams')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Deduplication index: No duplicate sends for (task_id, type, user_id, channel, calendar day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_daily
ON public.notifications (
  user_id,
  COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid),
  type,
  channel,
  ((created_at AT TIME ZONE 'Africa/Cairo')::date)
)
WHERE type <> 'manual_reminder';

-- ============================================================================
-- 2. CAIRO WORKING-DAY HELPER FUNCTIONS (Excludes Friday = 5 & Saturday = 6)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.snap_to_cairo_working_day(p_date date, p_direction int DEFAULT 1)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_date date := p_date;
BEGIN
  IF v_date IS NULL THEN
    RETURN NULL;
  END IF;
  -- PostgreSQL EXTRACT(DOW): Sunday=0, Monday=1, ..., Friday=5, Saturday=6
  WHILE EXTRACT(DOW FROM v_date) IN (5, 6) LOOP
    v_date := v_date + (CASE WHEN p_direction >= 0 THEN 1 ELSE -1 END);
  END LOOP;
  RETURN v_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_cairo_working_days(p_start date, p_working_days numeric)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_date date := public.snap_to_cairo_working_day(p_start, 1);
  v_remaining int := GREATEST(0, ROUND(COALESCE(p_working_days, 0))::int);
BEGIN
  IF v_date IS NULL THEN
    RETURN NULL;
  END IF;
  WHILE v_remaining > 0 LOOP
    v_date := v_date + 1;
    IF EXTRACT(DOW FROM v_date) NOT IN (5, 6) THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;
  RETURN v_date;
END;
$$;

-- ============================================================================
-- 3. AUTOMATED TRIGGERS (Auto-Dates, Completed_At, Dependency Cascade)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_tasks_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prereq RECORD;
  v_prereq_end date;
BEGIN
  NEW.updated_at := now();

  -- 1. Snap start_date to a valid Sun-Thu working day
  IF NEW.start_date IS NOT NULL THEN
    NEW.start_date := public.snap_to_cairo_working_day(NEW.start_date, 1);
    NEW.due_date := public.add_cairo_working_days(NEW.start_date, COALESCE(NEW.planned_days, 1));
  END IF;

  -- 2. Enforce Prerequisite Dependency Rule:
  --    If this task depends on a prerequisite task that is NOT 'done',
  --    ensure this task starts on or after the prerequisite's effective end date.
  IF NEW.depends_on_id IS NOT NULL THEN
    SELECT start_date, due_date, planned_days, blocked_days, status
      INTO v_prereq
      FROM public.tasks
     WHERE id = NEW.depends_on_id;

    IF FOUND AND v_prereq.start_date IS NOT NULL THEN
      v_prereq_end := public.add_cairo_working_days(
        COALESCE(v_prereq.due_date, v_prereq.start_date),
        COALESCE(v_prereq.blocked_days, 0)
      );
      IF v_prereq.status <> 'done' AND (NEW.start_date IS NULL OR NEW.start_date < v_prereq_end) THEN
        NEW.start_date := public.snap_to_cairo_working_day(v_prereq_end, 1);
        NEW.due_date := public.add_cairo_working_days(NEW.start_date, COALESCE(NEW.planned_days, 1));
      END IF;
    END IF;
  END IF;

  -- 3. Auto-manage completed_at timestamp when moving to/from 'done'
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    IF COALESCE(NEW.actual_days, 0) = 0 THEN
      NEW.actual_days := COALESCE(NEW.planned_days, 1);
    END IF;
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_task_write ON public.tasks;
CREATE TRIGGER before_task_write
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_tasks_before_write();

-- Cascade dependent child tasks whenever a parent task's dates or blocked_days change
CREATE OR REPLACE FUNCTION public.trg_cascade_dependent_tasks()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_end date;
BEGIN
  IF NEW.start_date IS NOT NULL THEN
    v_parent_end := public.add_cairo_working_days(
      COALESCE(NEW.due_date, NEW.start_date),
      COALESCE(NEW.blocked_days, 0)
    );

    UPDATE public.tasks
       SET start_date = public.snap_to_cairo_working_day(v_parent_end, 1),
           due_date   = public.add_cairo_working_days(public.snap_to_cairo_working_day(v_parent_end, 1), COALESCE(planned_days, 1))
     WHERE depends_on_id = NEW.id
       AND (NEW.status <> 'done' OR start_date IS NULL OR start_date < v_parent_end);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_task_update_cascade ON public.tasks;
CREATE TRIGGER after_task_update_cascade
AFTER UPDATE OF start_date, due_date, planned_days, blocked_days, status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_cascade_dependent_tasks();

-- ============================================================================
-- 4. COMPUTED VIEW (Includes `is_overdue` & `effective_end_date`)
-- ============================================================================

CREATE OR REPLACE VIEW public.tasks_with_computed AS
SELECT
  t.*,
  (
    t.status <> 'done'
    AND (
      (t.due_date IS NOT NULL AND t.due_date < (now() AT TIME ZONE 'Africa/Cairo')::date)
      OR (t.status = 'in_progress' AND t.actual_days > 0 AND t.planned_days > 0 AND t.actual_days > t.planned_days)
    )
  ) AS is_overdue,
  public.add_cairo_working_days(
    COALESCE(t.due_date, t.start_date),
    COALESCE(t.blocked_days, 0)
  ) AS effective_end_date
FROM public.tasks t;

-- ============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Is current authenticated user a Manager?
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'manager' AND is_active = true
  );
$$;

-- All authenticated users can SELECT tasks, projects, product_lines, users, comments
CREATE POLICY "Authenticated users can view all tasks"
  ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all product_lines"
  ON public.product_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all projects"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all users"
  ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all comments"
  ON public.comments FOR SELECT TO authenticated USING (true);

-- Tasks UPDATE: Managers can update ALL tasks; Members can update ONLY tasks where assignee_id = auth.uid()
CREATE POLICY "Managers update any task; Members update own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_manager() OR assignee_id = auth.uid())
  WITH CHECK (public.is_manager() OR assignee_id = auth.uid());

-- Tasks INSERT: Authenticated users can create tasks
CREATE POLICY "Authenticated users can insert tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tasks DELETE: Only Managers can delete tasks
CREATE POLICY "Only managers can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_manager());

-- Comments INSERT: Any authenticated user can comment on any task
CREATE POLICY "Any authenticated user can comment"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Product Lines & Projects write access: Managers only
CREATE POLICY "Managers manage product_lines"
  ON public.product_lines FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- ============================================================================
-- 6. SEED DATA (Users, 15 Top-Level Projects, Sample Products & Linked Tasks)
-- ============================================================================

INSERT INTO public.users (id, name, email, role, is_active, color, initials) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Mohamed',          'mohamed@company.com',      'manager', true,  'bg-indigo-600',  'MO'),
  ('11111111-1111-1111-1111-111111111102', 'Abdo',             'abdo@company.com',         'member',  true,  'bg-emerald-600', 'AB'),
  ('11111111-1111-1111-1111-111111111103', 'Hussein',          'hussein@company.com',      'member',  true,  'bg-sky-600',     'HU'),
  ('11111111-1111-1111-1111-111111111104', 'Ramy',             'ramy@company.com',         'member',  true,  'bg-amber-600',   'RA'),
  ('11111111-1111-1111-1111-111111111105', 'Hazem',            'hazem@company.com',        'member',  true,  'bg-rose-600',    'HA'),
  ('11111111-1111-1111-1111-111111111106', 'Architect',        'architect@company.com',    'member',  false, 'bg-slate-500',   'AR'),
  ('11111111-1111-1111-1111-111111111107', 'Eng Eslam',        'eslam@company.com',        'member',  false, 'bg-slate-500',   'ES'),
  ('11111111-1111-1111-1111-111111111108', 'Eng Mahmoud Reda', 'mahmoud.reda@company.com', 'member',  false, 'bg-slate-500',   'MR')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.product_lines (id, name, position) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Madinaty', 1),
  ('22222222-2222-2222-2222-222222222202', 'Fire Alarm', 2),
  ('22222222-2222-2222-2222-222222222203', 'Sensor', 3),
  ('22222222-2222-2222-2222-222222222204', 'SWM30', 4),
  ('22222222-2222-2222-2222-222222222205', 'USGM30 Gas meter', 5),
  ('22222222-2222-2222-2222-222222222206', 'LoRa', 6),
  ('22222222-2222-2222-2222-222222222207', 'RF Sniffer', 7),
  ('22222222-2222-2222-2222-222222222208', 'EG915', 8),
  ('22222222-2222-2222-2222-222222222209', 'PLC Sniffer', 9),
  ('22222222-2222-2222-2222-222222222210', 'Iraq EG800ZEU Modem flow meter', 10),
  ('22222222-2222-2222-2222-222222222211', 'DinRail', 11),
  ('22222222-2222-2222-2222-222222222212', 'Midar NA', 12),
  ('22222222-2222-2222-2222-222222222213', 'JICA', 13),
  ('22222222-2222-2222-2222-222222222214', 'Router', 14),
  ('22222222-2222-2222-2222-222222222215', 'Spain DCU', 15)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.projects (id, product_line_id, name, default_priority, default_due_date) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Madinaty Concentrator RF Mesh', 1, '2026-10-28'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'Sensor', 1, '2026-10-28'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202', 'Addressable Fire Panel Loop Card', 2, '2026-10-28'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222208', 'EG915 4G modem - Local Tender', 1, '2026-10-28')
ON CONFLICT (product_line_id, name) DO NOTHING;