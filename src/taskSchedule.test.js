import assert from 'node:assert/strict';
import { addTaskDays, snapToTaskWorkingDay, taskDaysBetween } from './taskSchedule.js';

assert.equal(snapToTaskWorkingDay({}, '2026-11-06'), '2026-11-08');
assert.equal(addTaskDays({}, '2026-11-05', 2), '2026-11-09');
assert.equal(addTaskDays({ friday_hours: 8.5 }, '2026-11-05', 2), '2026-11-08');
assert.equal(addTaskDays({ friday_hours: 8.5, saturday_hours: 8.5 }, '2026-11-05', 2), '2026-11-07');
assert.equal(addTaskDays({ extra_hours_per_day: 8.5 }, '2026-11-08', 2), '2026-11-09');
assert.equal(taskDaysBetween({ friday_hours: 8.5 }, '2026-11-05', '2026-11-08'), 2);
console.log('Task overtime and weekend scheduling checks passed');
