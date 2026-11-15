import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  HelpCircle,
  MoreVertical,
  Palette,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

export type AngleUnit = 'RAD' | 'DEG' | 'GRAD';
export type DisplayFormat = 'DECI' | 'FRAC' | 'ENG' | 'SCI';
type LcdTheme = 'mint' | 'dark' | 'paper';

interface Complex {
  re: number;
  im: number;
}

type AstNode =
  | { kind: 'num'; value: Complex }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '+' | '-' | 'sqrt' | 'cbrt' | 'fact' | 'pct'; arg: AstNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^' | 'mod' | 'angle' | 'divrem'; left: AstNode; right: AstNode }
  | { kind: 'call'; name: string; args: AstNode[] };

interface HistoryEntry {
  id: number;
  expr: string;
  result: string;
  secondary?: string;
  isError?: boolean;
}

const PHYSICAL_CONSTANTS: Array<{ symbol: string; name: string; value: number; unit: string }> = [
  { symbol: 'c', name: 'Speed of light', value: 299792458, unit: 'm/s' },
  { symbol: 'h', name: 'Planck constant', value: 6.62607015e-34, unit: 'J·s' },
  { symbol: 'q_e', name: 'Elementary charge', value: 1.602176634e-19, unit: 'C' },
  { symbol: 'ε0', name: 'Vacuum permittivity', value: 8.8541878128e-12, unit: 'F/m' },
  { symbol: 'μ0', name: 'Vacuum permeability', value: 1.25663706212e-6, unit: 'N/A²' },
  { symbol: 'k_B', name: 'Boltzmann constant', value: 1.380649e-23, unit: 'J/K' },
  { symbol: 'N_A', name: 'Avogadro constant', value: 6.02214076e23, unit: 'mol⁻¹' },
  { symbol: 'R', name: 'Molar gas constant', value: 8.314462618, unit: 'J/(mol·K)' },
  { symbol: 'g', name: 'Standard gravity', value: 9.80665, unit: 'm/s²' },
  { symbol: 'm_e', name: 'Electron mass', value: 9.1093837015e-31, unit: 'kg' },
  { symbol: 'σ', name: 'Stefan–Boltzmann', value: 5.670374419e-8, unit: 'W/(m²·K⁴)' },
  { symbol: 'Z0', name: 'Free space impedance', value: 376.730313668, unit: 'Ω' },
];

const QUICK_CONVERSIONS: Array<{ label: string; factor?: number; fn?: (x: number) => number; suffix: string }> = [
  { label: 'mm → in', factor: 1 / 25.4, suffix: 'in' },
  { label: 'in → mm', factor: 25.4, suffix: 'mm' },
  { label: 'mil → mm', factor: 0.0254, suffix: 'mm' },
  { label: 'mm → mil', factor: 1 / 0.0254, suffix: 'mil' },
  { label: '°C → °F', fn: (c) => (c * 9) / 5 + 32, suffix: '°F' },
  { label: '°F → °C', fn: (f) => ((f - 32) * 5) / 9, suffix: '°C' },
  { label: 'mW → dBm', fn: (mw) => 10 * Math.log10(mw), suffix: 'dBm' },
  { label: 'dBm → mW', fn: (dbm) => Math.pow(10, dbm / 10), suffix: 'mW' },
  { label: 'deg → rad', factor: Math.PI / 180, suffix: 'rad' },
  { label: 'rad → deg', factor: 180 / Math.PI, suffix: 'deg' },
];

const VARS_LIST = ['A', 'B', 'C', 'D', 'F', 'T', 'X', 'Y', 'Z', 'M'] as const;

const SAMPLE_EXPRESSIONS = [
  'x² - 3x + 1 = 0',
  'log(100) - √2 + cos(0)',
  '1/(2π*1000*10e-6)',
  'Pol(3, 4)',
  'integrate(x^2, 0, 3)',
  'deriv(x^3 - 2x, 2)',
];

// ============================================================================
// COMPLEX ARITHMETIC HELPERS
// ============================================================================
const C = (re: number, im = 0): Complex => ({ re, im });
const isRealVal = (z: Complex, eps = 1e-11) => Math.abs(z.im) <= eps;
const cAbs = (z: Complex) => Math.hypot(z.re, z.im);
const cArg = (z: Complex) => Math.atan2(z.im, z.re);

function cAdd(a: Complex, b: Complex): Complex {
  return C(a.re + b.re, a.im + b.im);
}
function cSub(a: Complex, b: Complex): Complex {
  return C(a.re - b.re, a.im - b.im);
}
function cMul(a: Complex, b: Complex): Complex {
  return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}
function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error('Math ERROR: Division by zero');
  return C((a.re * b.re + a.im * b.im) / denom, (a.im * b.re - a.re * b.im) / denom);
}
function cLn(z: Complex): Complex {
  const r = cAbs(z);
  if (r === 0) throw new Error('Math ERROR: ln(0)');
  return C(Math.log(r), cArg(z));
}
function cExp(z: Complex): Complex {
  const e = Math.exp(z.re);
  return C(e * Math.cos(z.im), e * Math.sin(z.im));
}
function cPow(a: Complex, b: Complex): Complex {
  if (isRealVal(a) && isRealVal(b)) {
    if (a.re === 0) {
      if (b.re === 0) return C(1, 0);
      if (b.re < 0) throw new Error('Math ERROR: Division by zero');
      return C(0, 0);
    }
    if (a.re > 0) return C(Math.pow(a.re, b.re), 0);
    if (Number.isInteger(b.re)) return C(Math.pow(a.re, b.re), 0);
  }
  if (a.re === 0 && a.im === 0) {
    if (b.re > 0) return C(0, 0);
    throw new Error('Math ERROR: 0 to negative exponent');
  }
  return cExp(cMul(b, cLn(a)));
}
function cSqrt(z: Complex): Complex {
  if (isRealVal(z) && z.re >= 0) return C(Math.sqrt(z.re), 0);
  const r = cAbs(z);
  const re = Math.sqrt((r + z.re) / 2);
  const im = (z.im >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, (r - z.re) / 2));
  return C(re, im);
}
function cSin(z: Complex): Complex {
  if (isRealVal(z)) return C(Math.sin(z.re), 0);
  return C(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im));
}
function cCos(z: Complex): Complex {
  if (isRealVal(z)) return C(Math.cos(z.re), 0);
  return C(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im));
}
function cTan(z: Complex): Complex {
  return cDiv(cSin(z), cCos(z));
}

function toRadians(val: number, unit: AngleUnit): number {
  if (unit === 'DEG') return (val * Math.PI) / 180;
  if (unit === 'GRAD') return (val * Math.PI) / 200;
  return val;
}
function fromRadians(rad: number, unit: AngleUnit): number {
  if (unit === 'DEG') return (rad * 180) / Math.PI;
  if (unit === 'GRAD') return (rad * 200) / Math.PI;
  return rad;
}

function gammaLanczos(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaLanczos(1 - z));
  const zz = z - 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (zz + i + 1);
  const t = zz + p.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, zz + 0.5) * Math.exp(-t) * x;
}

function factorialReal(n: number): number {
  if (n < 0 && Number.isInteger(n)) throw new Error('Math ERROR: Negative integer factorial');
  if (n > 170) throw new Error('Math ERROR: Overflow');
  if (Number.isInteger(n) && n >= 0) {
    let acc = 1;
    for (let k = 2; k <= n; k++) acc *= k;
    return acc;
  }
  return gammaLanczos(n + 1);
}

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}
function lcmInt(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((Math.round(a) * Math.round(b)) / gcdInt(a, b));
}

function primeFactorizationString(n: number): string | null {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 2 || n > 1e12) return null;
  let rem = n;
  const parts: string[] = [];
  for (let d = 2; d * d <= rem; d += d === 2 ? 1 : 2) {
    let count = 0;
    while (rem % d === 0) {
      rem /= d;
      count++;
    }
    if (count > 0) parts.push(count > 1 ? `${d}^${count}` : `${d}`);
  }
  if (rem > 1) parts.push(`${rem}`);
  return parts.join(' × ');
}

function approximateFraction(x: number, maxDen = 10000): { num: number; den: number } | null {
  if (!Number.isFinite(x) || Math.abs(x) > 1e9) return null;
  if (Math.abs(x - Math.round(x)) < 1e-11) return null;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  let h1 = 1;
  let h0 = 0;
  let k1 = 0;
  let k0 = 1;
  let b = absX;
  for (let iter = 0; iter < 32; iter++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    const frac = b - a;
    if (Math.abs(absX - h1 / k1) < 1e-11 || frac < 1e-12) break;
    b = 1 / frac;
  }
  if (k1 <= 1 || Math.abs(absX - h1 / k1) > 1e-8) return null;
  return { num: sign * h1, den: k1 };
}

function formatRealScalar(val: number): string {
  if (!Number.isFinite(val)) return String(val);
  if (Math.abs(val) < 1e-14) return '0';
  return Number(val.toPrecision(12)).toString();
}

function formatEngineering(val: number, shiftStep = 0): string {
  if (!Number.isFinite(val)) return String(val);
  if (Math.abs(val) < 1e-15) return '0 × 10⁰';
  const baseExp3 = Math.floor(Math.log10(Math.abs(val)) / 3) * 3 + shiftStep * 3;
  const mant = val / Math.pow(10, baseExp3);
  const prefixes: Record<number, string> = {
    '-12': 'p',
    '-9': 'n',
    '-6': 'µ',
    '-3': 'm',
    0: '',
    3: 'k',
    6: 'M',
    9: 'G',
    12: 'T',
  };
  const prefix = prefixes[baseExp3] ? ` (${prefixes[baseExp3]})` : '';
  return `${Number(mant.toPrecision(10))} × 10^${baseExp3}${prefix}`;
}

