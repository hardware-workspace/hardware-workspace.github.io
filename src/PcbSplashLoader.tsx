import React from 'react';
import SignalPulse from './SignalPulse';

interface TraceSpec {
  id: string;
  d: string;
  delay: string;
  dur: string;
  tier: 'primary' | 'secondary' | 'bus';
}

// 24 45-degree PCB traces radiating from the central MCU die (800, 450)
// outward through inner, mid, and outer routing rings to all edges of the 1600x900 viewport.
const EXPANDING_TRACES: TraceSpec[] = [
  // Left & Upper-Left bus routes
  { id: 'tl-1', d: 'M 740 430 H 620 L 530 340 H 340 L 220 220 H -40', delay: '0s', dur: '1.5s', tier: 'primary' },
  { id: 'tl-2', d: 'M 740 442 H 605 L 505 342 H 310 L 180 212 H -40', delay: '0.08s', dur: '1.55s', tier: 'bus' },
  { id: 'tl-3', d: 'M 755 410 L 680 335 H 520 L 410 225 V 80 L 310 -20', delay: '0.12s', dur: '1.6s', tier: 'secondary' },
  { id: 'tl-4', d: 'M 740 450 H 560 L 480 370 H 240 L 140 270 H -40', delay: '0.05s', dur: '1.45s', tier: 'primary' },
  { id: 'tl-5', d: 'M 770 390 V 290 L 670 190 H 460 L 350 80 H 80 L -20 -20', delay: '0.18s', dur: '1.65s', tier: 'secondary' },

  // Left & Lower-Left bus routes
  { id: 'bl-1', d: 'M 740 462 H 590 L 500 552 H 290 L 170 672 H -40', delay: '0.04s', dur: '1.5s', tier: 'primary' },
  { id: 'bl-2', d: 'M 740 474 H 610 L 520 564 H 320 L 195 689 H -40', delay: '0.1s', dur: '1.55s', tier: 'bus' },
  { id: 'bl-3', d: 'M 755 490 L 675 570 H 490 L 370 690 V 820 L 270 920', delay: '0.15s', dur: '1.6s', tier: 'secondary' },
  { id: 'bl-4', d: 'M 770 510 V 610 L 680 700 H 450 L 340 810 H 90 L -20 920', delay: '0.2s', dur: '1.65s', tier: 'primary' },

  // Right & Upper-Right bus routes
  { id: 'tr-1', d: 'M 860 430 H 980 L 1070 340 H 1260 L 1380 220 H 1640', delay: '0s', dur: '1.5s', tier: 'primary' },
  { id: 'tr-2', d: 'M 860 442 H 995 L 1095 342 H 1290 L 1420 212 H 1640', delay: '0.08s', dur: '1.55s', tier: 'bus' },
  { id: 'tr-3', d: 'M 845 410 L 920 335 H 1080 L 1190 225 V 80 L 1290 -20', delay: '0.12s', dur: '1.6s', tier: 'secondary' },
  { id: 'tr-4', d: 'M 860 450 H 1040 L 1120 370 H 1360 L 1460 270 H 1640', delay: '0.05s', dur: '1.45s', tier: 'primary' },
  { id: 'tr-5', d: 'M 830 390 V 290 L 930 190 H 1140 L 1250 80 H 1520 L 1620 -20', delay: '0.18s', dur: '1.65s', tier: 'secondary' },

  // Right & Lower-Right bus routes
  { id: 'br-1', d: 'M 860 462 H 1010 L 1100 552 H 1310 L 1430 672 H 1640', delay: '0.04s', dur: '1.5s', tier: 'primary' },
  { id: 'br-2', d: 'M 860 474 H 990 L 1080 564 H 1280 L 1405 689 H 1640', delay: '0.1s', dur: '1.55s', tier: 'bus' },
  { id: 'br-3', d: 'M 845 490 L 925 570 H 1110 L 1230 690 V 820 L 1330 920', delay: '0.15s', dur: '1.6s', tier: 'secondary' },
  { id: 'br-4', d: 'M 830 510 V 610 L 920 700 H 1150 L 1260 810 H 1510 L 1620 920', delay: '0.2s', dur: '1.65s', tier: 'primary' },

  // North & South vertical expansion spines
  { id: 'n-1', d: 'M 790 390 V 240 L 730 180 V 50 L 660 -20', delay: '0.06s', dur: '1.4s', tier: 'primary' },
  { id: 'n-2', d: 'M 800 390 V 150 L 850 100 V -20', delay: '0.02s', dur: '1.35s', tier: 'bus' },
  { id: 'n-3', d: 'M 812 390 V 230 L 880 162 H 1010 L 1090 82 V -20', delay: '0.14s', dur: '1.5s', tier: 'secondary' },
  { id: 's-1', d: 'M 790 510 V 660 L 730 720 V 850 L 660 920', delay: '0.06s', dur: '1.4s', tier: 'primary' },
  { id: 's-2', d: 'M 800 510 V 750 L 850 800 V 920', delay: '0.02s', dur: '1.35s', tier: 'bus' },
  { id: 's-3', d: 'M 812 510 V 670 L 880 738 H 1010 L 1090 818 V 920', delay: '0.14s', dur: '1.5s', tier: 'secondary' },
];

