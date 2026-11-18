# Meaningful development changes

- 18 November 2026: Fixed the header notification bell being unresponsive-looking by removing the header's `overflow-hidden` (it clipped the popover) and anchoring the popover with `top-full` in `src/App.tsx`.

- 17 November 2026: Raised Gantt dependency SVG wire overlay from `z-15` to `z-25` so wires appear *over* task bars. Removed the single-assignee product lock that blocked changing a task's assignee when the product had only one assignee.

- 16 November 2026: Defaulted Gantt task sorting to `Start date` (`taskSort = 'start_date'`) in `src/App.tsx`.

- 16 November 2026: Added multiple-dependency support (`src/App.tsx`) so tasks can wait for multiple prerequisite tasks to finish and link to multiple dependent tasks across the Gantt chart, Task Detail Drawer, and New Task modal.

- 16 November 2026: Added a persistent Hide/Show Done tasks toggle button in the Gantt `TASKS` column header (`src/App.tsx`).

- 16 November 2026: Built a full native interactive Online Smith Chart & RF impedance matching module in `src/SmithChartTool.tsx` (with optional `onlinesmithchart.com` frame/external link).

- 16 November 2026: Reworked the workspace header to reflow at different browser zoom levels and added Online Smith Chart as the fourth Tool.

- 16 November 2026: Added private, account-specific Notes with a prefilled Convert to Task flow and a guarded member conversion endpoint. Reconciled migration history and deployed owner-only Notes storage.

- 15 November 2026: Added three selectable scientific calculator layouts with larger controls and direct shortcuts, sharing the existing calculation engine.

- 10 November 2026: Added provider-independent agent instructions and shared session memory. No application or database behavior changed.
- 10 November 2026: Added Gantt project/product drag ordering, task sorting and completed-title styling; refreshed the database assignee directory during use.
- 10 November 2026: Replaced Gantt task-column lock button text with lock/unlock icons, displayed the 4-digit product number in the Edit product dialog, replaced the large 6-card KPI row with a compact numbers-only strip in the top header, removed the Cairo subtitle badge, combined Hide Gantt controls + Expand Gantt into one button on the top-left of the Gantt controls, and added compact Gantt controls in the expanded top bar.
