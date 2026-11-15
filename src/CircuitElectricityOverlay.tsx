import React from 'react';

// Crisp vector PCB trace network with live animated electricity pulses
// flowing along 45-degree hardware traces and glowing solder pads/vias.
const TRACES = [
  { id: 't1', d: 'M -20 90 H 110 L 165 145 H 310 L 355 100 H 520', dur: '3.6s', delay: '0s' },
  { id: 't2', d: 'M -20 140 H 85 L 145 200 H 280 L 340 260 H 520', dur: '4.4s', delay: '-1.2s' },
  { id: 't3', d: 'M 60 -20 V 75 L 125 140 V 290 L 185 350 H 410', dur: '4.8s', delay: '-2.1s' },
  { id: 't4', d: 'M -20 340 H 130 L 190 280 H 345 L 415 350 H 540', dur: '3.9s', delay: '-0.7s' },
  { id: 't5', d: 'M -20 490 H 150 L 220 420 H 380 L 440 480 H 540', dur: '4.2s', delay: '-2.8s' },
  { id: 't6', d: 'M 210 720 V 560 L 275 495 H 420 L 485 430 V 240', dur: '4.6s', delay: '-1.5s' },
  { id: 't7', d: 'M -20 610 H 120 L 180 550 H 310 L 370 610 H 540', dur: '3.7s', delay: '-3.1s' },
  { id: 't8', d: 'M 380 -20 V 65 L 320 125 V 230 L 260 290 H 90', dur: '5.1s', delay: '-0.4s' },
];

const VIAS = [
  [110, 90], [165, 145], [310, 145], [355, 100],
  [85, 140], [145, 200], [280, 200], [340, 260],
  [125, 140], [125, 290], [185, 350], [410, 350],
  [130, 340], [190, 280], [345, 280],
  [150, 490], [220, 420], [380, 420], [440, 480],
  [275, 495], [420, 495], [485, 430],
  [120, 610], [180, 550], [310, 550],
  [320, 125], [320, 230], [260, 290],
];

export default function CircuitElectricityOverlay() {
  return (
    <div className="circuit-electricity-overlay" aria-hidden="true">
      <svg
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMid slice"
        className="circuit-electricity-svg"
      >
        <defs>
          <filter id="electric-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="trace-base-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.42" />
            <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Crisp copper-style PCB base traces */}
        <g className="circuit-base-traces">
          {TRACES.map((t) => (
            <path key={t.id} d={t.d} stroke="url(#trace-base-grad)" strokeWidth="1.75" fill="none" />
          ))}
        </g>

        {/* Animated high-voltage electricity surges racing along traces */}
        <g filter="url(#electric-glow)">
          {TRACES.map((t) => (
            <path
              key={`${t.id}-pulse`}
              d={t.d}
              pathLength={100}
              className="circuit-electric-surge"
              style={{
                animationDuration: t.dur,
                animationDelay: t.delay,
              }}
            />
          ))}
        </g>

        {/* Solder pads / vias at trace vertices */}
        <g className="circuit-vias">
          {VIAS.map(([cx, cy], idx) => (
            <g key={idx} transform={`translate(${cx} ${cy})`}>
              <circle r="4.2" fill="#020617" stroke="#38bdf8" strokeWidth="1.4" opacity="0.7" />
              <circle
                r="1.8"
                fill="#67e8f9"
                className="circuit-via-core"
                style={{ animationDelay: `${(idx % 7) * -0.45}s` }}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