// Solder vias arranged in 3 concentric expansion waves (inner -> mid -> outer)
const EXPANDING_VIAS: Array<{ x: number; y: number; delay: string }> = [
  // Inner ring (ignites early as traces leave the MCU)
  { x: 620, y: 430, delay: '0.18s' },
  { x: 560, y: 450, delay: '0.22s' },
  { x: 590, y: 462, delay: '0.2s' },
  { x: 670, y: 190, delay: '0.32s' },
  { x: 680, y: 700, delay: '0.32s' },
  { x: 980, y: 430, delay: '0.18s' },
  { x: 1040, y: 450, delay: '0.22s' },
  { x: 1010, y: 462, delay: '0.2s' },
  { x: 930, y: 190, delay: '0.32s' },
  { x: 920, y: 700, delay: '0.32s' },
  { x: 730, y: 180, delay: '0.26s' },
  { x: 730, y: 720, delay: '0.26s' },

  // Mid ring (ignites mid-expansion)
  { x: 530, y: 340, delay: '0.42s' },
  { x: 480, y: 370, delay: '0.45s' },
  { x: 500, y: 552, delay: '0.44s' },
  { x: 410, y: 225, delay: '0.52s' },
  { x: 370, y: 690, delay: '0.52s' },
  { x: 1070, y: 340, delay: '0.42s' },
  { x: 1120, y: 370, delay: '0.45s' },
  { x: 1100, y: 552, delay: '0.44s' },
  { x: 1190, y: 225, delay: '0.52s' },
  { x: 1230, y: 690, delay: '0.52s' },

  // Outer perimeter ring (ignites as traces complete near screen edges)
  { x: 340, y: 340, delay: '0.68s' },
  { x: 220, y: 220, delay: '0.85s' },
  { x: 240, y: 370, delay: '0.72s' },
  { x: 140, y: 270, delay: '0.88s' },
  { x: 290, y: 552, delay: '0.72s' },
  { x: 170, y: 672, delay: '0.88s' },
  { x: 350, y: 80, delay: '0.82s' },
  { x: 340, y: 810, delay: '0.82s' },
  { x: 1260, y: 340, delay: '0.68s' },
  { x: 1380, y: 220, delay: '0.85s' },
  { x: 1360, y: 370, delay: '0.72s' },
  { x: 1460, y: 270, delay: '0.88s' },
  { x: 1310, y: 552, delay: '0.72s' },
  { x: 1430, y: 672, delay: '0.88s' },
  { x: 1250, y: 80, delay: '0.82s' },
  { x: 1260, y: 810, delay: '0.82s' },
];

export default function PcbSplashLoader({ label = 'Checking workspace access...' }: { label?: string }) {
  return (
    <div className="auth-loading pcb-splash" role="status" aria-live="polite">
      {/* Full-viewport expanding PCB trace network */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="pcb-splash-svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="pcb-splash-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="pcb-trace-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="pcb-center-halo" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#1e3a8a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central radial glow behind the MCU */}
        <circle cx="800" cy="450" r="420" fill="url(#pcb-center-halo)" />

        {/* Faint unlit copper substrate guide tracks */}
        <g className="pcb-splash-base-tracks">
          {EXPANDING_TRACES.map((t) => (
            <path key={`${t.id}-base`} d={t.d} className="pcb-splash-track-base" />
          ))}
        </g>

        {/* Expanding drawn PCB traces that grow from center to screen edges */}
        <g filter="url(#pcb-splash-glow)">
          {EXPANDING_TRACES.map((t) => (
            <path
              key={t.id}
              d={t.d}
              pathLength={100}
              className={`pcb-splash-trace-draw pcb-splash-trace-${t.tier}`}
              style={{
                animationDuration: t.dur,
                animationDelay: t.delay,
              }}
            />
          ))}
        </g>

        {/* High-energy leading signal heads racing at the tip of each expanding trace */}
        <g filter="url(#pcb-splash-glow)">
          {EXPANDING_TRACES.map((t) => (
            <path
              key={`${t.id}-head`}
              d={t.d}
              pathLength={100}
              className="pcb-splash-trace-head"
              style={{
                animationDuration: t.dur,
                animationDelay: t.delay,
              }}
            />
          ))}
        </g>

        {/* Concentric rings of solder vias that ignite as traces expand past them */}
        <g className="pcb-splash-vias">
          {EXPANDING_VIAS.map((v, i) => (
            <g key={i} transform={`translate(${v.x} ${v.y})`}>
              <circle r="5" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" opacity="0.55" />
              <circle
                r="2.4"
                fill="#67e8f9"
                className="pcb-splash-via-core"
                style={{ animationDelay: v.delay }}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* Center MCU Hub & Status Readout */}
      <div className="pcb-splash-center">
        <div className="pcb-splash-mcu" aria-hidden="true">
          <div className="pcb-splash-mcu-pins pcb-pins-top">
            <span /><span /><span /><span />
          </div>
          <div className="pcb-splash-mcu-pins pcb-pins-bottom">
            <span /><span /><span /><span />
          </div>
          <div className="pcb-splash-mcu-pins pcb-pins-left">
            <span /><span /><span /><span />
          </div>
          <div className="pcb-splash-mcu-pins pcb-pins-right">
            <span /><span /><span /><span />
          </div>
          <div className="pcb-splash-mcu-die">
            <SignalPulse />
          </div>
        </div>

        <span className="pcb-splash-eyebrow">HARDWARE WORKSPACE</span>
        <p className="pcb-splash-label">{label}</p>

        <div className="pcb-splash-progress" aria-hidden="true">
          <span className="pcb-splash-progress-pad" />
          <div className="pcb-splash-progress-track">
            <div className="pcb-splash-progress-fill" />
          </div>
          <span className="pcb-splash-progress-pad" />
        </div>
      </div>
    </div>
  );
}
