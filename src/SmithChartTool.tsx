import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  ExternalLink,
  Globe,
  Plus,
  RadioTower,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';

const SMITH_CHART_URL = 'https://onlinesmithchart.com/';
const R_CHART = 250;
const C_LIGHT = 299792458;

export type FreqUnit = 'Hz' | 'kHz' | 'MHz' | 'GHz';

export type ComponentKind =
  | 'series_cap'
  | 'shunt_cap'
  | 'series_ind'
  | 'shunt_ind'
  | 'series_res'
  | 'shunt_res'
  | 'tx_line'
  | 'open_stub'
  | 'short_stub'
  | 'transformer';

export type CompUnit =
  | 'fF'
  | 'pF'
  | 'nF'
  | 'pH'
  | 'nH'
  | 'uH'
  | 'Ω'
  | 'kΩ'
  | 'deg'
  | 'λ'
  | 'mm'
  | 'ratio';

export interface SmithComponent {
  id: string;
  kind: ComponentKind;
  value: number;
  unit: CompUnit;
  lineZ0: number;
  vf: number;
}

interface Complex {
  re: number;
  im: number;
}

interface StageEvaluation {
  index: number;
  dpLabel: string;
  title: string;
  subtitle: string;
  color: string;
  z: Complex;
  y: Complex;
  gamma: Complex;
  vswr: number;
  returnLossDb: number;
  mismatchLossDb: number;
  qFactor: number;
  arcGammas: Complex[];
}

const FREQ_MULTIPLIER: Record<FreqUnit, number> = {
  Hz: 1,
  kHz: 1e3,
  MHz: 1e6,
  GHz: 1e9,
};

const COMP_UNIT_MULT: Record<CompUnit, number> = {
  fF: 1e-15,
  pF: 1e-12,
  nF: 1e-9,
  pH: 1e-12,
  nH: 1e-9,
  uH: 1e-6,
  Ω: 1,
  kΩ: 1e3,
  deg: 1,
  λ: 1,
  mm: 1e-3,
  ratio: 1,
};

const STAGE_COLORS = ['#0284c7', '#ea580c', '#7c3aed', '#059669', '#db2777', '#d97706'];

interface ComponentMeta {
  kind: ComponentKind;
  label: string;
  shortLabel: string;
  topology: 'series' | 'shunt' | 'two-port';
  units: CompUnit[];
  defaultUnit: CompUnit;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

const COMPONENT_META: Record<ComponentKind, ComponentMeta> = {
  series_cap: {
    kind: 'series_cap',
    label: 'Series Capacitor',
    shortLabel: 'Ser C',
    topology: 'series',
    units: ['fF', 'pF', 'nF'],
    defaultUnit: 'pF',
    defaultValue: 2.2,
    min: 0.05,
    max: 50,
    step: 0.05,
  },
  shunt_cap: {
    kind: 'shunt_cap',
    label: 'Parallel Capacitor',
    shortLabel: 'Shunt C',
    topology: 'shunt',
    units: ['fF', 'pF', 'nF'],
    defaultUnit: 'pF',
    defaultValue: 1.5,
    min: 0.05,
    max: 50,
    step: 0.05,
  },
  series_ind: {
    kind: 'series_ind',
    label: 'Series Inductor',
    shortLabel: 'Ser L',
    topology: 'series',
    units: ['pH', 'nH', 'uH'],
    defaultUnit: 'nH',
    defaultValue: 3.3,
    min: 0.1,
    max: 100,
    step: 0.1,
  },
  shunt_ind: {
    kind: 'shunt_ind',
    label: 'Parallel Inductor',
    shortLabel: 'Shunt L',
    topology: 'shunt',
    units: ['pH', 'nH', 'uH'],
    defaultUnit: 'nH',
    defaultValue: 4.7,
    min: 0.1,
    max: 100,
    step: 0.1,
  },
  series_res: {
    kind: 'series_res',
    label: 'Series Resistor',
    shortLabel: 'Ser R',
    topology: 'series',
    units: ['Ω', 'kΩ'],
    defaultUnit: 'Ω',
    defaultValue: 15,
    min: 0,
    max: 300,
    step: 0.5,
  },
  shunt_res: {
    kind: 'shunt_res',
    label: 'Parallel Resistor',
    shortLabel: 'Shunt R',
    topology: 'shunt',
    units: ['Ω', 'kΩ'],
    defaultUnit: 'Ω',
    defaultValue: 150,
    min: 5,
    max: 1000,
    step: 1,
  },
  tx_line: {
    kind: 'tx_line',
    label: 'Transmission Line',
    shortLabel: 'TL',
    topology: 'two-port',
    units: ['deg', 'λ', 'mm'],
    defaultUnit: 'deg',
    defaultValue: 45,
    min: 0,
    max: 360,
    step: 1,
  },
  open_stub: {
    kind: 'open_stub',
    label: 'Open Shunt Stub',
    shortLabel: 'Open Stub',
    topology: 'shunt',
    units: ['deg', 'λ', 'mm'],
    defaultUnit: 'deg',
    defaultValue: 30,
    min: 0,
    max: 180,
    step: 1,
  },
  short_stub: {
    kind: 'short_stub',
    label: 'Shorted Shunt Stub',
    shortLabel: 'Short Stub',
    topology: 'shunt',
    units: ['deg', 'λ', 'mm'],
    defaultUnit: 'deg',
    defaultValue: 30,
    min: 1,
    max: 179,
    step: 1,
  },
  transformer: {
    kind: 'transformer',
    label: 'Ideal Transformer',
    shortLabel: 'Xfmr N:1',
    topology: 'two-port',
    units: ['ratio'],
    defaultUnit: 'ratio',
    defaultValue: 1.41,
    min: 0.2,
    max: 5,
    step: 0.01,
  },
};

function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom < 1e-18) {
    return { re: a.re >= 0 ? 1e9 : -1e9, im: 0 };
  }
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

function cInv(a: Complex): Complex {
  return cDiv({ re: 1, im: 0 }, a);
}

function cAbs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

function cArgDeg(a: Complex): number {
  return (Math.atan2(a.im, a.re) * 180) / Math.PI;
}

function zToGamma(z: Complex, z0: number): Complex {
  const safeZ0 = Math.max(z0, 0.1);
  return cDiv(
    { re: z.re - safeZ0, im: z.im },
    { re: z.re + safeZ0, im: z.im }
  );
}

function gammaToZ(gamma: Complex, z0: number): Complex {
  const safeZ0 = Math.max(z0, 0.1);
  const ratio = cDiv(
    { re: 1 + gamma.re, im: gamma.im },
    { re: 1 - gamma.re, im: -gamma.im }
  );
  return { re: ratio.re * safeZ0, im: ratio.im * safeZ0 };
}

function gammaMetrics(gamma: Complex) {
  const mag = Math.min(cAbs(gamma), 1);
  const vswr = mag >= 0.9999 ? Infinity : (1 + mag) / (1 - mag);
  const returnLossDb = mag <= 1e-7 ? Infinity : -20 * Math.log10(mag);
  const mismatchLossDb = mag >= 0.999999 ? Infinity : -10 * Math.log10(Math.max(1 - mag * mag, 1e-12));
  return { mag, vswr, returnLossDb, mismatchLossDb };
}

