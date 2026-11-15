import React from 'react';

// Animated logic-analyzer trace: a digital square wave scrolling through a small
// probe window, with a glowing sample point. Decorative only.
const WAVE = 'M0 11 H3 V3 H7 V11 H10 V3 H12 V11 H17 V3 H21 V11 H26';
const PERIOD = 26;

export default function SignalPulse({ className = '' }: { className?: string }) {
  return (
    <span className={`signal-pulse ${className}`} aria-hidden="true">
      <svg viewBox="0 0 26 14" width="26" height="14" className="signal-pulse-svg">
        <line x1="0" y1="7" x2="26" y2="7" className="signal-pulse-grid" />
        <g className="signal-pulse-wave">
          <path d={WAVE} />
          <path d={WAVE} transform={`translate(${PERIOD} 0)`} />
        </g>
      </svg>
      <span className="signal-pulse-probe" />
    </span>
  );
}
