export const STANDARD_DAY_HOURS = 8.5;

const dateAtUtc = (iso) => new Date(`${iso}T00:00:00Z`);
const nextDate = (date) => { date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); };
const boundedHours = (value) => Math.max(0, Math.min(16, Number(value) || 0));

export function taskHoursOnDate(task, iso) {
  if (!iso) return 0;
  const day = dateAtUtc(iso).getUTCDay();
  if (Number.isNaN(day)) return 0;
  if (day === 5) return boundedHours(task?.friday_hours);
  if (day === 6) return boundedHours(task?.saturday_hours);
  return STANDARD_DAY_HOURS + Math.min(15.5, boundedHours(task?.extra_hours_per_day));
}

export function snapToTaskWorkingDay(task, iso) {
  if (!iso) return null;
  const date = dateAtUtc(iso);
  if (Number.isNaN(date.getTime())) return null;
  let current = iso;
  for (let i = 0; i < 7 && !taskHoursOnDate(task, current); i++) current = nextDate(date);
  return current;
}

// Due dates include the last day worked.
export function addTaskDays(task, startIso, plannedDays) {
  const start = snapToTaskWorkingDay(task, startIso);
  if (!start) return null;
  let remaining = Math.max(0, Number(plannedDays) || 0) * STANDARD_DAY_HOURS;
  const date = dateAtUtc(start);
  let current = start;
  for (let i = 0; i < 3660; i++) {
    if (remaining <= 0) return current;
    remaining -= taskHoursOnDate(task, current);
    if (remaining <= 1e-9) return current;
    current = nextDate(date);
  }
  return null;
}

export function taskDaysBetween(task, startIso, endIso) {
  if (!startIso || !endIso || endIso < startIso) return 0.5;
  const date = dateAtUtc(startIso);
  if (Number.isNaN(date.getTime())) return 0.5;
  let current = startIso;
  let hours = 0;
  for (let i = 0; i < 3660 && current <= endIso; i++) {
    hours += taskHoursOnDate(task, current);
    current = nextDate(date);
  }
  return Math.max(0.5, Math.round(hours / STANDARD_DAY_HOURS * 10) / 10);
}