function formatCompact(num: number, decimals = 2): string {
  if (!Number.isFinite(num)) return '∞';
  const abs = Math.abs(num);
  if (abs === 0) return '0';
  if (abs >= 1000 || abs < 0.01) return num.toPrecision(3);
  return Number(num.toFixed(decimals)).toString();
}

function formatComplexOhms(z: Complex): string {
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im) || Math.abs(z.re) > 1e6 || Math.abs(z.im) > 1e6) {
    return '∞ Ω';
  }
  const r = formatCompact(z.re, 2);
  const xAbs = formatCompact(Math.abs(z.im), 2);
  const sign = z.im >= 0 ? '+' : '-';
  return `${r} ${sign} j${xAbs} Ω`;
}

function formatComplexAdmittanceMs(y: Complex): string {
  const g = formatCompact(y.re * 1000, 2);
  const bAbs = formatCompact(Math.abs(y.im * 1000), 2);
  const sign = y.im >= 0 ? '+' : '-';
  return `${g} ${sign} j${bAbs} mS`;
}

function electricalRadiansAtFreq(
  comp: SmithComponent,
  evalFreqHz: number,
  nominalFreqHz: number
): number {
  const val = Math.max(0, comp.value);
  const safeNom = Math.max(nominalFreqHz, 1);
  const ratio = evalFreqHz / safeNom;
  if (comp.unit === 'deg') {
    return ((val * Math.PI) / 180) * ratio;
  }
  if (comp.unit === 'λ') {
    return val * 2 * Math.PI * ratio;
  }
  // Physical mm using velocity factor
  const lengthM = val * 1e-3;
  const vf = Math.max(0.05, Math.min(1, comp.vf || 0.66));
  return (2 * Math.PI * evalFreqHz * lengthM) / (C_LIGHT * vf);
}

function stepComponent(
  zIn: Complex,
  comp: SmithComponent,
  evalFreqHz: number,
  nominalFreqHz: number,
  fraction: number
): Complex {
  const t = Math.max(0, Math.min(1, fraction));
  const safeFreq = Math.max(evalFreqHz, 1);
  const omega = 2 * Math.PI * safeFreq;
  const valSi = comp.value * (COMP_UNIT_MULT[comp.unit] ?? 1);

  switch (comp.kind) {
    case 'series_cap': {
      const cap = Math.max(valSi, 1e-18);
      const xc = -1 / (omega * cap);
      return { re: zIn.re, im: zIn.im + t * xc };
    }
    case 'shunt_cap': {
      const cap = Math.max(valSi, 1e-18);
      const yIn = cInv(zIn);
      const bc = omega * cap;
      return cInv({ re: yIn.re, im: yIn.im + t * bc });
    }
    case 'series_ind': {
      const ind = Math.max(valSi, 0);
      const xl = omega * ind;
      return { re: zIn.re, im: zIn.im + t * xl };
    }
    case 'shunt_ind': {
      const ind = Math.max(valSi, 1e-18);
      const yIn = cInv(zIn);
      const bl = -1 / (omega * ind);
      return cInv({ re: yIn.re, im: yIn.im + t * bl });
    }
    case 'series_res': {
      const rAdd = Math.max(valSi, 0);
      return { re: zIn.re + t * rAdd, im: zIn.im };
    }
    case 'shunt_res': {
      const rVal = Math.max(valSi, 1e-6);
      const yIn = cInv(zIn);
      return cInv({ re: yIn.re + t / rVal, im: yIn.im });
    }
    case 'tx_line': {
      const z0l = Math.max(comp.lineZ0 || 50, 0.1);
      const theta = electricalRadiansAtFreq(comp, safeFreq, nominalFreqHz) * t;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const num = {
        re: zIn.re * cosT,
        im: zIn.im * cosT + z0l * sinT,
      };
      const den = {
        re: z0l * cosT - zIn.im * sinT,
        im: zIn.re * sinT,
      };
      const ratio = cDiv(num, den);
      return { re: ratio.re * z0l, im: ratio.im * z0l };
    }
    case 'open_stub': {
      const z0s = Math.max(comp.lineZ0 || 50, 0.1);
      const theta = electricalRadiansAtFreq(comp, safeFreq, nominalFreqHz);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const safeCos = Math.abs(cosT) < 1e-4 ? (cosT >= 0 ? 1e-4 : -1e-4) : cosT;
      const bStub = sinT / (z0s * safeCos);
      const yIn = cInv(zIn);
      return cInv({ re: yIn.re, im: yIn.im + t * bStub });
    }
    case 'short_stub': {
      const z0s = Math.max(comp.lineZ0 || 50, 0.1);
      const theta = electricalRadiansAtFreq(comp, safeFreq, nominalFreqHz);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const safeSin = Math.abs(sinT) < 1e-4 ? (sinT >= 0 ? 1e-4 : -1e-4) : sinT;
      const bStub = -cosT / (z0s * safeSin);
      const yIn = cInv(zIn);
      return cInv({ re: yIn.re, im: yIn.im + t * bStub });
    }
    case 'transformer': {
      const nTarget = Math.max(comp.value, 0.05);
      const nCurr = 1 + t * (nTarget - 1);
      const scale = nCurr * nCurr;
      return { re: zIn.re * scale, im: zIn.im * scale };
    }
  }
}

function evaluateChainAtFreq(
  loadZ: Complex,
  components: SmithComponent[],
  z0: number,
  evalFreqHz: number,
  nominalFreqHz: number
): Complex {
  let currZ = loadZ;
  for (const comp of components) {
    currZ = stepComponent(currZ, comp, evalFreqHz, nominalFreqHz, 1);
  }
  return zToGamma(currZ, z0);
}

function sliderBoundsForUnit(meta: ComponentMeta, unit: CompUnit): { min: number; max: number; step: number } {
  if (meta.kind === 'series_cap' || meta.kind === 'shunt_cap') {
    if (unit === 'fF') return { min: 10, max: 2000, step: 10 };
    if (unit === 'pF') return { min: 0.05, max: 50, step: 0.05 };
    return { min: 0.001, max: 1, step: 0.005 };
  }
  if (meta.kind === 'series_ind' || meta.kind === 'shunt_ind') {
    if (unit === 'pH') return { min: 50, max: 3000, step: 10 };
    if (unit === 'nH') return { min: 0.1, max: 100, step: 0.1 };
    return { min: 0.01, max: 2, step: 0.01 };
  }
  if (meta.kind === 'series_res' || meta.kind === 'shunt_res') {
    if (unit === 'kΩ') return { min: 0.01, max: 10, step: 0.01 };
    return meta.kind === 'series_res'
      ? { min: 0, max: 300, step: 0.5 }
      : { min: 5, max: 1000, step: 1 };
  }
  if (meta.kind === 'tx_line' || meta.kind === 'open_stub' || meta.kind === 'short_stub') {
    if (unit === 'λ') return { min: 0.005, max: 0.5, step: 0.005 };
    if (unit === 'mm') return { min: 0.5, max: 120, step: 0.25 };
    return meta.kind === 'short_stub'
      ? { min: 1, max: 179, step: 1 }
      : { min: 0, max: meta.kind === 'tx_line' ? 360 : 180, step: 1 };
  }
  return { min: meta.min, max: meta.max, step: meta.step };
}

