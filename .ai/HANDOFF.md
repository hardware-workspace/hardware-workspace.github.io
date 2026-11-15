# Latest handoff

## 15 November 2026 — Gantt date and time

Added a live Cairo date/time readout to the Gantt controls, formatted day/month/year and 12-hour time with seconds and AM/PM. It updates once per second within its own component and cleans up its timer. `npm run build` passed; a fixed-time check produced `15/11/2026 03:04:05 PM`. Production publish and live verification are pending. Next step: publish, verify the live commit, then take the user's next request.

## 15 November 2026 — Calculator layouts

The scientific calculator now has three selectable layouts: Classic (ES-style), Explorer (EX-style), and Modern (CW-style). The scientific keys are reordered per layout, the latter two have direct engineering shortcuts, the calculator has larger keys and more room, and the selected layout persists locally. The existing math engine and computation state are shared across layouts. Changed `src/ScientificCalculator.tsx`, added `src/ScientificCalculator.css`, and widened its Tools panel in `src/HardwareToolsView.tsx`. `npm run check:focused` and `npm run build` passed. Commit `1e487b1` was pushed to `main`; `npm run deploy:verify` confirmed production serves that commit and its JavaScript entrypoint. Next step: take the user's next request. Historical details below remain for reference.

## Request and result

Latest request: removed the empty scratchpad hint, added pen and eraser cursors, and made Enter in the Vout input calculate Vout (`src/HardwareToolsView.tsx`). Build and live deployment must be verified against the latest commit.

Previous: added an interactive freehand sketchpad under the Voltage Divider Calculator with Pen/Eraser tools, ink colors, stroke widths, Undo/Clear, and expandable grid height.

Previous: added the full Casio/mathda-style `<ScientificCalculator />` module (`src/ScientificCalculator.tsx`) as the second tool inside the Tools tab (`src/HardwareToolsView.tsx`), complete with mint/dark LCD tape display, `SHIFT`/`ALPHA`/4-way D-pad/scientific & numeric keypads, 2-arg functions, complex & polar math, fractions (`S⇔D`), `ENG`, `° ' ”`, `FACT`, `CONST`, `CONV`, `STO`/`RCL`, calculus (`deriv`, `integrate`, `sum`, `prod`), and numeric/analytical `SOLVE`.

Previous: added a new "Tools" tab in `src/App.tsx` (desktop header & mobile bottom nav) with the Voltage Divider Calculator in `src/HardwareToolsView.tsx` supporting schematic display, Ω/kΩ/MΩ unit conversion, 4-way solving (`Vs`, `R1`, `R2`, `Vout`), orange target field indicator, and live circuit operating point stats.

Previous: replaced the repeated `header-circuit.jpg` background in the Sign-In left story panel (`src/AuthGate.tsx`, `src/auth.css`) with the looping video `src/assets/vid.mp4` (`<video className="auth-story-video" autoPlay loop muted playsInline />`) faded with a gradient mask and dark shade, while keeping `<CircuitElectricityOverlay />` layered on top.

Previous: added a live animated PCB circuit-trace electricity overlay (`<CircuitElectricityOverlay />` in `src/CircuitElectricityOverlay.tsx`, styled in `src/auth.css`) to the Sign-In left story panel (`src/AuthGate.tsx`) with glowing cyan electricity surges racing along 45-degree PCB traces, pulsing solder vias, and fixed background image scaling (`background-size: 380px auto`) so the circuit backdrop stays sharp on tall screens.

Previous: replaced the static glowing cyan dot in the header badge and section banners with `<SignalPulse />` (`src/SignalPulse.tsx`, styled in `src/index.css`), an animated hardware logic-analyzer / oscilloscope digital square-wave trace scrolling across a dashed reference grid with a pulsing sample probe. Applied in `src/App.tsx`, `src/Dashboard.tsx`, `src/AccountSettings.tsx`, `src/AdminPage.tsx`, and `src/AuthGate.tsx` (`src/auth.css`).

