import assert from 'node:assert/strict';
import { addTaskDays, snapToTaskWorkingDay, taskDaysBetween } from './taskSchedule.js';

assert.equal(snapToTaskWorkingDay({}, '2026-11-06'), '2026-11-08');
assert.equal(addTaskDays({}, '2026-11-05', 2), '2026-11-08');
assert.equal(addTaskDays({ friday_hours: 8.5 }, '2026-11-05', 2), '2026-11-06');
assert.equal(addTaskDays({ friday_hours: 8.5, saturday_hours: 8.5 }, '2026-11-05', 2), '2026-11-06');
assert.equal(addTaskDays({ extra_hours_per_day: 8.5 }, '2026-11-08', 2), '2026-11-08');
assert.equal(taskDaysBetween({ friday_hours: 8.5 }, '2026-11-05', '2026-11-08'), 3);
console.log('Task overtime and weekend scheduling checks passed');

assert.equal(addTaskDays({}, '2026-11-01', 1), '2026-11-01');
assert.equal(addTaskDays({}, '2026-11-01', 2), '2026-11-02');
assert.equal(taskDaysBetween({}, '2026-11-01', '2026-11-02'), 2);
