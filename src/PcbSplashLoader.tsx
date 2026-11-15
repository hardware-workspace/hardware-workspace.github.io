import React from 'react';

interface TraceSpec {
  id: string;
  d: string;
  delay: string;
  dur: string;
  thin?: boolean;
}

// Crisp 45-degree PCB traces that slowly draw outward across the #f8fafc background
// from around the center label toward all four edges of the viewport.
const SLOW_TRACES: TraceSpec[] = [
  // Upper-left quadrant expansion
  { id: 'ul-1', d: 'M 670 420 H 540 L 450 330 H 260 L 150 220 H -40', delay: '0s', dur: '4.6s' },
  { id: 'ul-2', d: 'M 670 432 H 525 L 435 342 H 245 L 135 232 H -40', delay: '0.25s', dur: '4.8s', thin: true },
  { id: 'ul-3', d: 'M 710 395 L 630 315 H 470 L 360 205 V 70 L 270 -20', delay: '0.4s', dur: '5.0s' },
  { id: 'ul-4', d: 'M 755 385 V 270 L 665 180 H 480 L 380 80 H 120 L 20 -20', delay: '0.6s', dur: '5.2s', thin: true },

  // Lower-left quadrant expansion
  { id: 'll-1', d: 'M 670 480 H 540 L 450 570 H 260 L 150 680 H -40', delay: '0.15s', dur: '4.7s' },
  { id: 'll-2', d: 'M 670 468 H 525 L 435 558 H 245 L 135 668 H -40', delay: '0.35s', dur: '4.9s', thin: true },
  { id: 'll-3', d: 'M 710 505 L 630 585 H 470 L 360 695 V 830 L 270 920', delay: '0.5s', dur: '5.1s' },
  { id: 'll-4', d: 'M 755 515 V 630 L 665 720 H 480 L 380 820 H 120 L 20 920', delay: '0.7s', dur: '5.3s', thin: true },

  // Upper-right quadrant expansion
  { id: 'ur-1', d: 'M 930 420 H 1060 L 1150 330 H 1340 L 1450 220 H 1640', delay: '0.1s', dur: '4.6s' },
  { id: 'ur-2', d: 'M 930 432 H 1075 L 1165 342 H 1355 L 1465 232 H 1640', delay: '0.3s', dur: '4.8s', thin: true },
  { id: 'ur-3', d: 'M 890 395 L 970 315 H 1130 L 1240 205 V 70 L 1330 -20', delay: '0.45s', dur: '5.0s' },
  { id: 'ur-4', d: 'M 845 385 V 270 L 935 180 H 1120 L 1220 80 H 1480 L 1580 -20', delay: '0.65s', dur: '5.2s', thin: true },

  // Lower-right quadrant expansion
  { id: 'lr-1', d: 'M 930 480 H 1060 L 1150 570 H 1340 L 1450 680 H 1640', delay: '0.2s', dur: '4.7s' },
  { id: 'lr-2', d: 'M 930 468 H 1075 L 1165 558 H 1355 L 1465 668 H 1640', delay: '0.4s', dur: '4.9s', thin: true },
  { id: 'lr-3', d: 'M 890 505 L 970 585 H 1130 L 1240 695 V 830 L 1330 920', delay: '0.55s', dur: '5.1s' },
  { id: 'lr-4', d: 'M 845 515 V 630 L 935 720 H 1120 L 1220 820 H 1480 L 1580 920', delay: '0.75s', dur: '5.3s', thin: true },

  // North & South vertical branches
  { id: 'n-1', d: 'M 800 380 V 210 L 740 150 V -20', delay: '0.2s', dur: '4.5s' },
  { id: 'n-2', d: 'M 812 380 V 220 L 870 162 V -20', delay: '0.45s', dur: '4.7s', thin: true },
  { id: 's-1', d: 'M 800 520 V 690 L 740 750 V 920', delay: '0.2s', dur: '4.5s' },
  { id: 's-2', d: 'M 812 520 V 680 L 870 738 V 920', delay: '0.45s', dur: '4.7s', thin: true },
];

const TRACE_VIAS: Array<{ x: number; y: number; delay: string }> = [
  // Inner start pads
  { x: 670, y: 420, delay: '0s' },
  { x: 670, y: 480, delay: '0.15s' },
  { x: 930, y: 420, delay: '0.1s' },
  { x: 930, y: 480, delay: '0.2s' },
  { x: 710, y: 395, delay: '0.4s' },
  { x: 710, y: 505, delay: '0.5s' },
  { x: 890, y: 395, delay: '0.45s' },
  { x: 890, y: 505, delay: '0.55s' },
  { x: 800, y: 380, delay: '0.2s' },
  { x: 800, y: 520, delay: '0.2s' },

  // Mid vertices
  { x: 540, y: 420, delay: '0.8s' },
  { x: 450, y: 330, delay: '1.3s' },
  { x: 540, y: 480, delay: '0.9s' },
  { x: 450, y: 570, delay: '1.4s' },
  { x: 1060, y: 420, delay: '0.85s' },
  { x: 1150, y: 330, delay: '1.35s' },
  { x: 1060, y: 480, delay: '0.95s' },
  { x: 1150, y: 570, delay: '1.45s' },
  { x: 630, y: 315, delay: '1.1s' },
  { x: 630, y: 585, delay: '1.2s' },
  { x: 970, y: 315, delay: '1.15s' },
  { x: 970, y: 585, delay: '1.25s' },

  // Outer vertices
  { x: 260, y: 330, delay: '2.1s' },
  { x: 150, y: 220, delay: '2.7s' },
  { x: 260, y: 570, delay: '2.2s' },
  { x: 150, y: 680, delay: '2.8s' },
  { x: 1340, y: 330, delay: '2.15s' },
  { x: 1450, y: 220, delay: '2.75s' },
  { x: 1340, y: 570, delay: '2.25s' },
  { x: 1450, y: 680, delay: '2.85s' },
  { x: 360, y: 205, delay: '2.3s' },
  { x: 360, y: 695, delay: '2.4s' },
  { x: 1240, y: 205, delay: '2.35s' },
  { x: 1240, y: 695, delay: '2.45s' },
];

export default function PcbSplashLoader({ label = 'Checking workspace access...' }: { label?: string }) {
  return (
    <div className="auth-loading pcb-splash" role="status" aria-live="polite">
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="pcb-splash-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pcb-slow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.48" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.38" />
          </linearGradient>
        </defs>

        {/* Subtle static guide tracks on the #f8fafc background */}
        <g>
          {SLOW_TRACES.map((t) => (
            <path key={`${t.id}-base`} d={t.d} className="pcb-splash-track-base" />
          ))}
        </g>

        {/* Slowly drawn PCB traces expanding outward across the same #f8fafc background */}
        <g>
          {SLOW_TRACES.map((t) => (
            <path
              key={t.id}
              d={t.d}
              pathLength={100}
              className={`pcb-splash-trace-draw ${t.thin ? 'pcb-splash-trace-thin' : 'pcb-splash-trace-main'}`}
              style={{
                animationDuration: t.dur,
                animationDelay: t.delay,
              }}
            />
          ))}
        </g>

        {/* Small PCB solder pads/vias along the slowly drawn traces */}
        <g>
          {TRACE_VIAS.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r="3.2"
              className="pcb-splash-via"
              style={{ animationDelay: v.delay }}
            />
          ))}
        </g>
      </svg>

      <span className="pcb-splash-text">{label}</span>
    </div>
  );
}