function formatDms(degVal: number): string {
  const sign = degVal < 0 ? '-' : '';
  const abs = Math.abs(degVal);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  let m = Math.floor(minFloat);
  let s = Number(((minFloat - m) * 60).toFixed(4));
  if (s >= 60) {
    s = 0;
    m += 1;
  }
  return `${sign}${d}° ${m}' ${s}"`;
}

function formatComplexValue(z: Complex, format: DisplayFormat, fracMode: 'improper' | 'mixed', engStep: number): string {
  const cleanRe = Math.abs(z.re) < 1e-13 ? 0 : z.re;
  const cleanIm = Math.abs(z.im) < 1e-13 ? 0 : z.im;
  if (cleanIm === 0) {
    if (format === 'ENG') return formatEngineering(cleanRe, engStep);
    if (format === 'SCI') return cleanRe === 0 ? '0' : cleanRe.toExponential(8).replace(/\.?0+e/, 'e');
    if (format === 'FRAC') {
      const f = approximateFraction(cleanRe);
      if (f) {
        if (fracMode === 'mixed' && Math.abs(f.num) > f.den) {
          const whole = Math.trunc(f.num / f.den);
          const rem = Math.abs(f.num % f.den);
          return `${whole} ${rem}/${f.den}`;
        }
        return `${f.num}/${f.den}`;
      }
    }
    return formatRealScalar(cleanRe);
  }
  const reStr = cleanRe === 0 ? '' : formatRealScalar(cleanRe);
  const absIm = Math.abs(cleanIm);
  const imCoeff = Math.abs(absIm - 1) < 1e-12 ? '' : formatRealScalar(absIm);
  if (cleanRe === 0) return `${cleanIm < 0 ? '-' : ''}${imCoeff}i`;
  return `${reStr} ${cleanIm < 0 ? '−' : '+'} ${imCoeff}i`;
}

// ============================================================================
// TOKENIZER & RECURSIVE-DESCENT PARSER
// ============================================================================
type TokType =
  | 'num'
  | 'ident'
  | 'func'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'bang'
  | 'pct'
  | 'pow2'
  | 'pow3'
  | 'powneg1'
  | 'sqrt'
  | 'cbrt'
  | 'dms';

interface Token {
  type: TokType;
  value: string;
}

const FUNC_NAMES = new Set([
  'asinh', 'acosh', 'atanh', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'cot⁻¹',
  'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'acot',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'log10', 'log', 'ln', 'exp',
  'nthroot', 'sqrt', 'cbrt', 'abs', 'ceil', 'floor', 'intg', 'round',
  'fact', 'gcd', 'lcm', 'npr', 'ncr', 'pol', 'rec',
  'ranint', 'ran', 'arg', 'conj', 're', 'im',
  'deriv', 'd_dx', 'integrate', 'sum', 'prod',
]);

