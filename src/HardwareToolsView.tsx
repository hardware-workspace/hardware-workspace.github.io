import React, { useMemo, useState } from 'react';
import { Calculator, Cpu, Layers, RotateCcw, Wrench, Zap } from 'lucide-react';
import SignalPulse from './SignalPulse';
import ScientificCalculator from './ScientificCalculator';

export type DividerField = 'vs' | 'r1' | 'r2' | 'vout';
export type ResistanceUnit = 1 | 1000 | 1000000;

interface SolveParams {
  vs: string;
  r1: string;
  r2: string;
  vout: string;
  r1Unit: ResistanceUnit;
  r2Unit: ResistanceUnit;
  target: DividerField;
}

type SolveResult =
  | { ok: true; value: string; numeric: number }
  | { ok: false; error: string };

const RESISTANCE_UNITS: Array<{ value: ResistanceUnit; label: string; short: string }> = [
  { value: 1, label: 'ohms (Ω)', short: 'Ω' },
  { value: 1000, label: 'kilohms (kΩ)', short: 'kΩ' },
  { value: 1000000, label: 'megohms (MΩ)', short: 'MΩ' },
];

function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPreciseNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) < 1e-15) return '0';
  return Number(value.toPrecision(12)).toString();
}

function formatEngineeringUnit(value: number, unit: string): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`;
  if (abs >= 1e6) return `${Number((value / 1e6).toPrecision(4))} M${unit}`;
  if (abs >= 1e3) return `${Number((value / 1e3).toPrecision(4))} k${unit}`;
  if (abs >= 1) return `${Number(value.toPrecision(4))} ${unit}`;
  if (abs >= 1e-3) return `${Number((value * 1e3).toPrecision(4))} m${unit}`;
  if (abs >= 1e-6) return `${Number((value * 1e6).toPrecision(4))} µ${unit}`;
  return `${Number((value * 1e9).toPrecision(4))} n${unit}`;
}

export function solveVoltageDivider(params: SolveParams): SolveResult {
  const vsVal = parseNumericInput(params.vs);
  const r1Raw = parseNumericInput(params.r1);
  const r2Raw = parseNumericInput(params.r2);
  const voutVal = parseNumericInput(params.vout);

  const r1Ohm = r1Raw !== null ? r1Raw * params.r1Unit : null;
  const r2Ohm = r2Raw !== null ? r2Raw * params.r2Unit : null;

  if (params.target === 'vout') {
    if (vsVal === null || r1Ohm === null || r2Ohm === null) {
      return { ok: false, error: 'Enter valid numbers for Voltage Source (Vs), Resistance 1 (R₁), and Resistance 2 (R₂).' };
    }
    if (r1Ohm < 0 || r2Ohm < 0) {
      return { ok: false, error: 'Resistances R₁ and R₂ must be non-negative.' };
    }
    const totalR = r1Ohm + r2Ohm;
    if (totalR <= 0) {
      return { ok: false, error: 'Total resistance (R₁ + R₂) must be greater than 0.' };
    }
    const computed = (vsVal * r2Ohm) / totalR;
    return { ok: true, value: formatPreciseNumber(computed), numeric: computed };
  }

  if (params.target === 'vs') {
    if (voutVal === null || r1Ohm === null || r2Ohm === null) {
      return { ok: false, error: 'Enter valid numbers for Resistance 1 (R₁), Resistance 2 (R₂), and Output Voltage (Vout).' };
    }
    if (r1Ohm < 0 || r2Ohm < 0) {
      return { ok: false, error: 'Resistances R₁ and R₂ must be non-negative.' };
    }
    if (r2Ohm === 0) {
      return { ok: false, error: 'Resistance R₂ must be greater than 0 to solve for Voltage Source (Vs).' };
    }
    const computed = (voutVal * (r1Ohm + r2Ohm)) / r2Ohm;
    return { ok: true, value: formatPreciseNumber(computed), numeric: computed };
  }

  if (params.target === 'r1') {
    if (vsVal === null || voutVal === null || r2Ohm === null) {
      return { ok: false, error: 'Enter valid numbers for Voltage Source (Vs), Resistance 2 (R₂), and Output Voltage (Vout).' };
    }
    if (r2Ohm < 0) {
      return { ok: false, error: 'Resistance R₂ must be non-negative.' };
    }
    if (voutVal === 0) {
      return { ok: false, error: 'Output Voltage (Vout) cannot be 0 when solving for R₁.' };
    }
    const computedOhm = (r2Ohm * (vsVal - voutVal)) / voutVal;
    if (computedOhm < 0) {
      return { ok: false, error: 'R₁ would be negative: check that Vout is between 0 and Vs with the same polarity.' };
    }
    const computedInUnit = computedOhm / params.r1Unit;
    return { ok: true, value: formatPreciseNumber(computedInUnit), numeric: computedInUnit };
  }

  // params.target === 'r2'
  if (vsVal === null || voutVal === null || r1Ohm === null) {
    return { ok: false, error: 'Enter valid numbers for Voltage Source (Vs), Resistance 1 (R₁), and Output Voltage (Vout).' };
  }
  if (r1Ohm < 0) {
    return { ok: false, error: 'Resistance R₁ must be non-negative.' };
  }
  const drop = vsVal - voutVal;
  if (drop === 0) {
    return { ok: false, error: 'Voltage Source (Vs) and Output Voltage (Vout) cannot be equal when solving for R₂.' };
  }
  const computedOhm = (r1Ohm * voutVal) / drop;
  if (computedOhm < 0) {
    return { ok: false, error: 'R₂ would be negative: check that Vout is between 0 and Vs with the same polarity.' };
  }
  const computedInUnit = computedOhm / params.r2Unit;
  return { ok: true, value: formatPreciseNumber(computedInUnit), numeric: computedInUnit };
}

function VoltageDividerSchematic() {
  return (
    <svg
      viewBox="0 0 430 270"
      className="w-full max-w-[400px] h-auto text-slate-900 dark:text-slate-100 select-none"
      role="img"
      aria-label="Voltage divider schematic with source voltage Vs, series resistors R1 and R2, and output voltage Vout"
    >
      {/* Top & bottom rails */}
      <path d="M 85 95 V 22 H 265 V 42" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="miter" />
      <path d="M 85 112 V 235 H 355" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="miter" />

      {/* Battery source symbol */}
      <line x1="69" y1="95" x2="101" y2="95" stroke="currentColor" strokeWidth="3.2" />
      <line x1="77" y1="112" x2="93" y2="112" stroke="currentColor" strokeWidth="3.2" />

      {/* + and - polarity markers */}
      <text x="58" y="88" fontSize="20" fontWeight="700" fill="currentColor" textAnchor="middle">+</text>
      <text x="58" y="131" fontSize="22" fontWeight="700" fill="currentColor" textAnchor="middle">-</text>

      {/* Source Voltage label */}
      <text x="106" y="110" fontSize="15" fontWeight="500" fill="currentColor">Source</text>
      <text x="106" y="129" fontSize="15" fontWeight="500" fill="currentColor">
        Voltage (V<tspan dy="3" fontSize="11">S</tspan><tspan dy="-3">)</tspan>
      </text>

      {/* Resistor R1 zigzag */}
      <path
        d="M 265 42 L 251 50 L 279 62 L 251 74 L 279 86 L 251 98 L 279 110 L 265 118 V 148"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text x="242" y="85" fontSize="15" fontWeight="500" fill="currentColor" textAnchor="end">
        Resistor (R<tspan dy="3" fontSize="11">1</tspan><tspan dy="-3">)</tspan>
      </text>

      {/* Junction node & Vout top branch */}
      <circle cx="265" cy="136" r="4" fill="currentColor" />
      <line x1="265" y1="136" x2="355" y2="136" stroke="currentColor" strokeWidth="2.8" />

      {/* Resistor R2 zigzag */}
      <path
        d="M 265 148 L 251 156 L 279 168 L 251 180 L 279 192 L 251 204 L 279 216 L 265 224 V 235"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text x="242" y="191" fontSize="15" fontWeight="500" fill="currentColor" textAnchor="end">
        Resistor (R<tspan dy="3" fontSize="11">2</tspan><tspan dy="-3">)</tspan>
      </text>

      {/* Curved Output Voltage arrows & label */}
      <path d="M 326 138 Q 344 150 338 166" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M 334 160 L 338 167 L 343 161" fill="none" stroke="currentColor" strokeWidth="1.4" />

      <path d="M 326 233 Q 344 221 338 206" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M 334 212 L 338 205 L 343 211" fill="none" stroke="currentColor" strokeWidth="1.4" />

      <text x="334" y="182" fontSize="15" fontWeight="500" fill="currentColor" textAnchor="middle">Output</text>
      <text x="334" y="199" fontSize="15" fontWeight="500" fill="currentColor" textAnchor="middle">Voltage</text>
      <text x="334" y="216" fontSize="15" fontWeight="500" fill="currentColor" textAnchor="middle">
        (V<tspan dy="3" fontSize="11">out</tspan><tspan dy="-3">)</tspan>
      </text>
    </svg>
  );
}

export default function HardwareToolsView() {
  const [activeTool, setActiveTool] = useState<'all' | 'voltage_divider' | 'scientific_calculator'>('all');
  const [vs, setVs] = useState('');
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  const [vout, setVout] = useState('');
  const [r1Unit, setR1Unit] = useState<ResistanceUnit>(1);
  const [r2Unit, setR2Unit] = useState<ResistanceUnit>(1);
  const [targetField, setTargetField] = useState<DividerField>('vout');
  const [errorMsg, setErrorMsg] = useState('');

  const updateFieldValue = (field: DividerField, nextRaw: string) => {
    const nextValues = { vs, r1, r2, vout, [field]: nextRaw };
    if (field === 'vs') setVs(nextRaw);
    else if (field === 'r1') setR1(nextRaw);
    else if (field === 'r2') setR2(nextRaw);
    else setVout(nextRaw);

    setErrorMsg('');

    const fields: DividerField[] = ['vs', 'r1', 'r2', 'vout'];
    const emptyFields = fields.filter((f) => nextValues[f].trim() === '');
    if (emptyFields.length === 1) {
      setTargetField(emptyFields[0]);
    }
  };

  const applyCalculation = (overrideTarget?: DividerField, nextR1Unit?: ResistanceUnit, nextR2Unit?: ResistanceUnit) => {
    const activeR1Unit = nextR1Unit ?? r1Unit;
    const activeR2Unit = nextR2Unit ?? r2Unit;

    const currentMap = { vs, r1, r2, vout };
    const fields: DividerField[] = ['vs', 'r1', 'r2', 'vout'];
    const emptyFields = fields.filter((f) => currentMap[f].trim() === '');
    const effectiveTarget = overrideTarget ?? (emptyFields.length === 1 ? emptyFields[0] : targetField);

    if (emptyFields.length > 1) {
      setErrorMsg('Please enter at least three known values before clicking Calculate.');
      return;
    }

    setTargetField(effectiveTarget);
    const result = solveVoltageDivider({
      vs,
      r1,
      r2,
      vout,
      r1Unit: activeR1Unit,
      r2Unit: activeR2Unit,
      target: effectiveTarget,
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      return;
    }

    setErrorMsg('');
    if (effectiveTarget === 'vs') setVs(result.value);
    else if (effectiveTarget === 'r1') setR1(result.value);
    else if (effectiveTarget === 'r2') setR2(result.value);
    else setVout(result.value);
  };

  const handleUnitChange = (which: 'r1' | 'r2', newUnit: ResistanceUnit) => {
    if (which === 'r1') {
      setR1Unit(newUnit);
      if (targetField === 'r1' && r1.trim() !== '') {
        applyCalculation('r1', newUnit, r2Unit);
      }
    } else {
      setR2Unit(newUnit);
      if (targetField === 'r2' && r2.trim() !== '') {
        applyCalculation('r2', r1Unit, newUnit);
      }
    }
  };

  const handleClear = () => {
    setVs('');
    setR1('');
    setR2('');
    setVout('');
    setTargetField('vout');
    setErrorMsg('');
  };

  const summary = useMemo(() => {
    const vsNum = parseNumericInput(vs);
    const r1Raw = parseNumericInput(r1);
    const r2Raw = parseNumericInput(r2);
    const voutNum = parseNumericInput(vout);
    if (vsNum === null || r1Raw === null || r2Raw === null || voutNum === null) return null;
    if (r1Raw < 0 || r2Raw < 0) return null;
    const r1Ohm = r1Raw * r1Unit;
    const r2Ohm = r2Raw * r2Unit;
    const rTotal = r1Ohm + r2Ohm;
    if (rTotal <= 0) return null;

    const current = vsNum / rTotal;
    const pR1 = current * current * r1Ohm;
    const pR2 = current * current * r2Ohm;
    const pTotal = pR1 + pR2;
    const ratio = vsNum !== 0 ? voutNum / vsNum : null;

    return {
      rTotal,
      current,
      pR1,
      pR2,
      pTotal,
      ratio,
    };
  }, [vs, r1, r2, vout, r1Unit, r2Unit]);

  const inputClass = (field: DividerField) =>
    `w-full px-3 py-2 rounded-md text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all ${
      targetField === field
        ? 'border-2 border-[#e69138] ring-2 ring-[#e69138]/25 font-semibold'
        : 'border border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
    }`;

  return (
    <div className="space-y-4 max-w-6xl mx-auto py-1">
      {/* Section Header */}
      <div className="circuit-banner p-4 sm:p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1">
            <SignalPulse />
            <span>Hardware Engineering Calculators</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-300" />
            <span>Tools</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all' as const, label: 'All Tools (2)', icon: Layers },
            { id: 'voltage_divider' as const, label: '1. Voltage Divider Calculator', icon: Zap },
            { id: 'scientific_calculator' as const, label: '2. Scientific Calculator', icon: Calculator },
          ].map((tool) => {
            const Icon = tool.icon;
            const selected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selected
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                    : 'bg-slate-900/70 hover:bg-slate-800 text-cyan-100 border border-cyan-400/25'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool 1: Voltage Divider Calculator Card */}
      {(activeTool === 'all' || activeTool === 'voltage_divider') && (
      <section className="circuit-card rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        {/* Card Subheader */}
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-stone-50/80 dark:bg-slate-900/95">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Voltage Divider Calculator
          </h3>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Tools &gt; Voltage Divider Calculator
          </span>
        </div>

        {/* Graph-paper Engineering Surface */}
        <div
          className="p-5 sm:p-7 space-y-6 bg-[#f9fcff] dark:bg-slate-950/90"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Top Row: Formula Explanation (left) + Schematic (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                A voltage divider circuit is a very common circuit that takes a higher voltage and converts it to a
                lower one by using a pair of resistors. The formula for calculating the output voltage is based on Ohms
                Law and is shown below.
              </p>

              {/* Fraction Formula */}
              <div className="py-2 flex items-center gap-3 text-[#0b5394] dark:text-sky-400 select-text">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  V<sub className="text-lg sm:text-xl font-semibold">out</sub>
                </span>
                <span className="text-3xl sm:text-4xl font-semibold">=</span>
                <div className="inline-flex flex-col items-center leading-none">
                  <span className="px-3 pb-1.5 text-2xl sm:text-3xl font-semibold border-b-2 border-[#0b5394] dark:border-sky-400">
                    V<sub className="text-base sm:text-lg">s</sub> &times; R<sub className="text-base sm:text-lg">2</sub>
                  </span>
                  <span className="px-3 pt-1.5 text-2xl sm:text-3xl font-semibold">
                    (R<sub className="text-base sm:text-lg">1</sub> + R<sub className="text-base sm:text-lg">2</sub>)
                  </span>
                </div>
              </div>

              {/* Variable Definitions */}
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold">where:</p>
                <p>
                  <span className="font-medium">V<sub>S</sub></span> is the source voltage, measured in volts (V),
                </p>
                <p>
                  <span className="font-medium">R<sub>1</sub></span> is the resistance of the 1st resistor, measured in Ohms (&Omega;).
                </p>
                <p>
                  <span className="font-medium">R<sub>2</sub></span> is the resistance of the 2nd resistor, measured in Ohms (&Omega;).
                </p>
                <p>
                  <span className="font-medium">V<sub>out</sub></span> is the output voltage, measured in volts (V).
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center justify-center">
              <VoltageDividerSchematic />
            </div>
          </div>

          {/* Interactive Calculator Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyCalculation();
            }}
            className="pt-4 border-t border-sky-200/70 dark:border-slate-800 space-y-3"
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Enter any three known values and press &apos;Calculate&apos; to solve for the other.
            </p>

            <div className="max-w-3xl space-y-2.5">
              {/* Voltage Source (Vs) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
                <label htmlFor="vd-vs" className="sm:col-span-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Voltage Source (V<sub>S</sub>)
                </label>
                <div className="sm:col-span-4">
                  <input
                    id="vd-vs"
                    type="text"
                    inputMode="decimal"
                    value={vs}
                    onChange={(e) => updateFieldValue('vs', e.target.value)}
                    placeholder="source voltage"
                    className={inputClass('vs')}
                  />
                </div>
                <div className="sm:col-span-4 flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>Volts (V)</span>
                  {targetField === 'vs' && (
                    <span className="text-[11px] font-semibold text-[#d97706] dark:text-amber-400">Solving for V<sub>S</sub></span>
                  )}
                </div>
              </div>

              {/* Resistance 1 (R1) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
                <label htmlFor="vd-r1" className="sm:col-span-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Resistance 1 (R<sub>1</sub>)
                </label>
                <div className="sm:col-span-4">
                  <input
                    id="vd-r1"
                    type="text"
                    inputMode="decimal"
                    value={r1}
                    onChange={(e) => updateFieldValue('r1', e.target.value)}
                    placeholder="resistance 1"
                    className={inputClass('r1')}
                  />
                </div>
                <div className="sm:col-span-4 flex items-center gap-2">
                  <select
                    aria-label="Resistance 1 unit"
                    value={r1Unit}
                    onChange={(e) => handleUnitChange('r1', Number(e.target.value) as ResistanceUnit)}
                    className="w-full max-w-[200px] px-2.5 py-2 rounded-md text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {RESISTANCE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  {targetField === 'r1' && (
                    <span className="text-[11px] font-semibold text-[#d97706] dark:text-amber-400 shrink-0">Solving</span>
                  )}
                </div>
              </div>

              {/* Resistance 2 (R2) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
                <label htmlFor="vd-r2" className="sm:col-span-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Resistance 2 (R<sub>2</sub>)
                </label>
                <div className="sm:col-span-4">
                  <input
                    id="vd-r2"
                    type="text"
                    inputMode="decimal"
                    value={r2}
                    onChange={(e) => updateFieldValue('r2', e.target.value)}
                    placeholder="resistance 2"
                    className={inputClass('r2')}
                  />
                </div>
                <div className="sm:col-span-4 flex items-center gap-2">
                  <select
                    aria-label="Resistance 2 unit"
                    value={r2Unit}
                    onChange={(e) => handleUnitChange('r2', Number(e.target.value) as ResistanceUnit)}
                    className="w-full max-w-[200px] px-2.5 py-2 rounded-md text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {RESISTANCE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  {targetField === 'r2' && (
                    <span className="text-[11px] font-semibold text-[#d97706] dark:text-amber-400 shrink-0">Solving</span>
                  )}
                </div>
              </div>

              {/* Output Voltage (Vout) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
                <label htmlFor="vd-vout" className="sm:col-span-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Output Voltage (V<sub>OUT</sub>)
                </label>
                <div className="sm:col-span-4">
                  <input
                    id="vd-vout"
                    type="text"
                    inputMode="decimal"
                    value={vout}
                    onChange={(e) => updateFieldValue('vout', e.target.value)}
                    placeholder="output voltage"
                    className={inputClass('vout')}
                  />
                </div>
                <div className="sm:col-span-4 flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>Volts (V)</span>
                  {targetField === 'vout' && (
                    <span className="text-[11px] font-semibold text-[#d97706] dark:text-amber-400">Solving for V<sub>out</sub></span>
                  )}
                </div>
              </div>

              {/* Calculate + Clear Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4 pt-1.5">
                <div className="hidden sm:block sm:col-span-4" />
                <div className="sm:col-span-4 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-md bg-[#6d9eeb] hover:bg-[#5288e0] active:bg-[#3d73cb] text-white text-sm font-semibold shadow-xs transition-colors"
                  >
                    Calculate
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear all values"
                    className="inline-flex items-center gap-1 py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
                <p className="sm:col-span-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  Click &apos;Calculate&apos; to update the field with{' '}
                  <span className="font-semibold text-[#d97706] dark:text-amber-400">orange border</span>.
                </p>
              </div>
            </div>

            {errorMsg && (
              <p role="alert" className="max-w-3xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}
          </form>

          {/* Engineering Readout Strip */}
          {summary && (
            <div className="max-w-3xl rounded-xl border border-cyan-500/25 bg-white/90 dark:bg-slate-900/90 p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Circuit Operating Point</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Total Resistance</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatEngineeringUnit(summary.rTotal, 'Ω')}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Branch Current (I)</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatEngineeringUnit(summary.current, 'A')}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Ratio (V<sub>out</sub> / V<sub>S</sub>)</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {summary.ratio !== null ? `${formatPreciseNumber(summary.ratio)} (${formatPreciseNumber(summary.ratio * 100)}%)` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Power R<sub>1</sub></span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatEngineeringUnit(summary.pR1, 'W')}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Power R<sub>2</sub></span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatEngineeringUnit(summary.pR2, 'W')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Tool 2: Full Scientific Calculator Module */}
      {(activeTool === 'all' || activeTool === 'scientific_calculator') && (
      <section className="circuit-card rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-stone-50/80 dark:bg-slate-900/95">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Scientific Calculator
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Tools &gt; Scientific Calculator
          </span>
        </div>

        <div className="p-4 sm:p-6 bg-stone-100/70 dark:bg-slate-950/80 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 flex justify-center">
            <ScientificCalculator />
          </div>

          <div className="lg:col-span-6 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">
                Supported Modes &amp; Engineering Functions
              </h4>
              <ul className="space-y-1.5 text-xs leading-relaxed">
                <li>
                  <strong>Direct Math &amp; Equation Solver (<code className="text-indigo-600 dark:text-cyan-400">SOLVE</code>):</strong> Type equations like{' '}
                  <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">x² - 3x + 1 = 0</code> or{' '}
                  <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">cos(x) = x</code> and press <strong>=</strong> or <strong>SHIFT + CALC</strong>.
                </li>
                <li>
                  <strong>Exact Fractions &amp; Engineering Notation:</strong> Press <strong>S⇔D</strong> to convert decimals to exact fractions (<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">a/b</code> or mixed <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">a b/c</code>), and press <strong>ENG</strong> to cycle SI powers of 10<sup>3</sup> (<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">p, n, µ, m, k, M, G</code>).
                </li>
                <li>
                  <strong>Calculus &amp; Discrete Math:</strong> Numerical definite integral{' '}
                  <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">integrate(x^2, 0, 3)</code>, derivative{' '}
                  <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">deriv(x^3, 2)</code>, <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">sum()</code>, <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">prod()</code>, <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">nPr</code>/<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">nCr</code>, <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">GCD</code>/<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">LCM</code>, and prime factorization (<strong>SHIFT + °&apos;”</strong>).
                </li>
                <li>
                  <strong>Complex, Polar &amp; Hardware Constants:</strong> Use <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">i</code> and phasor{' '}
                  <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">5∠30</code>, <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">Pol(x,y)</code> / <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-slate-800">Rec(r,θ)</code>, physical constants (<strong>SHIFT + 7</strong>), unit conversions (<strong>SHIFT + 8</strong>), and variable registers <strong>A–Z / M</strong> (<strong>STO</strong> / <strong>RCL</strong>).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