Previous: spread fading circuit-trace imagery across the entire website and blended the theme with it (`src/index.css`, `src/auth.css`, `src/App.tsx`, `src/Dashboard.tsx`, `src/AccountSettings.tsx`, `src/EmailPreferences.tsx`, `src/AdminPage.tsx`). Added reusable CSS utilities (`.circuit-banner`, `.circuit-card`, `.circuit-strip`, `.circuit-drawer-header`, `.circuit-modal-header`) plus ambient bottom-corner circuit watermarks and radial cyan/indigo/teal glows on `.workspace-shell` and `.workspace-main`. Applied them to the Auth login page, top header (both left and mirrored right accents), filter and Gantt toolbars, Gantt group rows, Dashboard overview banner and stat/chart cards, Kanban toolbar and columns, Team workload banner and member cards, Settings/Account/Email panels, Task detail drawer, Modal, and Admin page. Follow-up: styled secondary action controls inside `.circuit-banner` headers (`Export CSV` and `Refresh` in `src/AdminPage.tsx`, plus the project filter and `My tasks` button in `src/Dashboard.tsx`) as dark frosted-glass buttons with cyan borders/icons and explicit readable text so they no longer inherit white text on a white background.

Previous: replaced the header brand (gradient Layers icon tile) with a circuit-board photo anchored top-left of `<header className="workspace-header">` in `src/App.tsx`. The image is `src/assets/header-circuit.jpg` (cropped from a user upload to remove a Google Lens overlay icon), imported via Vite, drawn as an absolute background layer (460px, max 70% width) with a CSS `mask-image` gradient that fades to transparent on the right. The "CommTeam Task Manager" title stays. Follow-up (`eb58b4e`, live-verified): the white title was unreadable over the bright traces, so the image layer now has a dark left-to-right overlay, and the title sits on one line in a dark frosted-glass chip (cyan ring/glow, cyan dot) with white→cyan gradient text. Initial banner commit `e2bbb80`.

Previous: replaced the native HTML5 drag-and-drop with a pointer-event-based custom drag system for project and product rows. Now when you grab the ⠿ grip handle, a floating card follows your cursor showing the item type (Project/Product) and name in a dark rounded pill with a pop-in animation. The source row fades to 30 % opacity with a dashed outline. As you hover over other rows, the target row highlights with an indigo (project) or teal (product) top-border accent and glow. Releasing over a target row reorders; releasing elsewhere cancels. All CSS is in `src/index.css` (`.group-drag-floating-card`, `.drag-drop-target-project`, `.drag-drop-target-product`). The cursor is forced to `grabbing` globally during drag. Committed `253d5f2`.

Before that: admin rename showed "The account service is unavailable…". Verified the `admin-users` Edge Function IS deployed (returns its own 401 JSON). The message was a misleading fallback: `functions.invoke` hides non-2xx bodies in `error.context`. `src/AdminPage.tsx` now reads that body and shows the real reason (commit `c3e05ad`). Also fixed a stray Windows-1252 byte in the "Delete user…" button. Next step: get the real error text from the user; if it is the 403 "System administrator accounts…" guard, that is intentional server-side protection.

Before that: removed the "Rows 100% (Alt+Shift+Wheel)" hint from the Gantt controls bar (Alt+Shift+Wheel row zoom still works).

Before that: added text labels (Total, Done, In Progress, Blocked, Backlog, Overdue) beside each number in the compact header count pill in `src/App.tsx`.

Before that: added a compact single-row Gantt controls bar next to `Show Gantt controls` when the Gantt is in expanded / hidden-controls mode in `src/App.tsx` (Expand/Collapse All, Jump to Today, Week/Month/Quarter/Year period switch, Sort tasks, Dependencies toggle, and Zoom slider).

Earlier work: combined `Hide Gantt controls` and `Expand Gantt` into one toggle button on the top-left of the Gantt controls bar, removed the `Cairo · Weekend hours optional` badge from the top header, replaced the 6-card KPI strip with compact header numbers, and added the read-only 4-digit product number (`itemNumber`) to the `Edit product` modal.

## Scope and verification

- Modified `src/App.tsx` and these short memory files. No schema or production records were directly changed.
- `npm run check:focused`, `npm run build`, and a whitespace-aware diff check passed.
- GitHub commit and Pages deployment: check `git log -1` and the latest Pages workflow. Do not claim a live release without the workflow verification.
- Existing untracked user files were left untouched.

## Exact next step

Take the next user request. Read `AGENTS.md` and the short memory files, then inspect only relevant code.