function formatReactanceAsComponent(
  xOhms: number,
  isShunt: boolean,
  freqHz: number
): Omit<SmithComponent, 'id'> | null {
  const omega = 2 * Math.PI * Math.max(freqHz, 1);
  if (Math.abs(xOhms) < 1e-6) return null;

  if (!isShunt) {
    // Series reactance j*X
    if (xOhms > 0) {
      const L = xOhms / omega;
      const nH = L * 1e9;
      return {
        kind: 'series_ind',
        value: Number(nH.toFixed(3)),
        unit: 'nH',
        lineZ0: 50,
        vf: 0.66,
      };
    }
    const C = 1 / (omega * Math.abs(xOhms));
    const pF = C * 1e12;
    return {
      kind: 'series_cap',
      value: Number(pF.toFixed(3)),
      unit: 'pF',
      lineZ0: 50,
      vf: 0.66,
    };
  }

  // Shunt susceptance j*B where xOhms carries B value (S)
  const b = xOhms;
  if (b > 0) {
    const C = b / omega;
    const pF = C * 1e12;
    return {
      kind: 'shunt_cap',
      value: Number(pF.toFixed(3)),
      unit: 'pF',
      lineZ0: 50,
      vf: 0.66,
    };
  }
  const L = 1 / (omega * Math.abs(b));
  const nH = L * 1e9;
  return {
    kind: 'shunt_ind',
    value: Number(nH.toFixed(3)),
    unit: 'nH',
    lineZ0: 50,
    vf: 0.66,
  };
}

interface LMatchOption {
  label: string;
  topology: string;
  steps: Array<Omit<SmithComponent, 'id'>>;
}

function computeLMatchOptions(loadZ: Complex, z0: number, freqHz: number): LMatchOption[] {
  const options: LMatchOption[] = [];
  const r = loadZ.re;
  const x = loadZ.im;
  if (r <= 0.01 || z0 <= 0.1) return options;

  // Family 1: Series component first (from load), then Shunt component (to Z0)
  // Possible when r <= z0
  if (r <= z0) {
    const rad = Math.sqrt(Math.max(0, r * (z0 - r)));
    for (const sign of [1, -1]) {
      const xMid = sign * rad;
      const xSeries = xMid - x;
      const bShunt = xMid / (r * z0);
      const c1 = formatReactanceAsComponent(xSeries, false, freqHz);
      const c2 = formatReactanceAsComponent(bShunt, true, freqHz);
      const steps = [c1, c2].filter((s): s is Omit<SmithComponent, 'id'> => s !== null);
      if (steps.length > 0) {
        const desc = steps
          .map((s) => `${COMPONENT_META[s.kind].shortLabel} (${formatCompact(s.value, 2)} ${s.unit})`)
          .join(' → ');
        options.push({
          label: sign > 0 ? 'Series-first Match A' : 'Series-first Match B',
          topology: desc,
          steps,
        });
      }
    }
  }

  // Family 2: Shunt component first (from load), then Series component (to Z0)
  // Possible when G_L <= 1 / z0
  const mag2 = r * r + x * x;
  const gL = r / mag2;
  const bL = -x / mag2;
  const g0 = 1 / z0;
  if (gL <= g0) {
    const rad = Math.sqrt(Math.max(0, gL * (g0 - gL)));
    for (const sign of [1, -1]) {
      const bMid = sign * rad;
      const bShunt = bMid - bL;
      const xSeries = (bMid * z0) / gL;
      const c1 = formatReactanceAsComponent(bShunt, true, freqHz);
      const c2 = formatReactanceAsComponent(xSeries, false, freqHz);
      const steps = [c1, c2].filter((s): s is Omit<SmithComponent, 'id'> => s !== null);
      if (steps.length > 0) {
        const desc = steps
          .map((s) => `${COMPONENT_META[s.kind].shortLabel} (${formatCompact(s.value, 2)} ${s.unit})`)
          .join(' → ');
        options.push({
          label: sign > 0 ? 'Shunt-first Match A' : 'Shunt-first Match B',
          topology: desc,
          steps,
        });
      }
    }
  }

  return options;
}

/**
 * Compact inline SVG schematic icon for each ladder stage (Black Box or matching element).
 */