function normalizeRawExpression(raw: string): string {
  return raw
    .replace(/×10\^/g, '*10^')
    .replace(/×10ˣ/g, '*10^')
    .replace(/×/g, '*')
    .replace(/÷R/g, ' divrem ')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/³√/g, ' cbrt ')
    .replace(/√/g, ' sqrt ')
    .replace(/∞/g, ' infinity ')
    .replace(/Ran#/gi, ' ran() ')
    .replace(/°/g, ' degsym ')
    .replace(/'/g, ' minsym ')
    .replace(/"/g, ' secsym ');
}

function tokenizeMath(input: string): Token[] {
  const s = normalizeRawExpression(input);
  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Numeric literal (including optional scientific notation e+3 / E-6)
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let sawDot = false;
      while (i < s.length && (/[0-9]/.test(s[i]) || (s[i] === '.' && !sawDot))) {
        if (s[i] === '.') sawDot = true;
        numStr += s[i++];
      }
      if (numStr === '.') throw new Error('Syntax ERROR: Unexpected "."');
      if (i < s.length && (s[i] === 'e' || s[i] === 'E')) {
        const next1 = s[i + 1];
        const next2 = s[i + 2];
        if (/[0-9]/.test(next1 || '') || ((next1 === '+' || next1 === '-') && /[0-9]/.test(next2 || ''))) {
          numStr += s[i++];
          if (s[i] === '+' || s[i] === '-') numStr += s[i++];
          while (i < s.length && /[0-9]/.test(s[i])) numStr += s[i++];
        }
      }
      tokens.push({ type: 'num', value: numStr });
      continue;
    }

    if (ch === '²') { tokens.push({ type: 'pow2', value: '²' }); i++; continue; }
    if (ch === '³') { tokens.push({ type: 'pow3', value: '³' }); i++; continue; }
    if (s.slice(i, i + 2) === '⁻¹') { tokens.push({ type: 'powneg1', value: '⁻¹' }); i += 2; continue; }
    if (ch === 'π') { tokens.push({ type: 'ident', value: 'pi' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
    if (ch === '!') { tokens.push({ type: 'bang', value: '!' }); i++; continue; }
    if (ch === '%') { tokens.push({ type: 'pct', value: '%' }); i++; continue; }
    if (ch === '∠') { tokens.push({ type: 'op', value: '∠' }); i++; continue; }
    if ('+-*/^'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }

    if (/[A-Za-z_]/.test(ch)) {
      // Match inverse trig with superscript e.g. sin⁻¹
      const invMatch = s.slice(i).match(/^(sin|cos|tan|cot)⁻¹/i);
      if (invMatch) {
        const base = invMatch[1].toLowerCase();
        const mapped = base === 'sin' ? 'asin' : base === 'cos' ? 'acos' : base === 'tan' ? 'atan' : 'acot';
        tokens.push({ type: 'func', value: mapped });
        i += invMatch[0].length;
        continue;
      }

      let word = '';
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) word += s[i++];
      const low = word.toLowerCase();

      if (low === 'degsym' || low === 'minsym' || low === 'secsym') {
        tokens.push({ type: 'dms', value: low });
        continue;
      }
      if (low === 'mod' || low === 'divrem') {
        tokens.push({ type: 'op', value: low });
        continue;
      }
      if (low === 'sqrt') { tokens.push({ type: 'sqrt', value: 'sqrt' }); continue; }
      if (low === 'cbrt') { tokens.push({ type: 'cbrt', value: 'cbrt' }); continue; }
      if (FUNC_NAMES.has(low)) { tokens.push({ type: 'func', value: low }); continue; }

      if (low === 'pi' || low === 'ans' || low === 'preans' || low === 'infinity' || low === 'inf') {
        tokens.push({ type: 'ident', value: low });
        continue;
      }

      // Split concatenated single-letter variables like `xy` or `ab`? Allow single letters or known word
      if (word.length > 1) {
        // Check if starts with known func name followed by suffix (no; e.g. `2x` already splits digit from `x`)
        for (const letter of word) tokens.push({ type: 'ident', value: letter });
      } else {
        tokens.push({ type: 'ident', value: word });
      }
      continue;
    }

    throw new Error(`Syntax ERROR: Unexpected "${ch}"`);
  }

  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): AstNode {
    if (this.tokens.length === 0) throw new Error('Syntax ERROR: Empty expression');
    const expr = this.parseAdditive();
    if (this.pos < this.tokens.length) {
      throw new Error(`Syntax ERROR: Unexpected "${this.tokens[this.pos].value}"`);
    }
    return expr;
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.next()!.value as '+' | '-';
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private startsImplicitFactor(tok?: Token): boolean {
    if (!tok) return false;
    return (
      tok.type === 'lparen' ||
      tok.type === 'func' ||
      tok.type === 'sqrt' ||
      tok.type === 'cbrt' ||
      tok.type === 'ident' ||
      tok.type === 'num'
    );
  }

  private parseMultiplicative(): AstNode {
    let left = this.parseAngle();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/' || tok.value === 'mod' || tok.value === 'divrem')) {
        const op = this.next()!.value as '*' | '/' | 'mod' | 'divrem';
        const right = this.parseAngle();
        left = { kind: 'binary', op, left, right };
      } else if (this.startsImplicitFactor(tok)) {
        const right = this.parseAngle();
        left = { kind: 'binary', op: '*', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseAngle(): AstNode {
    let left = this.parseUnary();
    while (this.peek()?.type === 'op' && this.peek()!.value === '∠') {
      this.next();
      const right = this.parseUnary();
      left = { kind: 'binary', op: 'angle', left, right };
    }
    return left;
  }

  private parseUnary(): AstNode {
    const tok = this.peek();
    if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
      this.next();
      const arg = this.parseUnary();
      return tok.value === '+' ? arg : { kind: 'unary', op: '-', arg };
    }
    if (tok?.type === 'sqrt') {
      this.next();
      return { kind: 'unary', op: 'sqrt', arg: this.parseUnary() };
    }
    if (tok?.type === 'cbrt') {
      this.next();
      return { kind: 'unary', op: 'cbrt', arg: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): AstNode {
    const base = this.parsePostfix();
    if (this.peek()?.type === 'op' && this.peek()!.value === '^') {
      this.next();
      const exponent = this.parseUnary();
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private parsePostfix(): AstNode {
    let node = this.parsePrimary();
    while (true) {
      const tok = this.peek();
      if (tok?.type === 'bang') {
        this.next();
        node = { kind: 'unary', op: 'fact', arg: node };
      } else if (tok?.type === 'pct') {
        this.next();
        node = { kind: 'unary', op: 'pct', arg: node };
      } else if (tok?.type === 'pow2') {
        this.next();
        node = { kind: 'binary', op: '^', left: node, right: { kind: 'num', value: C(2) } };
      } else if (tok?.type === 'pow3') {
        this.next();
        node = { kind: 'binary', op: '^', left: node, right: { kind: 'num', value: C(3) } };
      } else if (tok?.type === 'powneg1') {
        this.next();
        node = { kind: 'binary', op: '^', left: node, right: { kind: 'num', value: C(-1) } };
      } else if (tok?.type === 'dms' && tok.value === 'degsym') {
        // Parse DMS sequence: d° [m' [s"]]
        this.next();
        let totalNode: AstNode = node;
        if (this.peek() && (this.peek()!.type === 'num' || this.peek()!.type === 'lparen')) {
          const minNode = this.parsePrimary();
          if (this.peek()?.type === 'dms' && this.peek()!.value === 'minsym') this.next();
          totalNode = {
            kind: 'binary',
            op: '+',
            left: totalNode,
            right: { kind: 'binary', op: '/', left: minNode, right: { kind: 'num', value: C(60) } },
          };
          if (this.peek() && (this.peek()!.type === 'num' || this.peek()!.type === 'lparen')) {
            const secNode = this.parsePrimary();
            if (this.peek()?.type === 'dms' && this.peek()!.value === 'secsym') this.next();
            totalNode = {
              kind: 'binary',
              op: '+',
              left: totalNode,
              right: { kind: 'binary', op: '/', left: secNode, right: { kind: 'num', value: C(3600) } },
            };
          }
        }
        node = totalNode;
      } else {
        break;
      }
    }
    return node;
  }

  private parsePrimary(): AstNode {
    const tok = this.peek();
    if (!tok) throw new Error('Syntax ERROR: Unexpected end of input');

    if (tok.type === 'num') {
      this.next();
      return { kind: 'num', value: C(Number(tok.value), 0) };
    }

    if (tok.type === 'ident') {
      this.next();
      return { kind: 'var', name: tok.value };
    }

    if (tok.type === 'func') {
      const fnName = this.next()!.value;
      if (this.peek()?.type === 'lparen') {
        this.next();
        const args: AstNode[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseAdditive());
          while (this.peek()?.type === 'comma') {
            this.next();
            args.push(this.parseAdditive());
          }
        }
        if (this.peek()?.type !== 'rparen') throw new Error(`Syntax ERROR: Missing ")" for ${fnName}`);
        this.next();
        return { kind: 'call', name: fnName, args };
      }
      // Allow single-arg prefix call e.g. `cos 0`
      const arg = this.parseUnary();
      return { kind: 'call', name: fnName, args: [arg] };
    }

    if (tok.type === 'lparen') {
      this.next();
      const inner = this.parseAdditive();
      if (this.peek()?.type !== 'rparen') throw new Error('Syntax ERROR: Missing ")"');
      this.next();
      return inner;
    }

    throw new Error(`Syntax ERROR: Unexpected "${tok.value}"`);
  }
}

interface EvalEnv {
  angleUnit: AngleUnit;
  vars: Record<string, Complex>;
  ans: Complex;
  preAns: Complex;
  sideEffect?: string;
}

function evalAst(node: AstNode, env: EvalEnv): Complex {
  switch (node.kind) {
    case 'num':
      return node.value;

    case 'var': {
      const low = node.name.toLowerCase();
      if (low === 'pi') return C(Math.PI);
      if (low === 'e') return C(Math.E);
      if (low === 'i') return C(0, 1);
      if (low === 'infinity' || low === 'inf') return C(Infinity);
      if (low === 'ans') return env.ans;
      if (low === 'preans') return env.preAns;
      const key = node.name.toUpperCase();
      if (key in env.vars) return env.vars[key];
      return C(0);
    }

    case 'unary': {
      const v = evalAst(node.arg, env);
      if (node.op === '+') return v;
      if (node.op === '-') return C(-v.re, -v.im);
      if (node.op === 'sqrt') return cSqrt(v);
      if (node.op === 'cbrt') {
        if (isRealVal(v)) return C(Math.cbrt(v.re), 0);
        return cPow(v, C(1 / 3));
      }
      if (node.op === 'fact') {
        if (!isRealVal(v)) throw new Error('Math ERROR: Factorial requires real operand');
        return C(factorialReal(v.re));
      }
      if (node.op === 'pct') return C(v.re * 0.01, v.im * 0.01);
      return v;
    }

    case 'binary': {
      const a = evalAst(node.left, env);
      const b = evalAst(node.right, env);
      if (node.op === '+') return cAdd(a, b);
      if (node.op === '-') return cSub(a, b);
      if (node.op === '*') return cMul(a, b);
      if (node.op === '/') return cDiv(a, b);
      if (node.op === '^') return cPow(a, b);
      if (node.op === 'mod') {
        if (!isRealVal(a) || !isRealVal(b) || b.re === 0) throw new Error('Math ERROR: Invalid mod');
        return C(((a.re % b.re) + b.re) % b.re);
      }
      if (node.op === 'divrem') {
        if (!isRealVal(a) || !isRealVal(b) || b.re === 0) throw new Error('Math ERROR: Division by zero');
        const q = Math.trunc(a.re / b.re);
        const r = a.re - q * b.re;
        env.sideEffect = `Q = ${q}, R = ${formatRealScalar(r)}`;
        return C(q);
      }
      if (node.op === 'angle') {
        if (!isRealVal(a) || !isRealVal(b)) throw new Error('Math ERROR: Invalid phasor');
        const rad = toRadians(b.re, env.angleUnit);
        return C(a.re * Math.cos(rad), a.re * Math.sin(rad));
      }
      return C(0);
    }

    case 'call': {
      const fn = node.name.toLowerCase();
      // Higher-order symbolic/numerical operators first
      if (fn === 'deriv' || fn === 'd_dx') {
        if (node.args.length < 2) throw new Error('Syntax ERROR: deriv(expr, x0)');
        const x0 = evalAst(node.args[1], env).re;
        const h = Math.max(1e-6, Math.abs(x0) * 1e-6);
        const fAt = (x: number) => evalAst(node.args[0], { ...env, vars: { ...env.vars, X: C(x) } }).re;
        const d = (-fAt(x0 + 2 * h) + 8 * fAt(x0 + h) - 8 * fAt(x0 - h) + fAt(x0 - 2 * h)) / (12 * h);
        return C(d);
      }
      if (fn === 'integrate') {
        if (node.args.length < 3) throw new Error('Syntax ERROR: integrate(expr, a, b)');
        const a = evalAst(node.args[1], env).re;
        const b = evalAst(node.args[2], env).re;
        const n = 200; // composite Simpson
        const h = (b - a) / n;
        const fAt = (x: number) => evalAst(node.args[0], { ...env, vars: { ...env.vars, X: C(x) } }).re;
        let sum = fAt(a) + fAt(b);
        for (let k = 1; k < n; k++) {
          sum += (k % 2 === 0 ? 2 : 4) * fAt(a + k * h);
        }
        return C((sum * h) / 3);
      }
      if (fn === 'sum' || fn === 'prod') {
        if (node.args.length < 3) throw new Error(`Syntax ERROR: ${fn}(expr, start, end)`);
        const a = Math.round(evalAst(node.args[1], env).re);
        const b = Math.round(evalAst(node.args[2], env).re);
        if (Math.abs(b - a) > 100000) throw new Error('Math ERROR: Range too large');
        let acc = C(fn === 'sum' ? 0 : 1);
        const step = a <= b ? 1 : -1;
        for (let k = a; step > 0 ? k <= b : k >= b; k += step) {
          const val = evalAst(node.args[0], { ...env, vars: { ...env.vars, X: C(k), K: C(k) } });
          acc = fn === 'sum' ? cAdd(acc, val) : cMul(acc, val);
        }
        return acc;
      }

      const args = node.args.map((a) => evalAst(a, env));
      const a0 = args[0] ?? C(0);
      const a1 = args[1] ?? C(0);

      switch (fn) {
        case 'sin':
          return isRealVal(a0) ? C(Math.sin(toRadians(a0.re, env.angleUnit))) : cSin(a0);
        case 'cos':
          return isRealVal(a0) ? C(Math.cos(toRadians(a0.re, env.angleUnit))) : cCos(a0);
        case 'tan': {
          if (isRealVal(a0)) {
            const rad = toRadians(a0.re, env.angleUnit);
            const c = Math.cos(rad);
            if (Math.abs(c) < 1e-15) throw new Error('Math ERROR: tan undefined');
            return C(Math.tan(rad));
          }
          return cTan(a0);
        }
        case 'cot':
          return cDiv(C(1), evalAst({ ...node, name: 'tan' }, env));
        case 'sec':
          return cDiv(C(1), evalAst({ ...node, name: 'cos' }, env));
        case 'csc':
          return cDiv(C(1), evalAst({ ...node, name: 'sin' }, env));
        case 'asin':
          if (!isRealVal(a0) || Math.abs(a0.re) > 1) throw new Error('Math ERROR: Domain [-1, 1]');
          return C(fromRadians(Math.asin(a0.re), env.angleUnit));
        case 'acos':
          if (!isRealVal(a0) || Math.abs(a0.re) > 1) throw new Error('Math ERROR: Domain [-1, 1]');
          return C(fromRadians(Math.acos(a0.re), env.angleUnit));
        case 'atan':
          if (!isRealVal(a0)) throw new Error('Math ERROR: Real domain required');
          return C(fromRadians(Math.atan(a0.re), env.angleUnit));
        case 'acot':
          if (!isRealVal(a0)) throw new Error('Math ERROR: Real domain required');
          return C(fromRadians(Math.PI / 2 - Math.atan(a0.re), env.angleUnit));
        case 'sinh': return C(Math.sinh(a0.re));
        case 'cosh': return C(Math.cosh(a0.re));
        case 'tanh': return C(Math.tanh(a0.re));
        case 'asinh': return C(Math.asinh(a0.re));
        case 'acosh':
          if (a0.re < 1) throw new Error('Math ERROR: Domain [1, ∞)');
          return C(Math.acosh(a0.re));
        case 'atanh':
          if (Math.abs(a0.re) >= 1) throw new Error('Math ERROR: Domain (-1, 1)');
          return C(Math.atanh(a0.re));
        case 'ln':
          return cLn(a0);
        case 'log10':
          return cDiv(cLn(a0), C(Math.LN10));
        case 'log':
          if (args.length >= 2) return cDiv(cLn(a1), cLn(a0));
          return cDiv(cLn(a0), C(Math.LN10));
        case 'exp':
          return cExp(a0);
        case 'sqrt':
          return cSqrt(a0);
        case 'cbrt':
          return isRealVal(a0) ? C(Math.cbrt(a0.re)) : cPow(a0, C(1 / 3));
        case 'nthroot':
          if (args.length < 2) throw new Error('Syntax ERROR: nthRoot(n, x)');
          return isRealVal(a0) && isRealVal(a1) && a1.re < 0 && Math.abs(a0.re % 2) === 1
            ? C(-Math.pow(-a1.re, 1 / a0.re))
            : cPow(a1, C(1 / a0.re));
        case 'abs': return C(cAbs(a0));
        case 'ceil': return C(Math.ceil(a0.re));
        case 'floor':
        case 'intg': return C(Math.floor(a0.re));
        case 'round': return C(Math.round(a0.re));
        case 'fact': return C(factorialReal(a0.re));
        case 'gcd': return C(gcdInt(a0.re, a1.re));
        case 'lcm': return C(lcmInt(a0.re, a1.re));
        case 'npr': {
          const n = Math.round(a0.re);
          const r = Math.round(a1.re);
          if (n < 0 || r < 0 || r > n) throw new Error('Math ERROR: nPr domain');
          return C(factorialReal(n) / factorialReal(n - r));
        }
        case 'ncr': {
          const n = Math.round(a0.re);
          const r = Math.round(a1.re);
          if (n < 0 || r < 0 || r > n) throw new Error('Math ERROR: nCr domain');
          return C(factorialReal(n) / (factorialReal(r) * factorialReal(n - r)));
        }
        case 'pol': {
          const r = Math.hypot(a0.re, a1.re);
          const th = fromRadians(Math.atan2(a1.re, a0.re), env.angleUnit);
          env.vars.X = C(r);
          env.vars.Y = C(th);
          env.sideEffect = `r = ${formatRealScalar(r)}, θ = ${formatRealScalar(th)} (${env.angleUnit})`;
          return C(r);
        }
        case 'rec': {
          const rad = toRadians(a1.re, env.angleUnit);
          const x = a0.re * Math.cos(rad);
          const y = a0.re * Math.sin(rad);
          env.vars.X = C(x);
          env.vars.Y = C(y);
          env.sideEffect = `X = ${formatRealScalar(x)}, Y = ${formatRealScalar(y)}`;
          return C(x);
        }
        case 'ran': return C(Math.random());
        case 'ranint': {
          const min = Math.ceil(a0.re);
          const max = Math.floor(a1.re);
          return C(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        case 'arg': return C(fromRadians(cArg(a0), env.angleUnit));
        case 'conj': return C(a0.re, -a0.im);
        case 're': return C(a0.re);
        case 'im': return C(a0.im);
        default:
          throw new Error(`Unknown function: ${fn}`);
      }
    }
  }
}

function collectFreeVars(node: AstNode, set = new Set<string>()): Set<string> {
  if (node.kind === 'var') {
    const low = node.name.toLowerCase();
    if (!['pi', 'e', 'i', 'infinity', 'inf', 'ans', 'preans'].includes(low)) {
      set.add(node.name.toUpperCase());
    }
  } else if (node.kind === 'unary') {
    collectFreeVars(node.arg, set);
  } else if (node.kind === 'binary') {
    collectFreeVars(node.left, set);
    collectFreeVars(node.right, set);
  } else if (node.kind === 'call') {
    const skipFirst = ['deriv', 'd_dx', 'integrate', 'sum', 'prod'].includes(node.name.toLowerCase());
    node.args.forEach((arg, idx) => {
      if (!(skipFirst && idx === 0)) collectFreeVars(arg, set);
    });
  }
  return set;
}

function solveEquationReal(lhsNode: AstNode, rhsNode: AstNode, env: EvalEnv): number[] {
  const f = (x: number): number => {
    try {
      const localEnv: EvalEnv = { ...env, vars: { ...env.vars, X: C(x) } };
      const diff = cSub(evalAst(lhsNode, localEnv), evalAst(rhsNode, localEnv));
      return isRealVal(diff, 1e-6) ? diff.re : NaN;
    } catch {
      return NaN;
    }
  };

  const df = (x: number) => {
    const h = 1e-6 * Math.max(1, Math.abs(x));
    return (f(x + h) - f(x - h)) / (2 * h);
  };

  const roots: number[] = [];
  const pushRoot = (r: number) => {
    if (!Number.isFinite(r)) return;
    const val = f(r);
    if (!Number.isFinite(val) || Math.abs(val) > 1e-6) return;
    if (!roots.some((existing) => Math.abs(existing - r) < 1e-6)) {
      roots.push(Math.abs(r) < 1e-12 ? 0 : r);
    }
  };

  // Bisection + secant on multi-scale grid brackets
  const samples: number[] = [];
  for (let x = -200; x <= 200; x += x >= -20 && x <= 20 ? 0.5 : 5) samples.push(x);
  for (let k = -6; k <= 6; k += 0.25) if (!samples.includes(k)) samples.push(k);
  samples.sort((a, b) => a - b);

  for (let idx = 0; idx < samples.length - 1; idx++) {
    let a = samples[idx];
    let b = samples[idx + 1];
    let fa = f(a);
    let fb = f(b);
    if (Number.isFinite(fa) && Math.abs(fa) < 1e-11) pushRoot(a);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;
    if (fa * fb < 0) {
      for (let iter = 0; iter < 60; iter++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (!Number.isFinite(fm)) break;
        if (Math.abs(fm) < 1e-13 || Math.abs(b - a) < 1e-13) {
          pushRoot(m);
          break;
        }
        if (fa * fm <= 0) {
          b = m;
          fb = fm;
        } else {
          a = m;
          fa = fm;
        }
        if (iter === 59) pushRoot((a + b) / 2);
      }
    }
  }

  // Multi-start Newton fallback for tangent/even-multiplicity roots
  const seeds = [-100, -10, -2, -0.5, 0, 0.5, 1, 2, 5, 10, 50, 100];
  for (const seed of seeds) {
    let x = seed;
    for (let iter = 0; iter < 50; iter++) {
      const fx = f(x);
      if (!Number.isFinite(fx)) break;
      if (Math.abs(fx) < 1e-12) {
        pushRoot(x);
        break;
      }
      const slope = df(x);
      if (!Number.isFinite(slope) || Math.abs(slope) < 1e-14) break;
      const nextX = x - fx / slope;
      if (Math.abs(nextX - x) < 1e-13) {
        pushRoot(nextX);
        break;
      }
      x = nextX;
    }
  }

  return roots.sort((a, b) => a - b);
}

// ============================================================================
// SCIENTIFIC CALCULATOR COMPONENT
// ============================================================================
export default function ScientificCalculator() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyNavIdx, setHistoryNavIdx] = useState<number | null>(null);

  const [angleUnit, setAngleUnit] = useState<AngleUnit>('RAD');
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>('DECI');
  const [fracMode, setFracMode] = useState<'improper' | 'mixed'>('improper');
  const [dmsActive, setDmsActive] = useState(false);
  const [engStep, setEngStep] = useState(0);
  const [lcdTheme, setLcdTheme] = useState<LcdTheme>('mint');

  const [shiftActive, setShiftActive] = useState(false);
  const [alphaActive, setAlphaActive] = useState(false);
  const [hypActive, setHypActive] = useState(false);
  const [stoPending, setStoPending] = useState(false);
  const [rclOpen, setRclOpen] = useState(false);
  const [calcPromptVars, setCalcPromptVars] = useState<string[] | null>(null);

  const [ans, setAns] = useState<Complex>(C(0));
  const [preAns, setPreAns] = useState<Complex>(C(0));
  const [vars, setVars] = useState<Record<string, Complex>>({});

  const [lastValue, setLastValue] = useState<Complex | null>(null);
  const [primaryOutput, setPrimaryOutput] = useState('');
  const [secondaryOutput, setSecondaryOutput] = useState('');
  const [errorText, setErrorText] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [constOpen, setConstOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const [modeDrawer, setModeDrawer] = useState<'COMP' | 'EQN' | 'CMPLX' | 'TABLE'>('COMP');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const insertAtCursor = (snippet: string, cursorBackOffset = 0) => {
    const el = inputRef.current;
    if (!el) {
      setExpression((prev) => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? expression.length;
    const end = el.selectionEnd ?? expression.length;
    const next = expression.slice(0, start) + snippet + expression.slice(end);
    setExpression(next);
    setErrorText('');
    setDmsActive(false);
    setEngStep(0);
    setHistoryNavIdx(null);
    requestAnimationFrame(() => {
      el.focus();
      const targetPos = start + snippet.length - cursorBackOffset;
      el.setSelectionRange(targetPos, targetPos);
    });
  };

  const clearModifiers = () => {
    setShiftActive(false);
    setAlphaActive(false);
    setHypActive(false);
  };

  const formatCurrentOutput = (
    val: Complex,
    fmt: DisplayFormat = displayFormat,
    mixed: 'improper' | 'mixed' = fracMode,
    step: number = engStep,
    useDms: boolean = dmsActive
  ) => {
    if (useDms && isRealVal(val)) return formatDms(val.re);
    return formatComplexValue(val, fmt, mixed, step);
  };

  const evaluateOrSolve = (forceSolve = false, customVars?: Record<string, Complex>) => {
    const raw = expression.trim();
    if (!raw) return;

    const mergedVars = customVars ?? vars;
    const env: EvalEnv = {
      angleUnit,
      vars: { ...mergedVars },
      ans,
      preAns,
    };

    try {
      // Multi-statement separated by `:`
      const statements = raw.split(':').map((s) => s.trim()).filter(Boolean);
      const activeStmt = statements[statements.length - 1];

      // Evaluate earlier statements for side-effects / sequential calc
      for (let idx = 0; idx < statements.length - 1; idx++) {
        const astPrior = new Parser(tokenizeMath(statements[idx])).parse();
        env.ans = evalAst(astPrior, env);
      }

      if (activeStmt.includes('=') || forceSolve) {
        let lhsStr = activeStmt;
        let rhsStr = '0';
        if (activeStmt.includes('=')) {
          const parts = activeStmt.split('=');
          if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
            throw new Error('Syntax ERROR: Invalid equation');
          }
          lhsStr = parts[0];
          rhsStr = parts[1];
        }
        const lhsAst = new Parser(tokenizeMath(lhsStr)).parse();
        const rhsAst = new Parser(tokenizeMath(rhsStr)).parse();
        const roots = solveEquationReal(lhsAst, rhsAst, env);
        if (roots.length === 0) {
          throw new Error('No real solution found');
        }
        const rootText = roots.map((r) => `x = ${formatRealScalar(r)}`).join(' ,  ');
        const firstRoot = C(roots[0]);
        setPreAns(ans);
        setAns(firstRoot);
        setVars((prev) => ({ ...prev, ...env.vars, X: firstRoot }));
        setLastValue(firstRoot);
        setDmsActive(false);
        setEngStep(0);
        setPrimaryOutput(rootText);
        setSecondaryOutput(roots.length > 1 ? `${roots.length} real roots found (stored root₁ in X)` : 'Stored solution in X');
        setErrorText('');
        setHistory((prev) => [{ id: Date.now(), expr: raw, result: rootText }, ...prev].slice(0, 30));
        return;
      }

      const ast = new Parser(tokenizeMath(activeStmt)).parse();
      const val = evalAst(ast, env);
      const formatted = formatComplexValue(val, displayFormat, fracMode, 0);

      let sec = env.sideEffect || '';
      if (!sec && isRealVal(val)) {
        const approx = approximateFraction(val.re);
        if (approx && displayFormat !== 'FRAC') {
          sec = `Fraction: ${approx.num}/${approx.den}`;
        }
      }

      setPreAns(ans);
      setAns(val);
      setVars(env.vars);
      setLastValue(val);
      setDmsActive(false);
      setEngStep(0);
      setPrimaryOutput(formatted);
      setSecondaryOutput(sec);
      setErrorText('');
      setCalcPromptVars(null);
      setHistory((prev) => [{ id: Date.now(), expr: raw, result: formatted, secondary: sec }, ...prev].slice(0, 30));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Syntax ERROR';
      setErrorText(msg);
      setPrimaryOutput('');
      setSecondaryOutput('');
      setHistory((prev) => [{ id: Date.now(), expr: raw, result: msg, isError: true }, ...prev].slice(0, 30));
    }
  };

  const handleVariablePress = (varName: string, fallbackNormalSnippet?: string) => {
    if (stoPending) {
      const targetVal = lastValue ?? ans;
      setVars((prev) => ({ ...prev, [varName]: targetVal }));
      setStoPending(false);
      setSecondaryOutput(`Stored ${formatComplexValue(targetVal, displayFormat, fracMode, engStep)} → ${varName}`);
      clearModifiers();
      return;
    }
    if (rclOpen) {
      const stored = vars[varName] ?? C(0);
      setSecondaryOutput(`${varName} = ${formatComplexValue(stored, displayFormat, fracMode, engStep)}`);
      insertAtCursor(varName);
      setRclOpen(false);
      clearModifiers();
      return;
    }
    if (alphaActive) {
      insertAtCursor(varName);
      clearModifiers();
      return;
    }
    if (fallbackNormalSnippet !== undefined) {
      insertAtCursor(fallbackNormalSnippet);
      clearModifiers();
    }
  };

  const tableRows = useMemo(() => {
    if (modeDrawer !== 'TABLE' || !expression.trim()) return [];
    try {
      const clean = expression.includes('=') ? expression.split('=')[0] : expression;
      const ast = new Parser(tokenizeMath(clean)).parse();
      const rows: Array<{ x: number; y: string }> = [];
      for (let x = -5; x <= 5; x++) {
        const res = evalAst(ast, { angleUnit, vars: { ...vars, X: C(x) }, ans, preAns });
        rows.push({ x, y: formatComplexValue(res, 'DECI', 'improper', 0) });
      }
      return rows;
    } catch {
      return [];
    }
  }, [modeDrawer, expression, angleUnit, vars, ans, preAns]);

  const handleKeyPress = (action: 'shift' | 'alpha' | string) => {
    if (action === 'shift') {
      setShiftActive((s) => !s);
      setAlphaActive(false);
      return;
    }
    if (action === 'alpha') {
      setAlphaActive((a) => !a);
      setShiftActive(false);
      return;
    }

    // Check STO capture when clicking any variable-mapped key
    const alphaVarMap: Record<string, string> = {
      neg: 'A', dms: 'B', hyp: 'C', sin: 'D', cos: 'Z', tan: 'F',
      ln: 'T', rparen: 'X', sd: 'Y', mplus: 'M',
    };
    if (stoPending && alphaVarMap[action]) {
      handleVariablePress(alphaVarMap[action]);
      return;
    }
    if (rclOpen && alphaVarMap[action]) {
      handleVariablePress(alphaVarMap[action]);
      return;
    }

    const s = shiftActive;
    const a = alphaActive;

    switch (action) {
      case 'calc':
        clearModifiers();
        if (s) {
          evaluateOrSolve(true);
        } else if (a) {
          insertAtCursor(' = ');
        } else {
          try {
            const ast = new Parser(tokenizeMath(expression || '0')).parse();
            const free = Array.from(collectFreeVars(ast));
            if (free.length > 0) {
              setCalcPromptVars((prev) => (prev ? null : free));
            } else {
              evaluateOrSolve(false);
            }
          } catch {
            evaluateOrSolve(false);
          }
        }
        break;

      case 'integ':
        clearModifiers();
        if (s) insertAtCursor('deriv(, 1)', 4);
        else if (a) insertAtCursor(' : ');
        else insertAtCursor('integrate(, 0, 1)', 7);
        break;

      case 'inv':
        clearModifiers();
        if (s) insertAtCursor('!');
        else insertAtCursor('⁻¹');
        break;

      case 'logbase':
        clearModifiers();
        if (s) insertAtCursor('sum(x, 1, 5)', 7);
        else if (a) insertAtCursor('prod(x, 1, 5)', 7);
        else insertAtCursor('log(2, )', 1);
        break;

      case 'frac':
        clearModifiers();
        if (s) {
          const nextMode = fracMode === 'improper' ? 'mixed' : 'improper';
          setFracMode(nextMode);
          setDisplayFormat('FRAC');
          if (lastValue) setPrimaryOutput(formatCurrentOutput(lastValue, 'FRAC', nextMode, engStep, false));
        } else if (a) {
          insertAtCursor('÷R');
        } else {
          insertAtCursor('()/()', 4);
        }
        break;

      case 'sqrt':
        clearModifiers();
        if (s) insertAtCursor('³√(', 0);
        else if (a) insertAtCursor('()', 1);
        else insertAtCursor('√(', 0);
        break;

      case 'sq':
        clearModifiers();
        if (s) insertAtCursor('³');
        else if (a) insertAtCursor(' mod ');
        else insertAtCursor('²');
        break;

      case 'pow':
        clearModifiers();
        if (s) insertAtCursor('nthRoot(2, )', 1);
        else if (a) insertAtCursor('cot(', 0);
        else insertAtCursor('^');
        break;

      case 'log10':
        clearModifiers();
        if (s) insertAtCursor('10^(', 0);
        else if (a) insertAtCursor('cot⁻¹(', 0);
        else insertAtCursor('log(', 0);
        break;

      case 'ln':
        if (a) { handleVariablePress('T'); break; }
        clearModifiers();
        if (s) insertAtCursor('exp(', 0);
        else insertAtCursor('ln(', 0);
        break;

      case 'neg':
        if (a) { handleVariablePress('A'); break; }
        clearModifiers();
        if (s) insertAtCursor('∠');
        else insertAtCursor('-');
        break;

      case 'dms':
        if (a) { handleVariablePress('B'); break; }
        clearModifiers();
        if (s) {
          if (lastValue && isRealVal(lastValue)) {
            const pFact = primeFactorizationString(Math.round(lastValue.re));
            if (pFact && Math.abs(lastValue.re - Math.round(lastValue.re)) < 1e-12) {
              setSecondaryOutput(`FACT: ${pFact}`);
            } else {
              setSecondaryOutput('FACT requires integer ≥ 2');
            }
          }
        } else if (lastValue && isRealVal(lastValue) && primaryOutput && !expression.includes('°')) {
          const nextDms = !dmsActive;
          setDmsActive(nextDms);
          setPrimaryOutput(formatCurrentOutput(lastValue, displayFormat, fracMode, engStep, nextDms));
        } else {
          insertAtCursor('°');
        }
        break;

      case 'hyp':
        if (a) { handleVariablePress('C'); clearModifiers(); break; }
        if (s) {
          clearModifiers();
          insertAtCursor('abs(', 0);
        } else {
          setHypActive((h) => !h);
        }
        break;

      case 'sin':
        if (a) { handleVariablePress('D'); break; }
        clearModifiers();
        if (hypActive) insertAtCursor(s ? 'asinh(' : 'sinh(');
        else insertAtCursor(s ? 'sin⁻¹(' : 'sin(');
        break;

      case 'cos':
        if (a) { handleVariablePress('Z'); break; }
        clearModifiers();
        if (hypActive) insertAtCursor(s ? 'acosh(' : 'cosh(');
        else insertAtCursor(s ? 'cos⁻¹(' : 'cos(');
        break;

      case 'tan':
        if (a) { handleVariablePress('F'); break; }
        clearModifiers();
        if (hypActive) insertAtCursor(s ? 'atanh(' : 'tanh(');
        else insertAtCursor(s ? 'tan⁻¹(' : 'tan(');
        break;

      case 'rcl':
        clearModifiers();
        if (s) {
          setStoPending((v) => !v);
          setRclOpen(false);
          setSecondaryOutput('STO: tap A–Z or M key to store value');
        } else {
          setRclOpen((v) => !v);
          setStoPending(false);
        }
        break;

      case 'eng':
        clearModifiers();
        if (s || a) {
          insertAtCursor('i');
        } else if (lastValue && isRealVal(lastValue)) {
          const nextStep = displayFormat === 'ENG' ? (engStep >= 2 ? -2 : engStep + 1) : 0;
          setDisplayFormat('ENG');
          setEngStep(nextStep);
          setDmsActive(false);
          setPrimaryOutput(formatCurrentOutput(lastValue, 'ENG', fracMode, nextStep, false));
        } else {
          setDisplayFormat((f) => (f === 'ENG' ? 'DECI' : 'ENG'));
        }
        break;

      case 'lparen':
        clearModifiers();
        insertAtCursor(s ? '%' : '(');
        break;

      case 'rparen':
        if (a) { handleVariablePress('X'); break; }
        clearModifiers();
        insertAtCursor(s ? ', ' : ')');
        break;

      case 'sd':
        if (a) { handleVariablePress('Y'); break; }
        clearModifiers();
        setDmsActive(false);
        if (s) {
          const nextMix = fracMode === 'improper' ? 'mixed' : 'improper';
          setFracMode(nextMix);
          setDisplayFormat('FRAC');
          if (lastValue) setPrimaryOutput(formatCurrentOutput(lastValue, 'FRAC', nextMix, engStep, false));
        } else {
          const nextFmt: DisplayFormat = displayFormat === 'FRAC' ? 'DECI' : 'FRAC';
          setDisplayFormat(nextFmt);
          if (lastValue) {
            const nextText = formatCurrentOutput(lastValue, nextFmt, fracMode, engStep, false);
            setPrimaryOutput(nextText);
            if (nextFmt === 'FRAC' && isRealVal(lastValue) && !approximateFraction(lastValue.re)) {
              setSecondaryOutput('No simple exact p/q fraction (shown as decimal)');
            }
          }
        }
        break;

      case 'mplus':
        if (a) { handleVariablePress('M'); break; }
        clearModifiers();
        {
          let delta = lastValue ?? ans;
          if (expression.trim()) {
            try {
              const ast = new Parser(tokenizeMath(expression)).parse();
              delta = evalAst(ast, { angleUnit, vars, ans, preAns });
            } catch {
              // keep lastValue/ans
            }
          }
          const prevM = vars.M ?? C(0);
          const nextM = s ? cSub(prevM, delta) : cAdd(prevM, delta);
          setVars((prev) => ({ ...prev, M: nextM }));
          setLastValue(delta);
          setPrimaryOutput(formatComplexValue(delta, displayFormat, fracMode, engStep));
          setSecondaryOutput(`M = ${formatComplexValue(nextM, displayFormat, fracMode, engStep)}`);
        }
        break;

      case '7':
        clearModifiers();
        if (s) setConstOpen((o) => !o);
        else insertAtCursor('7');
        break;
      case '8':
        clearModifiers();
        if (s) setConvOpen((o) => !o);
        else insertAtCursor('8');
        break;
      case '9':
        clearModifiers();
        if (a) insertAtCursor('∞');
        else if (s) {
          setVars({});
          setAns(C(0));
          setPreAns(C(0));
          setSecondaryOutput('CLR: Memory & variables reset');
        } else insertAtCursor('9');
        break;

      case 'del':
        clearModifiers();
        if (a) {
          setVars({});
          setSecondaryOutput('CLRv: Cleared variables A–Z & M');
          break;
        }
        {
          const el = inputRef.current;
          if (!el) {
            setExpression((prev) => prev.slice(0, -1));
            break;
          }
          const start = el.selectionStart ?? expression.length;
          const end = el.selectionEnd ?? expression.length;
          if (start !== end) {
            setExpression(expression.slice(0, start) + expression.slice(end));
            requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start, start); });
          } else if (start > 0) {
            setExpression(expression.slice(0, start - 1) + expression.slice(start));
            requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start - 1, start - 1); });
          }
        }
        break;

      case 'ac':
        clearModifiers();
        setStoPending(false);
        setRclOpen(false);
        setExpression('');
        setPrimaryOutput('');
        setSecondaryOutput('');
        setErrorText('');
        setCalcPromptVars(null);
        setDmsActive(false);
        setEngStep(0);
        inputRef.current?.focus();
        break;

      case '4':
        clearModifiers();
        insertAtCursor('4');
        break;
      case '5':
        clearModifiers();
        insertAtCursor('5');
        break;
      case '6':
        clearModifiers();
        insertAtCursor('6');
        break;

      case 'mul':
        clearModifiers();
        if (s) insertAtCursor('nPr(5, 2)', 5);
        else if (a) insertAtCursor('gcd(12, 18)', 7);
        else insertAtCursor('×');
        break;
      case 'div':
        clearModifiers();
        if (s) insertAtCursor('nCr(5, 2)', 5);
        else if (a) insertAtCursor('lcm(12, 18)', 7);
        else insertAtCursor('÷');
        break;

      case '1':
        clearModifiers();
        insertAtCursor('1');
        break;
      case '2':
        clearModifiers();
        if (s) insertAtCursor(' + i');
        else insertAtCursor('2');
        break;
      case '3':
        clearModifiers();
        insertAtCursor('3');
        break;

      case 'plus':
        clearModifiers();
        if (s) insertAtCursor('Pol(3, 4)', 5);
        else if (a) insertAtCursor('ceil(', 0);
        else insertAtCursor('+');
        break;

      case 'minus':
        clearModifiers();
        if (s) insertAtCursor('Rec(5, 30)', 6);
        else if (a) insertAtCursor('intg(', 0);
        else insertAtCursor('−');
        break;

      case '0':
        clearModifiers();
        insertAtCursor('0');
        break;

      case 'dot':
        clearModifiers();
        if (s) insertAtCursor('Ran#');
        else if (a) insertAtCursor('ranInt(1, 10)');
        else insertAtCursor('.');
        break;

      case 'exp10':
        clearModifiers();
        if (s) insertAtCursor('π');
        else if (a) insertAtCursor('e');
        else insertAtCursor('×10^');
        break;

      case 'ans':
        clearModifiers();
        insertAtCursor(s || a ? 'PreAns' : 'Ans');
        break;

      case 'eq':
        clearModifiers();
        evaluateOrSolve(false);
        break;
    }
  };

  const dpadMove = (dir: 'up' | 'down' | 'left' | 'right' | 'center') => {
    const el = inputRef.current;
    if (dir === 'left' && el) {
      const p = Math.max(0, (el.selectionStart ?? expression.length) - 1);
      el.focus();
      el.setSelectionRange(p, p);
      return;
    }
    if (dir === 'right' && el) {
      const p = Math.min(expression.length, (el.selectionStart ?? expression.length) + 1);
      el.focus();
      el.setSelectionRange(p, p);
      return;
    }
    if (dir === 'up') {
      if (history.length === 0) return;
      const nextIdx = historyNavIdx === null ? 0 : Math.min(history.length - 1, historyNavIdx + 1);
      setHistoryNavIdx(nextIdx);
      setExpression(history[nextIdx].expr);
      return;
    }
    if (dir === 'down') {
      if (historyNavIdx === null) return;
      if (historyNavIdx <= 0) {
        setHistoryNavIdx(null);
        setExpression('');
      } else {
        const nextIdx = historyNavIdx - 1;
        setHistoryNavIdx(nextIdx);
        setExpression(history[nextIdx].expr);
      }
      return;
    }
    if (dir === 'center') evaluateOrSolve(false);
  };

  const lcdClass =
    lcdTheme === 'dark'
      ? 'bg-[#08171c] text-[#dff9ff] border-[#155e75]'
      : lcdTheme === 'paper'
      ? 'bg-[#f8fafc] text-slate-900 border-slate-300'
      : 'bg-[#d7e4e0] text-[#111827] border-[#99ada8]';

  const hasMemory = vars.M && (Math.abs(vars.M.re) > 1e-14 || Math.abs(vars.M.im) > 1e-14);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Main Scientific Calculator Chassis (mathda.com Casio fx-style) */}
      <div className="w-full max-w-[392px] rounded-2xl bg-[#222326] border-2 border-[#121316] shadow-[0_18px_45px_rgba(2,6,23,0.45)] p-3 text-white select-none">
        {/* LCD DISPLAY */}
        <div className={`relative rounded-xl border ${lcdClass} min-h-[198px] flex flex-col justify-between p-2.5 shadow-inner transition-colors`}>
          {/* Top editable math input + ⋮ menu */}
          <div className="flex items-start gap-1">
            <input
              ref={inputRef}
              type="text"
              value={expression}
              onChange={(e) => {
                setExpression(e.target.value);
                setErrorText('');
                setHistoryNavIdx(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  evaluateOrSolve(false);
                }
              }}
              placeholder="Enter math: x² - 3x + 1 = 0, log(100) - √2 + cos(...)"
              aria-label="Calculator expression input"
              className="w-full bg-transparent text-[13.5px] font-mono font-medium focus:outline-none placeholder:text-slate-500/75"
            />
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                title="Calculator samples & actions"
                className="p-0.5 rounded hover:bg-black/10 transition-colors"
              >
                <MoreVertical className="w-4 h-4 opacity-70" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-64 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 shadow-xl p-2 z-30 text-xs space-y-1">
                  <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Sample Expressions</p>
                  {SAMPLE_EXPRESSIONS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setExpression(sample);
                        setMenuOpen(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 font-mono truncate"
                    >
                      {sample}
                    </button>
                  ))}
                  <div className="border-t border-slate-800 pt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (primaryOutput) navigator.clipboard?.writeText(primaryOutput);
                        setMenuOpen(false);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      <Copy className="w-3 h-3" /> Copy Result
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistory([]);
                        setMenuOpen(false);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/60"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Tape
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Calculation Tape + Popover Drawers inside LCD */}
          <div className="my-1.5 flex-1 max-h-[82px] overflow-y-auto space-y-1 text-[11px] font-mono pr-1 select-text">
            {history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={() => setExpression(item.expr)}
                title="Click to load expression"
                className="flex items-baseline justify-between gap-2 px-1 py-0.5 rounded hover:bg-black/5 cursor-pointer"
              >
                <span className="truncate opacity-70">{item.expr}</span>
                <span className={`shrink-0 font-bold ${item.isError ? 'text-rose-600' : ''}`}>{item.result}</span>
              </div>
            ))}
          </div>

          {/* Primary & Secondary LCD Readout */}
          <div className="border-t border-black/10 pt-1 text-right select-text">
            {secondaryOutput && !errorText && (
              <div className="text-[10.5px] font-mono opacity-75 truncate">{secondaryOutput}</div>
            )}
            {errorText ? (
              <div className="text-sm font-mono font-bold text-rose-700 dark:text-rose-400 truncate">{errorText}</div>
            ) : (
              <div className="text-xl font-mono font-bold tracking-tight min-h-[28px] break-all">
                {primaryOutput || (expression ? '' : '0')}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Overlay Drawers for CALC vars / RCL / CONST / CONV / MODE / SETTINGS / HELP */}
        {calcPromptVars && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-cyan-500/40 p-2 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-cyan-300">
              <span>CALC — Set variable values</span>
              <button type="button" onClick={() => setCalcPromptVars(null)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {calcPromptVars.map((vName) => (
                <label key={vName} className="flex items-center gap-1 bg-[#1e2024] px-1.5 py-1 rounded">
                  <span className="font-bold text-pink-300">{vName}=</span>
                  <input
                    type="text"
                    defaultValue={vars[vName]?.re ?? 0}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) {
                        setVars((prev) => ({ ...prev, [vName]: C(n) }));
                      }
                    }}
                    className="w-full bg-transparent text-white focus:outline-none font-mono"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => evaluateOrSolve(false, vars)}
              className="w-full py-1 rounded bg-cyan-600 hover:bg-cyan-500 font-bold text-white"
            >
              Evaluate at variables
            </button>
          </div>
        )}

        {(stoPending || rclOpen) && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-amber-400/40 p-2 text-[11px]">
            <div className="flex items-center justify-between mb-1.5 font-semibold text-amber-300">
              <span>{stoPending ? 'STO — Pick register to store Answer' : 'RCL — Pick register to recall'}</span>
              <button type="button" onClick={() => { setStoPending(false); setRclOpen(false); }} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {VARS_LIST.map((vName) => (
                <button
                  key={vName}
                  type="button"
                  onClick={() => handleVariablePress(vName)}
                  className="px-1.5 py-1 rounded bg-[#3b3e46] hover:bg-slate-600 font-mono text-left"
                >
                  <span className="text-pink-300 font-bold">{vName}</span>
                  <span className="block text-[9px] text-slate-300 truncate">
                    {vars[vName] ? formatRealScalar(vars[vName].re) : '0'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {constOpen && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-amber-400/40 p-2 text-[11px] max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between mb-1 font-semibold text-amber-300">
              <span>CONST — Physical Constants</span>
              <button type="button" onClick={() => setConstOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {PHYSICAL_CONSTANTS.map((c) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => {
                    insertAtCursor(String(c.value));
                    setSecondaryOutput(`${c.name} (${c.symbol}) = ${c.value} ${c.unit}`);
                    setConstOpen(false);
                  }}
                  className="text-left px-2 py-1 rounded bg-[#383b42] hover:bg-slate-600 truncate"
                >
                  <strong className="text-amber-200">{c.symbol}</strong> · {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {convOpen && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-amber-400/40 p-2 text-[11px]">
            <div className="flex items-center justify-between mb-1 font-semibold text-amber-300">
              <span>CONV — Convert Last Answer / Input</span>
              <button type="button" onClick={() => setConvOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_CONVERSIONS.map((cv) => (
                <button
                  key={cv.label}
                  type="button"
                  onClick={() => {
                    const src = lastValue?.re ?? (Number(expression) || 0);
                    const out = cv.fn ? cv.fn(src) : src * (cv.factor ?? 1);
                    const val = C(out);
                    setLastValue(val);
                    setAns(val);
                    setPrimaryOutput(`${formatRealScalar(out)} ${cv.suffix}`);
                    setSecondaryOutput(`${src} (${cv.label})`);
                    setConvOpen(false);
                  }}
                  className="text-left px-2 py-1 rounded bg-[#383b42] hover:bg-slate-600"
                >
                  {cv.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {modeMenuOpen && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-cyan-500/40 p-2 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-cyan-300">
              <span>MODE</span>
              <button type="button" onClick={() => setModeMenuOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['COMP', 'EQN', 'CMPLX', 'TABLE'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setModeDrawer(m);
                    setModeMenuOpen(false);
                    if (m === 'EQN' && !expression.includes('=')) {
                      setExpression('x² - 3x + 1 = 0');
                    }
                  }}
                  className={`py-1 rounded font-bold ${modeDrawer === m ? 'bg-cyan-600 text-white' : 'bg-[#383b42] hover:bg-slate-600'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {modeDrawer === 'TABLE' && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-slate-600 p-2 text-[11px] max-h-32 overflow-y-auto font-mono">
            <div className="flex justify-between text-cyan-300 font-semibold mb-1">
              <span>TABLE f(x) [-5 .. 5]</span>
              <button type="button" onClick={() => setModeDrawer('COMP')} className="text-slate-400 hover:text-white">Close</button>
            </div>
            {tableRows.length === 0 ? (
              <p className="text-slate-400">Type an expression in x (e.g. x^2 - 3x + 1) to tabulate.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {tableRows.map((row) => (
                  <div key={row.x} className="bg-[#1e2024] px-1.5 py-0.5 rounded flex justify-between">
                    <span className="text-slate-400">{row.x}:</span>
                    <span>{row.y}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {settingsOpen && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-slate-600 p-2 text-[11px] space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-200">
              <span>SETUP / Angle & Display</span>
              <button type="button" onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <div className="flex gap-1">
              {(['RAD', 'DEG', 'GRAD'] as AngleUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setAngleUnit(u)}
                  className={`flex-1 py-1 rounded font-bold ${angleUnit === u ? 'bg-indigo-600 text-white' : 'bg-[#383b42]'}`}
                >
                  {u}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['DECI', 'FRAC', 'ENG', 'SCI'] as DisplayFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setDisplayFormat(f);
                    if (lastValue) setPrimaryOutput(formatCurrentOutput(lastValue, f, fracMode, engStep, false));
                  }}
                  className={`flex-1 py-1 rounded font-bold ${displayFormat === f ? 'bg-cyan-600 text-white' : 'bg-[#383b42]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {helpOpen && (
          <div className="mt-2 rounded-lg bg-[#2d3036] border border-slate-600 p-2.5 text-[11px] text-slate-200 space-y-1">
            <div className="flex justify-between font-bold text-cyan-300">
              <span>Quick Guide</span>
              <button type="button" onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <p>• Equations: <code className="text-amber-300">x^2 - 3x + 1 = 0</code> then press <strong>=</strong> or <strong>SHIFT CALC (SOLVE)</strong>.</p>
            <p>• Calculus: <code className="text-amber-300">integrate(x^2, 0, 3)</code>, <code className="text-amber-300">deriv(x^3, 2)</code>.</p>
            <p>• Complex & Polar: <code className="text-amber-300">(3+4i)/(1-i)</code>, <code className="text-amber-300">Pol(3, 4)</code>, <code className="text-amber-300">5∠53.13</code>.</p>
            <p>• Toggle decimal ⇔ fraction with <strong>S⇔D</strong>; step powers of 10³ with <strong>ENG</strong>.</p>
          </div>
        )}

        {/* LCD STATUS STRIP */}
        <div className="mt-2 mb-2.5 flex items-center justify-between gap-1 px-0.5 text-[10.5px] font-bold">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setAngleUnit((u) => (u === 'RAD' ? 'DEG' : u === 'DEG' ? 'GRAD' : 'RAD'))}
              title="Click to cycle angle unit (RAD / DEG / GRAD)"
              className="px-2 py-0.5 rounded bg-[#3a3d43] hover:bg-[#494c54] text-white tracking-wide"
            >
              {angleUnit}
            </button>
            <button
              type="button"
              onClick={() => {
                const order: DisplayFormat[] = ['DECI', 'FRAC', 'ENG', 'SCI'];
                const nextFmt = order[(order.indexOf(displayFormat) + 1) % order.length];
                setDisplayFormat(nextFmt);
                setDmsActive(false);
                if (lastValue) setPrimaryOutput(formatCurrentOutput(lastValue, nextFmt, fracMode, engStep, false));
              }}
              title="Click to cycle display format (DECI / FRAC / ENG / SCI)"
              className="px-2 py-0.5 rounded bg-[#3a3d43] hover:bg-[#494c54] text-white tracking-wide"
            >
              {displayFormat}
            </button>
            <span className="px-1.5 py-0.5 text-slate-200">{modeDrawer === 'COMP' ? 'NORM' : modeDrawer}</span>
            {shiftActive && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">S</span>}
            {alphaActive && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40">A</span>}
            {hypActive && <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">HYP</span>}
            {stoPending && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">STO</span>}
            {hasMemory && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">M</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              title="Calculator help"
              className="p-1 rounded-full hover:bg-white/10 text-slate-300"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLcdTheme((t) => (t === 'mint' ? 'dark' : t === 'dark' ? 'paper' : 'mint'))}
              title="Switch LCD display color theme"
              className="p-1 rounded-full hover:bg-white/10 text-slate-300"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOP CONTROL ROW: SHIFT / ALPHA + OVAL D-PAD + MODE / SETUP */}
        <div className="grid grid-cols-6 gap-1.5 items-center mb-2">
          <div className="col-span-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleKeyPress('shift')}
              className={`h-8 rounded-md text-[11px] font-bold tracking-wide shadow transition-colors ${
                shiftActive ? 'bg-amber-500 text-slate-950' : 'bg-[#46484f] hover:bg-[#52555e] text-[#f5b041]'
              }`}
            >
              SHIFT
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('alpha')}
              className={`h-8 rounded-md text-[11px] font-bold tracking-wide shadow transition-colors ${
                alphaActive ? 'bg-rose-500 text-white' : 'bg-[#46484f] hover:bg-[#52555e] text-[#f87171]'
              }`}
            >
              ALPHA
            </button>
            <CalcSciButton
              shift="SOLVE"
              alpha="="
              label="CALC"
              onClick={() => handleKeyPress('calc')}
            />
            <CalcSciButton
              shift="d/dx"
              alpha=":"
              label="∫□"
              onClick={() => handleKeyPress('integ')}
            />
          </div>

          {/* 4-Way Oval D-Pad */}
          <div className="col-span-2 flex justify-center">
            <div className="w-full max-w-[114px] h-[72px] rounded-[28px] bg-[#42454c] border border-[#2f3238] shadow-inner relative grid grid-cols-3 grid-rows-3 place-items-center p-1">
              <div />
              <button type="button" onClick={() => dpadMove('up')} aria-label="History up" className="w-full h-full flex items-center justify-center rounded hover:bg-white/10">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div />
              <button type="button" onClick={() => dpadMove('left')} aria-label="Cursor left" className="w-full h-full flex items-center justify-center rounded hover:bg-white/10">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => dpadMove('center')} aria-label="Execute" className="w-5 h-5 rounded-full bg-[#35373d] hover:bg-cyan-600/60 border border-white/10" />
              <button type="button" onClick={() => dpadMove('right')} aria-label="Cursor right" className="w-full h-full flex items-center justify-center rounded hover:bg-white/10">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div />
              <button type="button" onClick={() => dpadMove('down')} aria-label="History down" className="w-full h-full flex items-center justify-center rounded hover:bg-white/10">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setModeMenuOpen((m) => !m)}
              className="h-8 rounded-md bg-[#46484f] hover:bg-[#52555e] text-white text-[11px] font-bold shadow"
            >
              MODE
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              title="Angle unit & output settings"
              className="h-8 rounded-md bg-[#46484f] hover:bg-[#52555e] text-white flex items-center justify-center shadow"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <CalcSciButton shift="x!" label="x⁻¹" onClick={() => handleKeyPress('inv')} />
            <CalcSciButton shift="∑" alpha="∏" label="log_□" onClick={() => handleKeyPress('logbase')} />
          </div>
        </div>

        {/* SCIENTIFIC FUNCTION ROWS (Rows 2-5 matching screenshot) */}
        <div className="grid grid-cols-6 gap-x-1.5 gap-y-1.5 mb-2.5">
          <CalcSciButton shift="a b/c" alpha="÷R" label="□/□" onClick={() => handleKeyPress('frac')} />
          <CalcSciButton shift="³√" alpha="(□)" label="√□" onClick={() => handleKeyPress('sqrt')} />
          <CalcSciButton shift="x³" alpha="mod" label="x²" onClick={() => handleKeyPress('sq')} />
          <CalcSciButton shift="ⁿ√" alpha="cot" label="x^□" onClick={() => handleKeyPress('pow')} />
          <CalcSciButton shift="10^□" alpha="cot⁻¹" label="log" onClick={() => handleKeyPress('log10')} />
          <CalcSciButton shift="e^□" alpha="T" label="ln" onClick={() => handleKeyPress('ln')} />

          <CalcSciButton shift="∠" alpha="A" label="(−)" onClick={() => handleKeyPress('neg')} />
          <CalcSciButton shift="FACT" alpha="B" label="° ' ”" onClick={() => handleKeyPress('dms')} />
          <CalcSciButton shift="Abs" alpha="C" label="hyp" onClick={() => handleKeyPress('hyp')} active={hypActive} />
          <CalcSciButton shift="sin⁻¹" alpha="D" label="sin" onClick={() => handleKeyPress('sin')} />
          <CalcSciButton shift="cos⁻¹" alpha="Z" label="cos" onClick={() => handleKeyPress('cos')} />
          <CalcSciButton shift="tan⁻¹" alpha="F" label="tan" onClick={() => handleKeyPress('tan')} />

          <CalcSciButton shift="STO" label="RCL" onClick={() => handleKeyPress('rcl')} active={stoPending || rclOpen} />
          <CalcSciButton shift="i" alpha="i" label="ENG" onClick={() => handleKeyPress('eng')} />
          <CalcSciButton shift="%" label="(" onClick={() => handleKeyPress('lparen')} />
          <CalcSciButton shift="," alpha="X" label=")" onClick={() => handleKeyPress('rparen')} />
          <CalcSciButton shift="a b/c⇔d/c" alpha="Y" label="S⇔D" onClick={() => handleKeyPress('sd')} />
          <CalcSciButton shift="M−" alpha="M" label="M+" onClick={() => handleKeyPress('mplus')} />
        </div>

        {/* MAIN NUMERIC & OPERATOR KEYPAD (5 columns x 4 rows matching screenshot) */}
        <div className="grid grid-cols-5 gap-x-1.5 gap-y-2">
          <CalcNumButton shift="CONST" label="7" onClick={() => handleKeyPress('7')} />
          <CalcNumButton shift="CONV" label="8" onClick={() => handleKeyPress('8')} />
          <CalcNumButton shift="CLR" alpha="∞" label="9" onClick={() => handleKeyPress('9')} />
          <CalcNumButton shift="INS" alpha="CLRv" label="DEL" variant="green" onClick={() => handleKeyPress('del')} />
          <CalcNumButton label="AC" variant="green" onClick={() => handleKeyPress('ac')} />

          <CalcNumButton shift="MTRIX" label="4" onClick={() => handleKeyPress('4')} />
          <CalcNumButton label="5" onClick={() => handleKeyPress('5')} />
          <CalcNumButton label="6" onClick={() => handleKeyPress('6')} />
          <CalcNumButton shift="nPr" alpha="GCD" label="×" onClick={() => handleKeyPress('mul')} />
          <CalcNumButton shift="nCr" alpha="LCM" label="÷" onClick={() => handleKeyPress('div')} />

          <CalcNumButton label="1" onClick={() => handleKeyPress('1')} />
          <CalcNumButton shift="CMPLX" label="2" onClick={() => handleKeyPress('2')} />
          <CalcNumButton label="3" onClick={() => handleKeyPress('3')} />
          <CalcNumButton shift="Pol" alpha="Ceil" label="+" onClick={() => handleKeyPress('plus')} />
          <CalcNumButton shift="Rec" alpha="Intg" label="−" onClick={() => handleKeyPress('minus')} />

          <CalcNumButton label="0" onClick={() => handleKeyPress('0')} />
          <CalcNumButton shift="Ran#" alpha="RanInt" label="•" onClick={() => handleKeyPress('dot')} />
          <CalcNumButton shift="π" alpha="e" label="×10ˣ" smallLabel onClick={() => handleKeyPress('exp10')} />
          <CalcNumButton shift="PreAns" alpha="PreAns" label="Ans" smallLabel onClick={() => handleKeyPress('ans')} />
          <CalcNumButton label="=" onClick={() => handleKeyPress('eq')} />
        </div>
      </div>
    </div>
  );
}

function CalcSciButton({
  label,
  shift,
  alpha,
  onClick,
  active = false,
}: {
  label: string;
  shift?: string;
  alpha?: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-end px-0.5 min-h-[13px] text-[9px] font-bold leading-none mb-0.5">
        <span className="text-[#f5b041] truncate">{shift || ''}</span>
        <span className="text-[#f87171] truncate">{alpha || ''}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`h-8 rounded-md text-[12px] font-semibold shadow-xs transition-colors ${
          active
            ? 'bg-cyan-600 text-white ring-1 ring-cyan-300'
            : 'bg-[#383a41] hover:bg-[#494c55] active:bg-[#2d2f35] text-white'
        }`}
      >
        {label}
      </button>
    </div>
  );
}

function CalcNumButton({
  label,
  shift,
  alpha,
  onClick,
  variant = 'dark',
  smallLabel = false,
}: {
  label: string;
  shift?: string;
  alpha?: string;
  onClick: () => void;
  variant?: 'dark' | 'green';
  smallLabel?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-end px-0.5 min-h-[13px] text-[9px] font-bold leading-none mb-0.5">
        <span className="text-[#f5b041] truncate">{shift || ''}</span>
        <span className="text-[#f87171] truncate">{alpha || ''}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`h-10 rounded-lg font-bold shadow transition-colors ${
          smallLabel ? 'text-[13px]' : 'text-[17px]'
        } ${
          variant === 'green'
            ? 'bg-[#93b94a] hover:bg-[#a3ca58] active:bg-[#7fa13c] text-slate-950'
            : 'bg-[#4d5058] hover:bg-[#5c6069] active:bg-[#3f4148] text-white'
        }`}
      >
        {label}
      </button>
    </div>
  );
}
