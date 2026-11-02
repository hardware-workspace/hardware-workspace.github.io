# Communication Team Task Manager — Technical Handoff Guide for Next AI / Engineer

This document explains the complete architecture, custom domain rules, and state structure of the **Communication Team Task Manager** so another AI assistant or developer can immediately extend the frontend (`App.jsx`) or wire it to a live Supabase backend.

---

## 1. Where the Code Lives
1. **Frontend Application (`App.jsx`)**:
   - Located in the primary code editor (`App.jsx`).
   - Built with **React 18**, **Tailwind CSS**, and **Lucide React** icons in a self-contained single-file architecture (easy to split into `src/components/*` and `src/lib/*` when moving to a multi-file Vite repo).
   - Contains a deterministic seed generator (`buildInitialDataset()`) that produces all **175 hardware-engineering tasks** across the 15 sheet tabs, pre-wired with dependencies, weights, planned/actual days, and blocked segments.
2. **Database Schema & RLS (`schema_and_seed.sql`)**:
   - Full PostgreSQL DDL, Row-Level Security (RLS) policies, Cairo weekend functions, and triggers.
3. **Dependencies (`package.json`)**:
   - Ready for `npm install && npm run dev`.

---

## 2. Core Domain & Business Rules Implemented

### A. Inverted Naming Hierarchy (`Project → Product → Task`)
- The database table `product_lines` represents top-level **Projects** in the UI (e.g. `Fire Alarm`, `Madinaty`, `SWM30`).
- The database table `projects` represents **Products** under a Project (e.g. `Sensor` under `Fire Alarm`).
- Every **Task** belongs to a **Product** (`project_id`).
- Users can create either a new Project or a new Product via the orange **"Create Project/Product"** button (`CreateProjectProductModal`).

### B. Cairo Timezone & Weekend Exclusion (Friday & Saturday Off)
- All dates operate in `Africa/Cairo` (`YYYY-MM-DD`).
- **Friday (`day === 5`) and Saturday (`day === 6`)** are weekend days off in Egypt:
  - `isWeekendCairo(dateStr)` shades Friday/Saturday columns on the Gantt chart and marks them `Off` in the Daily Weight row.
  - `snapToWorkingDay(dateStr, direction)` snaps any weekend start/end date to the nearest Sunday–Thursday working day.
  - `addDays(dateStr, workingDaysDelta)` and `diffDays(startStr, endStr)` automatically skip Fridays and Saturdays when calculating task end dates from `planned_days`.

### C. Planned Time vs. Actual Time vs. Blocked Time (All in Working Days)
- **`planned_days`** (numeric, e.g. `3` or `0.5` days):
  - Only **Managers** can edit `planned_days`.
  - Acts as the **main duration driver** on the Gantt chart (`due_date = addDays(start_date, planned_days)`).
- **`actual_days`** (numeric):
  - Editable by the **Assigned Member** or **Manager**.
  - When a task is marked `done` and `actual_days !== planned_days`, the Gantt renders a **dotted comparison bar** (`border-dashed`) showing whether the task finished early (green dotted bar) or exceeded planned time (red dotted bar).
- **`blocked_days`** (numeric):
  - When a task is moved to `blocked` (or has blocked days logged), the user enters both a required `blocked_reason` and `blocked_days` (e.g. `2d`).
  - The Gantt bar renders a **striped amber segment (`⏸ 2d`)** on the bar and extends the effective end date (`getEffectiveEndDate(task)`) by `blocked_days`.

### D. Priority (`P1–P4`) Split from Criticality (`Critical`, `High`, `Medium`, `Low`)
- `priority`: integer `1..4` (`P1` to `P4`).
- `criticality`: `'critical' | 'high' | 'medium' | 'low'`.
- Both are displayed on Gantt bars, Kanban cards, and inside the Task Side Panel.

### E. Task Weight (`1–10`) & Daily Person Capacity Overlay (`Weight / 10`)
- Every task has a `weight` between `1` and `10`.
- Each team member has a standard daily capacity of **`10` weight per day**.
- The visual color saturation/opacity of each Gantt bar scales dynamically with `task.weight` via `getWeightBarStyle(status, weight)`.
- The second sticky header row on the Gantt chart (**Daily Weight Overlay**) calculates the daily load:
  - **All Assignees (`Sum / 10 + Per Assignee`)**: Shows total combined team weight formatted as `24/10`, `33/10`, etc., with a hover tooltip breaking down each individual assignee's weight (`• Mohamed: 8/10`, `• Abdo: 7/10`).
  - **Peak Assignee / Day (`Peak / 10`)**: Shows the highest-loaded individual on that day.
  - **Individual Assignee (`Name / 10`)**: Shows that specific engineer's daily weight (`7/10`, or red if `>10/10`).

### F. Task Dependencies (Gantt Drag-to-Link + Auto-Cascade + Cascade Filter)
- Each task has `depends_on_id` pointing to its prerequisite task.
- **Auto-Shift Rule (`cascadeDependentTasks`)**: Whenever a prerequisite task is not `done` yet or its end date shifts, any dependent task is **automatically pushed/dragged to start at the effective end date of the prerequisite task**.
- **On-Gantt Editing**:
  - Drag the indigo circular handle (`●`) on the right edge of any Gantt bar and release over another Gantt bar to link them.
  - Click the red `×` badge in the middle of any dashed SVG dependency wire on the Gantt to unlink it.
- **In-Card Editing**:
  - Inside `TaskSidePanel`, the Dependency section uses plain language (*"Wait for this task to finish first"* and *"Tasks that will start after this one finishes"*) and includes a **1. Project → 2. Product → 3. Task** cascade filter.

### G. State Transition Modals & Split Task Feature
- **Backlog → In Progress**: Opens `inProgressModalState`, requiring the user to enter a kickoff note before starting.
- **Any Status → Done**: Opens `doneTransitionModalState`, prompting for `actual_days`, a completion note, and a **Next Step**:
  1. Send a review copy task to another team member.
  2. Create a related follow-up task.
  3. Link another existing task as dependent.
  4. Log completion note only.
- **Split Task (`SplitTaskModal`)**: Splits any task into **Part 1** and **Part 2** (with Part 2 automatically wired to depend on Part 1).

### H. Multi-Step Undo (`Ctrl + Z`)
- Every task mutation pushes a snapshot onto `undoHistory` (up to 30 steps).
- Pressing `Ctrl + Z` (or clicking the `Undo (N)` button in the top bar or bottom toast) steps backward through changes one by one.

---

## 3. How to Connect `App.jsx` to Live Supabase in 3 Steps

1. Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Run `schema_and_seed.sql` in the Supabase SQL Editor.
3. In `App.jsx`, replace the local state initializers (`useState(initialData.tasks)`) with `supabase.from('tasks').select('*')` and subscribe to Realtime changes:
```javascript
useEffect(() => {
  const channel = supabase
    .channel('realtime-comm-team')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      // Merge payload.new / payload.old into tasks state
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```