function ComponentSchematicGlyph({ kind }: { kind: ComponentKind | 'black_box' }) {
  const stroke = 'currentColor';
  if (kind === 'black_box') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-emerald-700 dark:text-emerald-400" aria-hidden="true">
        <line x1="6" y1="14" x2="36" y2="14" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="36" x2="72" y2="36" stroke={stroke} strokeWidth="2" />
        <rect x="36" y="6" width="36" height="18" rx="3" fill="currentColor" fillOpacity="0.14" stroke={stroke} strokeWidth="1.8" />
        <text x="54" y="18" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor">ZL</text>
        <line x1="54" y1="24" x2="54" y2="36" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }

  if (kind === 'series_cap') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-sky-700 dark:text-sky-400" aria-hidden="true">
        <line x1="6" y1="14" x2="42" y2="14" stroke={stroke} strokeWidth="2" />
        <line x1="42" y1="5" x2="42" y2="23" stroke={stroke} strokeWidth="2.4" />
        <line x1="52" y1="5" x2="52" y2="23" stroke={stroke} strokeWidth="2.4" />
        <line x1="52" y1="14" x2="90" y2="14" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="36" x2="90" y2="36" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'shunt_cap') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-sky-700 dark:text-sky-400" aria-hidden="true">
        <line x1="6" y1="10" x2="90" y2="10" stroke={stroke} strokeWidth="2" />
        <line x1="48" y1="10" x2="48" y2="21" stroke={stroke} strokeWidth="2" />
        <line x1="36" y1="21" x2="60" y2="21" stroke={stroke} strokeWidth="2.4" />
        <line x1="36" y1="27" x2="60" y2="27" stroke={stroke} strokeWidth="2.4" />
        <line x1="48" y1="27" x2="48" y2="38" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="38" x2="90" y2="38" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'series_ind') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-amber-700 dark:text-amber-400" aria-hidden="true">
        <line x1="6" y1="16" x2="26" y2="16" stroke={stroke} strokeWidth="2" />
        <path
          d="M 26 16 A 5.5 5.5 0 0 1 37 16 A 5.5 5.5 0 0 1 48 16 A 5.5 5.5 0 0 1 59 16 A 5.5 5.5 0 0 1 70 16"
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
        />
        <line x1="70" y1="16" x2="90" y2="16" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="36" x2="90" y2="36" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'shunt_ind') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-amber-700 dark:text-amber-400" aria-hidden="true">
        <line x1="6" y1="8" x2="90" y2="8" stroke={stroke} strokeWidth="2" />
        <line x1="48" y1="8" x2="48" y2="12" stroke={stroke} strokeWidth="2" />
        <path
          d="M 48 12 A 4 4 0 0 1 48 20 A 4 4 0 0 1 48 28 A 4 4 0 0 1 48 35"
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
        />
        <line x1="48" y1="35" x2="48" y2="38" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="38" x2="90" y2="38" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'series_res') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-rose-700 dark:text-rose-400" aria-hidden="true">
        <line x1="6" y1="15" x2="28" y2="15" stroke={stroke} strokeWidth="2" />
        <polyline points="28,15 32,8 39,22 46,8 53,22 60,8 65,15" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <line x1="65" y1="15" x2="90" y2="15" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="36" x2="90" y2="36" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'shunt_res') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-rose-700 dark:text-rose-400" aria-hidden="true">
        <line x1="6" y1="8" x2="90" y2="8" stroke={stroke} strokeWidth="2" />
        <line x1="48" y1="8" x2="48" y2="13" stroke={stroke} strokeWidth="2" />
        <polyline points="48,13 54,16 42,20 54,24 42,28 48,32" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <line x1="48" y1="32" x2="48" y2="38" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="38" x2="90" y2="38" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'tx_line') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-violet-700 dark:text-violet-400" aria-hidden="true">
        <line x1="6" y1="15" x2="26" y2="15" stroke={stroke} strokeWidth="2" />
        <rect x="26" y="8" width="44" height="14" rx="7" fill="currentColor" fillOpacity="0.14" stroke={stroke} strokeWidth="2" />
        <line x1="70" y1="15" x2="90" y2="15" stroke={stroke} strokeWidth="2" />
        <line x1="6" y1="36" x2="90" y2="36" stroke={stroke} strokeWidth="2" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'open_stub' || kind === 'short_stub') {
    return (
      <svg viewBox="0 0 96 44" className="w-24 h-11 text-teal-700 dark:text-teal-400" aria-hidden="true">
        <line x1="6" y1="8" x2="90" y2="8" stroke={stroke} strokeWidth="2" />
        <rect x="43" y="8" width="10" height="22" fill="currentColor" fillOpacity="0.14" stroke={stroke} strokeWidth="1.8" />
        {kind === 'short_stub' ? (
          <>
            <line x1="48" y1="30" x2="48" y2="38" stroke={stroke} strokeWidth="2" />
            <line x1="6" y1="38" x2="90" y2="38" stroke={stroke} strokeWidth="2" opacity="0.55" />
          </>
        ) : (
          <line x1="6" y1="38" x2="90" y2="38" stroke={stroke} strokeWidth="2" opacity="0.35" />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 44" className="w-24 h-11 text-indigo-700 dark:text-indigo-400" aria-hidden="true">
      <line x1="6" y1="13" x2="38" y2="13" stroke={stroke} strokeWidth="2" />
      <line x1="6" y1="35" x2="38" y2="35" stroke={stroke} strokeWidth="2" />
      <path d="M 38 13 A 4 4 0 0 1 38 20 A 4 4 0 0 1 38 27 A 4 4 0 0 1 38 35" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="47" y1="10" x2="47" y2="38" stroke={stroke} strokeWidth="1.5" />
      <line x1="51" y1="10" x2="51" y2="38" stroke={stroke} strokeWidth="1.5" />
      <path d="M 59 13 A 4 4 0 0 0 59 20 A 4 4 0 0 0 59 27 A 4 4 0 0 0 59 35" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="59" y1="13" x2="90" y2="13" stroke={stroke} strokeWidth="2" />
      <line x1="59" y1="35" x2="90" y2="35" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

const GRID_VALUES = [0.2, 0.5, 1, 2, 5];
const Q_VALUES = [1, 2, 5];

export default function SmithChartTool() {
  const [viewMode, setViewMode] = useState<'native' | 'embed'>('native');

  // System Parameters
  const [freqVal, setFreqVal] = useState(2440);
  const [freqUnit, setFreqUnit] = useState<FreqUnit>('MHz');
  const [z0, setZ0] = useState(50);
  const [freqSpan, setFreqSpan] = useState(100);
  const [showFreqSpan, setShowFreqSpan] = useState(true);

  // Overlays & Interaction
  const [showZGrid, setShowZGrid] = useState(true);
  const [showYGrid, setShowYGrid] = useState(true);
  const [showVswrCircle, setShowVswrCircle] = useState(true);
  const [targetVswr, setTargetVswr] = useState(2.0);
  const [showQContours, setShowQContours] = useState(false);
  const [clickSetsLoad, setClickSetsLoad] = useState(true);

  // Black Box / Load Impedance Z_L
  const [loadR, setLoadR] = useState(25);
  const [loadX, setLoadX] = useState(-35);

  // Cascaded Components (starts after DP 1 Load)
  const [components, setComponents] = useState<SmithComponent[]>([
    {
      id: 'init-l1',
      kind: 'series_ind',
      value: 2.3,
      unit: 'nH',
      lineZ0: 50,
      vf: 0.66,
    },
    {
      id: 'init-c1',
      kind: 'shunt_cap',
      value: 1.3,
      unit: 'pF',
      lineZ0: 50,
      vf: 0.66,
    },
  ]);

  // Hover State
  const [hoverGamma, setHoverGamma] = useState<Complex | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingLoadRef = useRef(false);

  const freqHz = Math.max(1, freqVal * FREQ_MULTIPLIER[freqUnit]);
  const spanHz = Math.max(0, freqSpan * FREQ_MULTIPLIER[freqUnit]);
  const safeZ0 = Math.max(0.1, z0 || 50);

  // Evaluate all DP stages + parametric arcs
  const stages = useMemo<StageEvaluation[]>(() => {
    const out: StageEvaluation[] = [];
    const loadZ: Complex = { re: Math.max(0, loadR), im: loadX };
    const loadY = cInv(loadZ);
    const loadGamma = zToGamma(loadZ, safeZ0);
    const m0 = gammaMetrics(loadGamma);

    out.push({
      index: 0,
      dpLabel: 'DP 1',
      title: 'Black Box (Load)',
      subtitle: formatComplexOhms(loadZ),
      color: '#10b981',
      z: loadZ,
      y: loadY,
      gamma: loadGamma,
      vswr: m0.vswr,
      returnLossDb: m0.returnLossDb,
      mismatchLossDb: m0.mismatchLossDb,
      qFactor: loadZ.re > 1e-6 ? Math.abs(loadZ.im) / loadZ.re : Infinity,
      arcGammas: [loadGamma],
    });

    let prevZ = loadZ;
    components.forEach((comp, idx) => {
      const steps = 64;
      const arcGammas: Complex[] = [];
      for (let i = 0; i <= steps; i += 1) {
        const zStep = stepComponent(prevZ, comp, freqHz, freqHz, i / steps);
        arcGammas.push(zToGamma(zStep, safeZ0));
      }
      const nextZ = stepComponent(prevZ, comp, freqHz, freqHz, 1);
      const nextY = cInv(nextZ);
      const nextGamma = zToGamma(nextZ, safeZ0);
      const m = gammaMetrics(nextGamma);
      const meta = COMPONENT_META[comp.kind];

      out.push({
        index: idx + 1,
        dpLabel: `DP ${idx + 2}`,
        title: meta.label,
        subtitle:
          comp.kind === 'transformer'
            ? `${comp.value}:1`
            : `${formatCompact(comp.value, 2)} ${comp.unit}`,
        color: STAGE_COLORS[idx % STAGE_COLORS.length],
        z: nextZ,
        y: nextY,
        gamma: nextGamma,
        vswr: m.vswr,
        returnLossDb: m.returnLossDb,
        mismatchLossDb: m.mismatchLossDb,
        qFactor: nextZ.re > 1e-6 ? Math.abs(nextZ.im) / nextZ.re : Infinity,
        arcGammas,
      });
      prevZ = nextZ;
    });

    return out;
  }, [loadR, loadX, components, freqHz, safeZ0]);

  // Evaluate frequency sweep trace on final port
  const freqSweepTrace = useMemo(() => {
    if (!showFreqSpan || spanHz <= 0 || components.length === 0) return null;
    const fMin = Math.max(1, freqHz - spanHz);
    const fMax = freqHz + spanHz;
    const pts: Complex[] = [];
    const loadZ = { re: Math.max(0, loadR), im: loadX };
    const samples = 40;
    for (let i = 0; i <= samples; i += 1) {
      const fCurr = fMin + ((fMax - fMin) * i) / samples;
      pts.push(evaluateChainAtFreq(loadZ, components, safeZ0, fCurr, freqHz));
    }
    return {
      pts,
      low: pts[0],
      high: pts[pts.length - 1],
    };
  }, [showFreqSpan, spanHz, freqHz, loadR, loadX, components, safeZ0]);

  // Analytical L-Match options
  const lMatchOptions = useMemo(
    () => computeLMatchOptions({ re: Math.max(0.01, loadR), im: loadX }, safeZ0, freqHz),
    [loadR, loadX, safeZ0, freqHz]
  );

  // Convert SVG pointer to Smith gamma
  const clientToGamma = useCallback((clientX: number, clientY: number): Complex | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const vbWidth = 620;
    const vbHeight = 620;
    const svgX = ((clientX - rect.left) / rect.width) * vbWidth - 310;
    const svgY = ((clientY - rect.top) / rect.height) * vbHeight - 310;
    const gRe = svgX / R_CHART;
    const gIm = -svgY / R_CHART;
    const r = Math.hypot(gRe, gIm);
    if (r > 1.02) return null;
    if (r > 0.995) {
      return { re: (gRe / r) * 0.995, im: (gIm / r) * 0.995 };
    }
    return { re: gRe, im: gIm };
  }, []);

  const updateLoadFromGamma = useCallback(
    (g: Complex) => {
      const z = gammaToZ(g, safeZ0);
      setLoadR(Number(Math.max(0, Math.min(2000, z.re)).toFixed(2)));
      setLoadX(Number(Math.max(-2000, Math.min(2000, z.im)).toFixed(2)));
    },
    [safeZ0]
  );

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = clientToGamma(e.clientX, e.clientY);
    if (!g) return;
    setHoverGamma(g);
    if (clickSetsLoad && e.button === 0) {
      isDraggingLoadRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateLoadFromGamma(g);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = clientToGamma(e.clientX, e.clientY);
    setHoverGamma(g);
    if (isDraggingLoadRef.current && clickSetsLoad && g) {
      updateLoadFromGamma(g);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingLoadRef.current) {
      isDraggingLoadRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const addComponent = (kind: ComponentKind) => {
    const meta = COMPONENT_META[kind];
    setComponents((prev) => [
      ...prev,
      {
        id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        value: meta.defaultValue,
        unit: meta.defaultUnit,
        lineZ0: safeZ0,
        vf: 0.66,
      },
    ]);
  };

  const updateComponent = (id: string, patch: Partial<SmithComponent>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const moveComponent = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= components.length) return;
    setComponents((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const applyAutoMatch = (opt: LMatchOption) => {
    setComponents(
      opt.steps.map((s, idx) => ({
        ...s,
        id: `auto-${Date.now()}-${idx}`,
      }))
    );
  };

  const resetToDefault = () => {
    setFreqVal(2440);
    setFreqUnit('MHz');
    setZ0(50);
    setFreqSpan(100);
    setLoadR(25);
    setLoadX(-35);
    setComponents([
      { id: 'init-l1', kind: 'series_ind', value: 2.3, unit: 'nH', lineZ0: 50, vf: 0.66 },
      { id: 'init-c1', kind: 'shunt_cap', value: 1.3, unit: 'pF', lineZ0: 50, vf: 0.66 },
    ]);
  };

  const finalStage = stages[stages.length - 1];
  const hoverDetails = useMemo(() => {
    if (!hoverGamma) return null;
    const z = gammaToZ(hoverGamma, safeZ0);
    const y = cInv(z);
    const m = gammaMetrics(hoverGamma);
    const q = z.re > 1e-6 ? Math.abs(z.im) / z.re : Infinity;
    return { z, y, gamma: hoverGamma, ...m, q };
  }, [hoverGamma, safeZ0]);

  const targetVswrRadius =
    targetVswr > 1 ? ((targetVswr - 1) / (targetVswr + 1)) * R_CHART : 0;

  return (
    <section className="circuit-card overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2.5">
          <RadioTower className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Online Smith Chart &amp; Impedance Matching
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interactive Z/Y chart, parametric component sliders, frequency sweep, and L-network synthesis
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode('native')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'native'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <RadioTower className="h-3.5 w-3.5" />
              <span>Interactive Smith Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('embed')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'embed'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>onlinesmithchart.com Frame</span>
            </button>
          </div>

          <a
            href={SMITH_CHART_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
          >
            <span>Open External</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {viewMode === 'embed' ? (
        <div>
          <iframe
            title="Online Smith Chart interactive tool"
            src={SMITH_CHART_URL}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
            className="block h-[820px] w-full bg-white"
          />
          <p className="border-t border-stone-200 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Embedded from{' '}
            <a
              href={SMITH_CHART_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-indigo-600 hover:underline dark:text-cyan-400"
            >
              onlinesmithchart.com
            </a>
            . Switch to &ldquo;Interactive Smith Chart&rdquo; above if the external frame is blocked by your browser or network.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-5 bg-stone-50/50 dark:bg-slate-950/85">
          {/* Row 1: Operational System Controls & Overlay Toggles */}
          <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Operational Frequency */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Operational Frequency (f)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={freqVal}
                    onChange={(e) => setFreqVal(Math.max(0.001, Number(e.target.value) || 0.001))}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <select
                    aria-label="Frequency unit"
                    value={freqUnit}
                    onChange={(e) => setFreqUnit(e.target.value as FreqUnit)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="Hz">Hz</option>
                    <option value="kHz">kHz</option>
                    <option value="MHz">MHz</option>
                    <option value="GHz">GHz</option>
                  </select>
                </div>
              </div>

              {/* Characteristic Impedance Z0 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Characteristic Impedance (Z<sub>0</sub>)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={z0}
                    onChange={(e) => setZ0(Math.max(1, Number(e.target.value) || 50))}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">&Omega;</span>
                </div>
              </div>

              {/* Frequency Span +/- */}
              <div>
                <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  <span>Freq Span (&plusmn; {freqUnit})</span>
                  <button
                    type="button"
                    onClick={() => setShowFreqSpan((p) => !p)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      showFreqSpan
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {showFreqSpan ? 'ON' : 'OFF'}
                  </button>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={freqSpan}
                  onChange={(e) => setFreqSpan(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Target VSWR Circle */}
              <div>
                <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  <span>Target VSWR Circle</span>
                  <button
                    type="button"
                    onClick={() => setShowVswrCircle((p) => !p)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      showVswrCircle
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {showVswrCircle ? 'ON' : 'OFF'}
                  </button>
                </label>
                <input
                  type="number"
                  min="1.05"
                  max="20"
                  step="0.05"
                  value={targetVswr}
                  onChange={(e) => setTargetVswr(Math.max(1.01, Number(e.target.value) || 2))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Chart Layer Toggles & Quick Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowZGrid((p) => !p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    showZGrid
                      ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  Impedance (Z) Circles
                </button>
                <button
                  type="button"
                  onClick={() => setShowYGrid((p) => !p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    showYGrid
                      ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  Admittance (Y) Circles
                </button>
                <button
                  type="button"
                  onClick={() => setShowQContours((p) => !p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    showQContours
                      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  Constant-Q Contours
                </button>
                <button
                  type="button"
                  onClick={() => setClickSetsLoad((p) => !p)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    clickSetsLoad
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-stone-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Click/Drag Load (DP 1)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-stone-200 bg-white text-slate-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Example</span>
              </button>
            </div>
          </div>

          {/* Row 2: Main Interactive Chart + Schematic & Component Sliders */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left Column: Interactive SVG Smith Chart + Live Coordinate Readout */}
            <div className="xl:col-span-6 space-y-3">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Smith Chart (&Gamma;-Plane, Z<sub>0</sub> = {safeZ0} &Omega;)
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Load (DP 1)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Input ({finalStage.dpLabel})
                    </span>
                  </div>
                </div>

                <svg
                  ref={svgRef}
                  viewBox="-310 -310 620 620"
                  onPointerDown={handleSvgPointerDown}
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={handleSvgPointerUp}
                  onPointerCancel={handleSvgPointerUp}
                  onPointerLeave={() => {
                    setHoverGamma(null);
                    isDraggingLoadRef.current = false;
                  }}
                  className={`w-full max-w-[540px] mx-auto block select-none touch-none ${
                    clickSetsLoad ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                >
                  <defs>
                    <clipPath id="smith-unit-clip">
                      <circle cx="0" cy="0" r={R_CHART} />
                    </clipPath>
                    <marker
                      id="smith-arc-arrow"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="context-stroke" />
                    </marker>
                  </defs>

                  {/* Outer chart backdrop circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r={R_CHART}
                    className="fill-white dark:fill-slate-950 stroke-slate-800 dark:stroke-slate-300"
                    strokeWidth="2"
                  />

                  {/* Admittance (Y) Circles */}
                  {showYGrid && (
                    <g clipPath="url(#smith-unit-clip)" opacity="0.55">
                      {GRID_VALUES.map((g) => {
                        const rPx = (1 / (g + 1)) * R_CHART;
                        const cx = -(g / (g + 1)) * R_CHART;
                        return (
                          <circle
                            key={`g-${g}`}
                            cx={cx}
                            cy={0}
                            r={rPx}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth={g === 1 ? 1.15 : 0.7}
                            strokeDasharray="3 3"
                          />
                        );
                      })}
                      {GRID_VALUES.flatMap((b) =>
                        [b, -b].map((bSigned) => {
                          const rPx = (1 / Math.abs(bSigned)) * R_CHART;
                          const cy = (1 / bSigned) * R_CHART;
                          return (
                            <circle
                              key={`b-${bSigned}`}
                              cx={-R_CHART}
                              cy={cy}
                              r={rPx}
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth={Math.abs(bSigned) === 1 ? 1.05 : 0.65}
                              strokeDasharray="3 3"
                            />
                          );
                        })
                      )}
                    </g>
                  )}

                  {/* Impedance (Z) Circles */}
                  {showZGrid && (
                    <g clipPath="url(#smith-unit-clip)" opacity="0.72">
                      {GRID_VALUES.map((rVal) => {
                        const rPx = (1 / (rVal + 1)) * R_CHART;
                        const cx = (rVal / (rVal + 1)) * R_CHART;
                        return (
                          <circle
                            key={`r-${rVal}`}
                            cx={cx}
                            cy={0}
                            r={rPx}
                            fill="none"
                            stroke="#e11d48"
                            strokeWidth={rVal === 1 ? 1.3 : 0.75}
                          />
                        );
                      })}
                      {GRID_VALUES.flatMap((xVal) =>
                        [xVal, -xVal].map((xSigned) => {
                          const rPx = (1 / Math.abs(xSigned)) * R_CHART;
                          const cy = -(1 / xSigned) * R_CHART;
                          return (
                            <circle
                              key={`x-${xSigned}`}
                              cx={R_CHART}
                              cy={cy}
                              r={rPx}
                              fill="none"
                              stroke="#e11d48"
                              strokeWidth={Math.abs(xSigned) === 1 ? 1.15 : 0.75}
                            />
                          );
                        })
                      )}
                    </g>
                  )}

                  {/* Constant-Q Contours */}
                  {showQContours && (
                    <g clipPath="url(#smith-unit-clip)" opacity="0.7">
                      {Q_VALUES.flatMap((q) =>
                        [1, -1].map((sign) => {
                          const cy = sign * (1 / q) * R_CHART;
                          const rPx = Math.sqrt(1 + 1 / (q * q)) * R_CHART;
                          return (
                            <circle
                              key={`q-${q}-${sign}`}
                              cx={0}
                              cy={cy}
                              r={rPx}
                              fill="none"
                              stroke="#d97706"
                              strokeWidth="1"
                              strokeDasharray="5 3"
                            />
                          );
                        })
                      )}
                    </g>
                  )}

                  {/* Target VSWR Circle */}
                  {showVswrCircle && targetVswrRadius > 0 && targetVswrRadius < R_CHART && (
                    <circle
                      cx="0"
                      cy="0"
                      r={targetVswrRadius}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="1.4"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Real resistance axis + Center 1+j0 crosshair */}
                  <line
                    x1={-R_CHART}
                    y1="0"
                    x2={R_CHART}
                    y2="0"
                    className="stroke-slate-500 dark:stroke-slate-400"
                    strokeWidth="1"
                  />
                  <circle cx="0" cy="0" r="3" fill="none" className="stroke-slate-700 dark:stroke-slate-200" strokeWidth="1.3" />

                  {/* Normalized Resistance & Reactance Labels */}
                  {GRID_VALUES.map((rVal) => {
                    const g = (rVal - 1) / (rVal + 1);
                    return (
                      <text
                        key={`lbl-r-${rVal}`}
                        x={g * R_CHART + 2}
                        y={-4}
                        fontSize="9"
                        fontWeight="600"
                        className="fill-rose-700 dark:fill-rose-300"
                      >
                        {rVal}
                      </text>
                    );
                  })}
                  {[0.2, 0.5, 1, 2, 5].flatMap((xVal) =>
                    [xVal, -xVal].map((xSigned) => {
                      const zEdge: Complex = { re: 0, im: xSigned };
                      const gEdge = zToGamma(zEdge, 1);
                      const lx = gEdge.re * (R_CHART + 17);
                      const ly = -gEdge.im * (R_CHART + 17) + 3;
                      return (
                        <text
                          key={`lbl-x-${xSigned}`}
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="600"
                          className="fill-slate-600 dark:fill-slate-300"
                        >
                          {xSigned > 0 ? `+j${xSigned}` : `-j${Math.abs(xSigned)}`}
                        </text>
                      );
                    })
                  )}
                  <text x={-R_CHART - 16} y="3" textAnchor="end" fontSize="9.5" fontWeight="700" className="fill-slate-600 dark:fill-slate-300">
                    0 &Omega;
                  </text>
                  <text x={R_CHART + 14} y="3" textAnchor="start" fontSize="9.5" fontWeight="700" className="fill-slate-600 dark:fill-slate-300">
                    &infin;
                  </text>

                  {/* Frequency Span Dispersion Curve */}
                  {freqSweepTrace && (
                    <g>
                      <polyline
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.4"
                        strokeDasharray="4 2"
                        points={freqSweepTrace.pts
                          .map((g) => `${(g.re * R_CHART).toFixed(2)},${(-g.im * R_CHART).toFixed(2)}`)
                          .join(' ')}
                      />
                      <circle
                        cx={freqSweepTrace.low.re * R_CHART}
                        cy={-freqSweepTrace.low.im * R_CHART}
                        r="3.5"
                        fill="#14b8a6"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <circle
                        cx={freqSweepTrace.high.re * R_CHART}
                        cy={-freqSweepTrace.high.im * R_CHART}
                        r="3.5"
                        fill="#0f766e"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </g>
                  )}

                  {/* Stage Parametric Trajectory Arcs */}
                  {stages.slice(1).map((stage) => (
                    <polyline
                      key={`arc-${stage.index}`}
                      fill="none"
                      stroke={stage.color}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd="url(#smith-arc-arrow)"
                      points={stage.arcGammas
                        .map((g) => `${(g.re * R_CHART).toFixed(2)},${(-g.im * R_CHART).toFixed(2)}`)
                        .join(' ')}
                    />
                  ))}

                  {/* Stage Data Point Markers (DP 1 .. DP N) */}
                  {stages.map((stage, idx) => {
                    const cx = stage.gamma.re * R_CHART;
                    const cy = -stage.gamma.im * R_CHART;
                    const isFirst = idx === 0;
                    const isLast = idx === stages.length - 1;
                    return (
                      <g key={`dp-dot-${stage.index}`}>
                        {isLast && (
                          <circle cx={cx} cy={cy} r="10" fill="none" stroke="#e11d48" strokeWidth="1.8" opacity="0.6" />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isFirst || isLast ? 5.5 : 4.5}
                          fill={isLast ? '#e11d48' : stage.color}
                          stroke="#ffffff"
                          strokeWidth="1.6"
                        />
                        <text
                          x={cx + 8}
                          y={cy - 8}
                          fontSize="10"
                          fontWeight="800"
                          className="fill-slate-900 dark:fill-slate-100"
                          style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2.5 }}
                        >
                          {stage.dpLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Hover Cursor Point */}
                  {hoverGamma && (
                    <g className="pointer-events-none">
                      <circle
                        cx={hoverGamma.re * R_CHART}
                        cy={-hoverGamma.im * R_CHART}
                        r="5"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="1.8"
                      />
                      <circle
                        cx={hoverGamma.re * R_CHART}
                        cy={-hoverGamma.im * R_CHART}
                        r="1.8"
                        fill="#0284c7"
                      />
                    </g>
                  )}
                </svg>

                {/* Hover & Final Port Readout Strip */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      {hoverDetails ? 'Cursor Probe' : 'Cursor Probe (Hover over chart)'}
                    </div>
                    {hoverDetails ? (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[11px]">
                        <span>Z: <strong>{formatComplexOhms(hoverDetails.z)}</strong></span>
                        <span>VSWR: <strong>{formatCompact(hoverDetails.vswr, 2)}:1</strong></span>
                        <span>Y: <strong>{formatComplexAdmittanceMs(hoverDetails.y)}</strong></span>
                        <span>RL: <strong>{formatCompact(hoverDetails.returnLossDb, 1)} dB</strong></span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Move pointer over chart to inspect Z, Y, VSWR &amp; Return Loss.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2.5 dark:border-rose-900/60 dark:bg-rose-950/30">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-1">
                      Input Port ({finalStage.dpLabel} @ {freqVal} {freqUnit})
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[11px]">
                      <span>Z<sub>in</sub>: <strong>{formatComplexOhms(finalStage.z)}</strong></span>
                      <span>VSWR: <strong>{formatCompact(finalStage.vswr, 2)}:1</strong></span>
                      <span>|&Gamma;|: <strong>{formatCompact(cAbs(finalStage.gamma), 3)} &ang; {formatCompact(cArgDeg(finalStage.gamma), 1)}&deg;</strong></span>
                      <span>RL: <strong>{formatCompact(finalStage.returnLossDb, 1)} dB</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Component Palette + Auto L-Match + Interactive Schematic Chain */}
            <div className="xl:col-span-6 space-y-4">
              {/* Component Palette */}
              <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Add Component to Matching Network</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Added after {finalStage.dpLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                  {(Object.keys(COMPONENT_META) as ComponentKind[]).map((kind) => {
                    const meta = COMPONENT_META[kind];
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => addComponent(kind)}
                        className="rounded-lg border border-stone-200 bg-stone-50/80 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-cyan-400 hover:bg-cyan-50/70 hover:text-cyan-900 transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-600 dark:hover:bg-cyan-950/50"
                      >
                        + {meta.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Auto L-Match Suggestions */}
                {lMatchOptions.length > 0 && (
                  <div className="pt-2.5 border-t border-stone-100 dark:border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>One-Click Analytical L-Match to {safeZ0} &Omega;</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {lMatchOptions.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => applyAutoMatch(opt)}
                          className="text-left rounded-lg border border-indigo-200/80 bg-indigo-50/50 px-2.5 py-1.5 hover:bg-indigo-100/70 transition-colors dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:hover:bg-cyan-900/40"
                        >
                          <div className="text-[10px] font-bold text-indigo-700 dark:text-cyan-300">{opt.label}</div>
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-200 truncate">
                            {opt.topology}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage 1: Black Box (Load Z_L) Card */}
              <div className="rounded-xl border border-emerald-200 bg-white p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-slate-900 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      DP 1
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        Black Box — Load Impedance (Z<sub>L</sub>)
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {formatComplexOhms({ re: loadR, im: loadX })}
                      </span>
                    </div>
                  </div>
                  <ComponentSchematicGlyph kind="black_box" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label htmlFor="smith-load-r" className="font-semibold text-slate-700 dark:text-slate-300">
                        Resistance R<sub>L</sub> (&Omega;)
                      </label>
                      <input
                        id="smith-load-r"
                        type="number"
                        min="0"
                        max="2000"
                        step="0.5"
                        value={loadR}
                        onChange={(e) => setLoadR(Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <input
                      type="range"
                      aria-label="Load Resistance R"
                      min="0"
                      max="250"
                      step="0.5"
                      value={Math.min(250, loadR)}
                      onChange={(e) => setLoadR(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label htmlFor="smith-load-x" className="font-semibold text-slate-700 dark:text-slate-300">
                        Reactance X<sub>L</sub> (&Omega;)
                      </label>
                      <input
                        id="smith-load-x"
                        type="number"
                        min="-2000"
                        max="2000"
                        step="0.5"
                        value={loadX}
                        onChange={(e) => setLoadX(Number(e.target.value) || 0)}
                        className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
                      />
                    </div>
                    <input
                      type="range"
                      aria-label="Load Reactance X"
                      min="-200"
                      max="200"
                      step="0.5"
                      value={Math.max(-200, Math.min(200, loadX))}
                      onChange={(e) => setLoadX(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Quick Load Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Presets:</span>
                  {[
                    { label: '25 - j35 Ω', r: 25, x: -35 },
                    { label: '15 + j30 Ω', r: 15, x: 30 },
                    { label: '100 - j50 Ω', r: 100, x: -50 },
                    { label: '75 + j0 Ω', r: 75, x: 0 },
                    { label: `${safeZ0} + j0 Ω`, r: safeZ0, x: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setLoadR(preset.r);
                        setLoadX(preset.x);
                      }}
                      className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-emerald-950/50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cascaded Component Cards */}
              <div className="space-y-2.5">
                {components.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                    No matching components added yet. Pick any component above or use &ldquo;One-Click Analytical L-Match&rdquo;.
                  </div>
                ) : (
                  components.map((comp, idx) => {
                    const meta = COMPONENT_META[comp.kind];
                    const bounds = sliderBoundsForUnit(meta, comp.unit);
                    const stage = stages[idx + 1];
                    const color = STAGE_COLORS[idx % STAGE_COLORS.length];
                    const usesLineZ0 =
                      comp.kind === 'tx_line' || comp.kind === 'open_stub' || comp.kind === 'short_stub';

                    return (
                      <div
                        key={comp.id}
                        className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              DP {idx + 2}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {meta.label}
                              </h4>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                Z = {formatComplexOhms(stage.z)} &middot; VSWR {formatCompact(stage.vswr, 2)}:1
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <ComponentSchematicGlyph kind={comp.kind} />
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveComponent(idx, -1)}
                                  disabled={idx === 0}
                                  title="Move earlier toward Load"
                                  className="p-1 rounded border border-stone-200 text-slate-600 hover:bg-stone-100 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveComponent(idx, 1)}
                                  disabled={idx === components.length - 1}
                                  title="Move closer to Input Port"
                                  className="p-1 rounded border border-stone-200 text-slate-600 hover:bg-stone-100 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeComponent(comp.id)}
                                  title="Remove component"
                                  className="p-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-400 dark:hover:bg-rose-950/60"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Value Input, Unit Selector, and Tuning Slider */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              min={meta.kind === 'transformer' ? 0.05 : 0}
                              value={comp.value}
                              onChange={(e) => updateComponent(comp.id, { value: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-28 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                            {meta.units.length > 1 ? (
                              <select
                                aria-label={`${meta.label} unit`}
                                value={comp.unit}
                                onChange={(e) => {
                                  const nextUnit = e.target.value as CompUnit;
                                  const nextBounds = sliderBoundsForUnit(meta, nextUnit);
                                  updateComponent(comp.id, {
                                    unit: nextUnit,
                                    value: Math.min(nextBounds.max, Math.max(nextBounds.min, comp.value)),
                                  });
                                }}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              >
                                {meta.units.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                N:1 ratio
                              </span>
                            )}

                            {usesLineZ0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  Z<sub>line</sub>:
                                </span>
                                <input
                                  type="number"
                                  min="5"
                                  max="300"
                                  step="1"
                                  value={comp.lineZ0}
                                  onChange={(e) => updateComponent(comp.id, { lineZ0: Math.max(1, Number(e.target.value) || 50) })}
                                  className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
                                />
                                <span className="text-[11px] text-slate-500">&Omega;</span>
                                {comp.unit === 'mm' && (
                                  <>
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-1">vf:</span>
                                    <input
                                      type="number"
                                      min="0.1"
                                      max="1"
                                      step="0.01"
                                      value={comp.vf}
                                      onChange={(e) =>
                                        updateComponent(comp.id, {
                                          vf: Math.max(0.1, Math.min(1, Number(e.target.value) || 0.66)),
                                        })
                                      }
                                      className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <input
                            type="range"
                            aria-label={`${meta.label} slider`}
                            min={bounds.min}
                            max={bounds.max}
                            step={bounds.step}
                            value={Math.min(bounds.max, Math.max(bounds.min, comp.value))}
                            onChange={(e) => updateComponent(comp.id, { value: Number(e.target.value) })}
                            className="w-full"
                            style={{ accentColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Full Data Points Table (DP 1 .. DP N) */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="px-4 py-2.5 border-b border-stone-200 bg-stone-50/90 dark:border-slate-800 dark:bg-slate-900/95 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Network Data Points (DP 1 &rarr; {finalStage.dpLabel})
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                f = {freqVal} {freqUnit} &middot; Z<sub>0</sub> = {safeZ0} &Omega;
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/70 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3.5 py-2 font-bold">Point</th>
                    <th className="px-3.5 py-2 font-bold">Stage</th>
                    <th className="px-3.5 py-2 font-bold">Impedance Z</th>
                    <th className="px-3.5 py-2 font-bold">Admittance Y</th>
                    <th className="px-3.5 py-2 font-bold">Reflection &Gamma;</th>
                    <th className="px-3.5 py-2 font-bold">VSWR</th>
                    <th className="px-3.5 py-2 font-bold">Return Loss</th>
                    <th className="px-3.5 py-2 font-bold">Mismatch Loss</th>
                    <th className="px-3.5 py-2 font-bold">Node Q</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800 font-mono text-[11px]">
                  {stages.map((s) => (
                    <tr key={s.dpLabel} className="hover:bg-stone-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 font-sans font-bold">
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-[10px] text-white"
                          style={{ backgroundColor: s.color }}
                        >
                          {s.dpLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {s.title} <span className="text-slate-400 font-mono">({s.subtitle})</span>
                      </td>
                      <td className="px-3.5 py-2 text-slate-800 dark:text-slate-100">{formatComplexOhms(s.z)}</td>
                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">{formatComplexAdmittanceMs(s.y)}</td>
                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                        {formatCompact(cAbs(s.gamma), 3)} &ang; {formatCompact(cArgDeg(s.gamma), 1)}&deg;
                      </td>
                      <td className="px-3.5 py-2 font-bold text-slate-900 dark:text-white">{formatCompact(s.vswr, 2)}:1</td>
                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">{formatCompact(s.returnLossDb, 2)} dB</td>
                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">{formatCompact(s.mismatchLossDb, 2)} dB</td>
                      <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300">{formatCompact(s.qFactor, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
