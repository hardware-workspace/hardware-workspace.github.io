import { useSharedWorkspace } from './sharedWorkspace';
import AccountSettings from './AccountSettings';
import Dashboard from './Dashboard';
import EmailPreferences from './EmailPreferences';
import { realAccount } from './taskEmails';
import { supabase } from './supabaseClient';
import { escapeCsvCell } from './security';
import { addTaskDays, snapToTaskWorkingDay, taskDaysBetween, taskHoursOnDate, STANDARD_DAY_HOURS } from './taskSchedule';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  LayoutGrid,
  Users,
  Settings,
  Bell,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Moon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Trash2,
  Shield,
  FileSpreadsheet,
  RefreshCw,
  Undo2,
  HelpCircle,
  Check,
  ArrowUpDown,
  Mail,
  Activity,
  Layers,
  Eye,
  EyeOff,
  Archive,
  Sparkles,
  UserCheck,
  Scissors,
  FolderPlus,
  Flame,
  Gauge,
  Link2,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  GitBranch,
  Maximize2,
  Minimize2
} from 'lucide-react';

// ============================================================================
// CONSTANTS & CAIRO TIMEZONE UTILITIES (Friday & Saturday = Weekend Days Off)
// ============================================================================
const TODAY_CAIRO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const DAILY_PERSON_MAX_WEIGHT = 10;

const SEED_USERS = [
  {
    id: 'u-mohamed',
    name: 'Mohamed',
    email: 'mohamed@company.com',
    role: 'manager',
    is_active: true,
    color: 'bg-indigo-600',
    initials: 'MO',
    notification_prefs: {
      email_task_assigned: true,
      email_due_reminder: true,
      email_overdue: true,
      email_blocked: true,
      email_done: true,
      email_comment: true,
      email_weekly_summary: true,
    },
  },
  {
    id: 'u-abdo',
    name: 'Abdo',
    email: 'abdo@company.com',
    role: 'member',
    is_active: true,
    color: 'bg-emerald-600',
    initials: 'AB',
    notification_prefs: {
      email_task_assigned: true,
      email_due_reminder: true,
      email_overdue: true,
      email_blocked: true,
      email_done: true,
      email_comment: true,
      email_weekly_summary: true,
    },
  },
  {
    id: 'u-hussein',
    name: 'Hussein',
    email: 'hussein@company.com',
    role: 'member',
    is_active: true,
    color: 'bg-sky-600',
    initials: 'HU',
    notification_prefs: {
      email_task_assigned: true,
      email_due_reminder: true,
      email_overdue: true,
      email_blocked: true,
      email_done: true,
      email_comment: true,
      email_weekly_summary: true,
    },
  },
  {
    id: 'u-ramy',
    name: 'Ramy',
    email: 'ramy@company.com',
    role: 'member',
    is_active: true,
    color: 'bg-amber-600',
    initials: 'RA',
    notification_prefs: {
      email_task_assigned: true,
      email_due_reminder: true,
      email_overdue: true,
      email_blocked: true,
      email_done: true,
      email_comment: true,
      email_weekly_summary: true,
    },
  },
  {
    id: 'u-hazem',
    name: 'Hazem',
    email: 'hazem@company.com',
    role: 'member',
    is_active: true,
    color: 'bg-rose-600',
    initials: 'HA',
    notification_prefs: {
      email_task_assigned: true,
      email_due_reminder: true,
      email_overdue: true,
      email_blocked: true,
      email_done: true,
      email_comment: true,
      email_weekly_summary: true,
    },
  },
  {
    id: 'u-architect',
    name: 'Architect',
    email: 'architect@company.com',
    role: 'member',
    is_active: false,
    color: 'bg-slate-500',
    initials: 'AR',
    notification_prefs: {},
  },
  {
    id: 'u-eslam',
    name: 'Eng Eslam',
    email: 'eslam@company.com',
    role: 'member',
    is_active: false,
    color: 'bg-slate-500',
    initials: 'ES',
    notification_prefs: {},
  },
  {
    id: 'u-mahmoud',
    name: 'Eng Mahmoud Reda',
    email: 'mahmoud.reda@company.com',
    role: 'member',
    is_active: false,
    color: 'bg-slate-500',
    initials: 'MR',
    notification_prefs: {},
  },
];

const INITIAL_PROJECT_NAMES = [
  'Madinaty',
  'Fire Alarm',
  'Sensor',
  'SWM30',
  'USGM30 Gas meter',
  'LoRa',
  'RF Sniffer',
  'EG915',
  'PLC Sniffer',
  'Iraq EG800ZEU Modem flow meter',
  'DinRail',
  'Midar NA',
  'JICA',
  'Router',
  'Spain DCU',
];

const STATUS_META = {
  backlog: {
    label: 'Backlog',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    rgb: [100, 116, 139],
    dot: 'bg-slate-400',
    cardBg: 'bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100 dark:from-slate-800/95 dark:via-slate-900 dark:to-slate-800/80 border-slate-300 dark:border-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800',
    rgb: [14, 165, 233],
    dot: 'bg-sky-500',
    cardBg: 'bg-gradient-to-br from-sky-100/90 via-sky-50/75 to-indigo-50/70 dark:from-sky-950/80 dark:via-slate-900 dark:to-indigo-950/50 border-sky-300 dark:border-sky-800',
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    rgb: [245, 158, 11],
    dot: 'bg-amber-500',
    cardBg: 'bg-gradient-to-br from-amber-100/90 via-orange-50/80 to-amber-50/70 dark:from-amber-950/80 dark:via-slate-900 dark:to-orange-950/50 border-amber-300 dark:border-amber-700',
  },
  done: {
    label: 'Done',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    rgb: [16, 185, 129],
    dot: 'bg-emerald-500',
    cardBg: 'bg-gradient-to-br from-emerald-100/90 via-teal-50/75 to-emerald-50/70 dark:from-emerald-950/80 dark:via-slate-900 dark:to-teal-950/50 border-emerald-300 dark:border-emerald-800',
  },
};

const PRIORITY_META = {
  1: { label: 'P1', name: 'P1', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
  2: { label: 'P2', name: 'P2', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  3: { label: 'P3', name: 'P3', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  4: { label: 'P4', name: 'P4', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
};

const CRITICALITY_META = {
  critical: { label: 'Critical', rank: 1, badge: 'bg-red-600 text-white border-red-700 shadow-xs' },
  high: { label: 'High', rank: 2, badge: 'bg-orange-500 text-white border-orange-600' },
  medium: { label: 'Medium', rank: 3, badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200 border-amber-300' },
  low: { label: 'Low', rank: 4, badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
};

// Helper: Check if a YYYY-MM-DD falls on Egyptian weekend (Friday = 5, Saturday = 6)
function itemNumber(id) {
  let n = 0n;
  for (const c of String(id)) n = (n * 131n + BigInt(c.codePointAt(0))) % 10000n;
  return n.toString().padStart(4, '0');
}

function isWeekendCairo(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 5 || day === 6;
}

function snapToWorkingDay(dateStr, direction = 1) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  while (d.getUTCDay() === 5 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + (direction >= 0 ? 1 : -1));
  }
  return d.toISOString().slice(0, 10);
}

// Add working days (skipping Friday & Saturday)
function addDays(dateStr, workingDaysDelta) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;

  while (d.getUTCDay() === 5 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const wholeDays = Math.round(Number(workingDaysDelta) || 0);
  if (wholeDays === 0) return d.toISOString().slice(0, 10);

  const step = wholeDays > 0 ? 1 : -1;
  let remaining = Math.abs(wholeDays);

  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + step);
    const dow = d.getUTCDay();
    if (dow !== 5 && dow !== 6) {
      remaining--;
    }
  }
  return d.toISOString().slice(0, 10);
}

function addCalendarDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + Math.round(Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

function diffCalendarDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr + 'T00:00:00Z');
  const e = new Date(endStr + 'T00:00:00Z');
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

function diffDays(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr + 'T00:00:00Z');
  const e = new Date(endStr + 'T00:00:00Z');
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

  if (s.getTime() === e.getTime()) return 0.5;
  const forward = e >= s;
  const cur = new Date(forward ? s : e);
  const target = new Date(forward ? e : s);
  let count = 0;

  while (cur < target) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dow = cur.getUTCDay();
    if (dow !== 5 && dow !== 6) {
      count++;
    }
  }
  return Math.max(0.5, forward ? count : -count);
}

function isTaskOverdue(task) {
  if (!task || task.status === 'done') return false;
  const plannedEnd = getPlannedEndDate(task);
  if (plannedEnd && plannedEnd < TODAY_CAIRO) return true;
  if (
    task.status === 'in_progress' &&
    Number(task.actual_days) > 0 &&
    Number(task.planned_days) > 0 &&
    Number(task.actual_days) > Number(task.planned_days)
  ) {
    return true;
  }
  return false;
}

function getPlannedEndDate(task) {
  if (task.start_date && task.due_date && Number(task.planned_days) > 0) {
    return addTaskDays(task, task.start_date, task.planned_days) || task.due_date;
  }
  return task.due_date || null;
}

function getEffectiveEndDate(task) {
  if (!task || !task.start_date) return null;
  const baseDue = getPlannedEndDate(task) || addTaskDays(task, task.start_date, task.planned_days || 1);
  return getBlockedEndDate(task, baseDue);
}

function getBlockedEndDate(task, plannedEnd) {
  const blockedDays = Number(task.blocked_days);
  if (!plannedEnd || !(blockedDays > 0)) return plannedEnd;
  return addTaskDays(task, addCalendarDays(plannedEnd, 1), blockedDays) || plannedEnd;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getWeightBarStyle(status, weight = 5) {
  const meta = STATUS_META[status] || STATUS_META.backlog;
  const [r, g, b] = meta.rgb;
  const clampedW = Math.max(1, Math.min(10, Number(weight) || 5));
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    boxShadow: clampedW >= 8 ? `0 2px 10px -1px rgba(${r}, ${g}, ${b}, 0.45)` : undefined,
  };
}

// ============================================================================
// DETERMINISTIC SEED GENERATOR (175 Tasks, Dependencies, Blocked Days, Scheduled)
// ============================================================================
function buildInitialDataset() {
  const productLines = INITIAL_PROJECT_NAMES.map((name, idx) => ({
    id: `pl-${idx + 1}`,
    name,
    position: idx + 1,
    created_at: '2026-09-01T08:00:00Z',
  }));

  const tabSpecs = [
    {
      tab: 'Madinaty',
      count: 14,
      projects: ['Madinaty Concentrator RF Mesh', 'Madinaty Collector Board'],
      tasks: [
        'Schematic verification for RF front-end',
        'Power supply transient protection layout',
        'SPI flash memory footprint audit',
        'Sub-GHz antenna impedance matching',
        'UART optical isolation test',
        'Enclosure thermal dissipation simulation',
        'Support purchasing process',
        'Gateway RS485 surge immunity test',
        'Production Gerber package generation',
        'Pick-and-place centroid validation',
        'First article inspection checklist',
        'Firmware bootloader UART handoff',
        'Field RSSI range test in New Cairo',
        'Final BOM cost optimization',
      ],
    },
    {
      tab: 'Fire Alarm',
      count: 16,
      projects: ['Sensor', 'Addressable Fire Panel Loop Card', 'UL 864 Compliance Suite'],
      tasks: [
        'Loop short-circuit isolator verification',
        '24V battery charger current limiter',
        'Smoke chamber optical labyrinth test',
        'Buzzer piezoelectric driver tuning',
        'Caps ESR issue',
        'UL Test — Radiated emissions pre-scan',
        'UL Test — ESD contact discharge 8kV',
        'UL Test — Surge line-to-ground 2kV',
        'UL Test — Supply voltage dip immunity',
        'UL Test — Ambient temperature drift',
        'UL Test — Fault relay endurance',
        'UL Test — Loop wiring resistance max',
        'UL Test — Panel quiescent current',
        'UL Test —Earth fault detection sensitivity',
        'NAC output supervisory reverse polarity',
        'Main board silk-screen revision B2',
      ],
    },
    {
      tab: 'Sensor',
      count: 11,
      projects: ['Optical Tamper & Tilt Sensor', 'Ultrasonic Flow Pickup'],
      tasks: [
        'IR phototransistor ambient light rejection',
        'MEMS accelerometer wake-on-shake threshold',
        'CR123A sleep current below 1.8uA validation',
        'Potting compound acoustic coupling test',
        'Zero-flow offset drift calibration',
        'Temperature compensation NTC curve fit',
        'Reed switch magnetic tamper shielding',
        'Pogo-pin programming jig mechanicals',
        'Conformal coating humidity chamber 85/85',
        'Piezo transducer burst excitation driver',
        'Sensor calibration certificate template',
      ],
    },
    {
      tab: 'SWM30',
      count: 12,
      projects: ['SWM30 Smart Water Meter Rev-C', 'SWM30 Motorized Valve Actuator'],
      tasks: [
        'H-bridge motor stall current cutoff',
        'Hall-effect pulse counting debounce filter',
        'Supercapacitor backup charge controller',
        'IP68 O-ring compression torque test',
        'NB-IoT SIM holder vibration test',
        'LCD segment contrast voltage compensation',
        'Reverse water flow alarm flag logic',
        'Low battery cutoff valve auto-close',
        'Plastic housing UV weatherability check',
        'Production magnetic calibration rig',
        'SWM30 hydrostatic pressure test',
        'Drop test 1.5m concrete orientation',
      ],
    },
    {
      tab: 'USGM30 Gas meter',
      count: 11,
      projects: ['USGM30 ATEX Intrinsic Safety', 'USGM30 Ultrasonic Metrology'],
      tasks: [
        'Zener barrier clamping power dissipation',
        'ATEX creepage & clearance PCB audit',
        'Time-of-flight dual transducer multiplexer',
        'Methane speed-of-sound lookup table',
        'Shutoff valve latch pulse energy budget',
        'Tamper cover micro-switch sealing',
        'Intrinsic safety series resistor rating',
        'Gas flow bench Qmin to Qmax linearity',
        'Electrostatic non-sparking enclosure check',
        'Battery pack potting thermal runaway test',
        'EN14236 compliance dossier compilation',
      ],
    },
    {
      tab: 'LoRa',
      count: 12,
      projects: ['SX1262 LoRaWAN Node Module', '8-Channel Outdoor LoRa Gateway'],
      tasks: [
        'SX1262 TCXO crystal startup stabilization',
        '868MHz harmonic Pi-filter attenuation',
        'Class-A Join-Accept RX1/RX2 window timing',
        'Gateway SX1302 concentrator heat sink',
        'SAW filter insertion loss characterization',
        'SMA connector torque & return loss S11',
        'Adaptive Data Rate (ADR) link budget test',
        'PoE 802.3af PD controller efficiency',
        'GPS PPS synchronization pulse jitter',
        'Outdoor lightning arrestor grounding lug',
        'LoRa alliance certification pre-test',
        'Production RF shielding can soldering',
      ],
    },
    {
      tab: 'RF Sniffer',
      count: 10,
      projects: ['Handheld Sub-GHz RF Protocol Sniffer'],
      tasks: [
        'Wideband LNA noise figure measurement',
        'USB-C high-speed packet capture bridge',
        'OLED spectrum waterfall display refresh',
        'Wireshark dissector plugin for W-MBus',
        'Li-Po USB charging IC thermal foldback',
        'SMA Whip antenna VSWR across 433/868MHz',
        'Trigger-on-preamble RSSI threshold comparator',
        'SD card PCAP ring-buffer logging',
        'Aluminum extruded enclosure anodizing',
        'User manual & field engineer quick guide',
      ],
    },
    {
      tab: 'EG915',
      count: 12,
      projects: ['EG915 4G modem - Local Tender', 'EG915 LTE Cat-1 Core Board'],
      tasks: [
        'Quectel EG915 power-on reset sequencing',
        'LTE main antenna matching network tuning',
        'SIM tray ESD diode array placement',
        'Peak 2A GSM burst bulk capacitor sizing',
        'AT command PPP dial-up stability stress',
        'Local Tender technical compliance matrix',
        'PCM audio interface loopback verification',
        'Network registration fallback 4G to 2G',
        'conducted TRP/TIS chamber measurement',
        'Mini-PCIe form factor pinout compatibility',
        'Thermal pad thickness to shield lid',
        'Golden sample sign-off with QC team',
      ],
    },
    {
      tab: 'PLC Sniffer',
      count: 9,
      projects: ['G3-PLC Zero-Crossing Line Coupler'],
      tasks: [
        'High-voltage coupling capacitor X2 safety',
        ' Coupling transformer saturation current',
        'Zero-crossing optocoupler phase delay',
        'CENELEC-A band TX amplifier linearity',
        'Mains surge 4kV ring-wave survival',
        'Galvanic isolation 3.5kVrms hipot test',
        'PLC frame CRC error rate on noisy grid',
        'DIN-rail clip mechanical retention force',
        'Safety warning label artwork approval',
      ],
    },
    {
      tab: 'Iraq EG800ZEU Modem flow meter',
      count: 13,
      projects: ['Iraq EG800ZEU Flow Meter Telemetry', 'Iraq Ministry Field Enclosure'],
      tasks: [
        'EG800ZEU LTE band B3/B20 Iraq carrier test',
        'RS485 Modbus master flow-rate polling',
        'Solar charge controller MPPT setpoint',
        'High-ambient 65C desert chamber test',
        'Pulse input opto-isolation debounce',
        'Tamper door switch SMS alert trigger',
        'Dual-SIM automatic failover algorithm',
        'DIN terminal block wire ferrule sizing',
        'IP66 gland cable retention pull test',
        'Arabic/English laser nameplate engraving',
        'Remote OTA firmware delta patch test',
        'Factory acceptance test (FAT) protocol',
        'Pre-shipment inspection batch 1 (250 units)',
      ],
    },
    {
      tab: 'DinRail',
      count: 15,
      projects: ['3-Phase DinRail Smart Energy Meter', 'DinRail Optical Port Module'],
      tasks: [
        'Current transformer (CT) burden resistor',
        'Voltage divider MELF resistor TC drift',
        'Metrology ASIC ADE7878 SPI calibration',
        'IEC 62056-21 optical probe magnet ring',
        'Latching relay 100A contact weld test',
        'Neutral missing tamper detection circuit',
        'Switched-mode power supply 440Vac survival',
        'DinRail 35mm top-hat latch spring',
        'Class 1.0 active energy accuracy sweep',
        'Harmonic injection 5th/7th accuracy check',
        'Backlit LCD viewing angle verification',
        'Sealable terminal cover screw torque',
        'Burn-in rack 72-hour elevated temp',
        'Automated calibration bench LabVIEW script',
        'MID / IEC 62052-11 test report review',
      ],
    },
    {
      tab: 'Midar NA',
      count: 10,
      projects: ['Midar Smart City AMI Concentrator'],
      tasks: [
        'Fiber SFP cage high-speed differential routing',
        '3-phase AC auxiliary power input module',
        'DLMS/COSEM object OBIS code mapping',
        'Substation cabinet EMC immunity test',
        'Watchdog supervisor external hardware timer',
        'Supercap Last-Gasp power fail message',
        'din-rail surge arrester coordination',
        'Midar pilot site survey & antenna height',
        'VPN IPsec tunnel throughput benchmark',
        'Commissioning checklist for 50 feeders',
      ],
    },
    {
      tab: 'JICA',
      count: 10,
      projects: ['JICA Water Distribution Telemetry'],
      tasks: [
        '4-20mA pressure transmitter loop power',
        'Low-power data logger FRAM storage',
        'Japanese spec JIS flange adapter drawing',
        'Battery pack 10-year life profile model',
        'Submersible cable splice waterproofing',
        'Daily MQTT payload compression format',
        'JICA consultant witness test preparation',
        'Field calibration handheld communicator',
        'Spare parts kit BOM & packaging',
        'As-built wiring diagram documentation',
      ],
    },
    {
      tab: 'Router',
      count: 10,
      projects: ['Industrial Dual-SIM 4G Ethernet Router'],
      tasks: [
        '10/100Base-T magnetics isolation hipot',
        'OpenWrt kernel watchdog driver patch',
        'SIM1/SIM2 GPIO multiplexer switch speed',
        'Reverse polarity input MOSFET protection',
        'Wi-Fi 2.4GHz PCB trace antenna tuning',
        'RS232/RS485 software-selectable termination',
        'SNMP v3 MIB table implementation',
        'Metal casing ground stud conductivity',
        'Throughput test TCP iperf3 72 hours',
        'CE RED directive self-declaration pack',
      ],
    },
    {
      tab: 'Spain DCU',
      count: 10,
      projects: ['Spain Iberdrola PRIME PLC DCU', 'Spain DCU Thermal & Enclosure'],
      tasks: [
        'PRIME v1.4 PLC coupling 3-phase injection',
        'European CE / RoHS3 BOM substance audit',
        'Iberdrola cybersecurity certificate TPM 2.0',
        'Wide-range 85-265Vac PSU efficiency',
        'Gore-Tex breather membrane pressure test',
        'DIN43863 meter cabinet mounting bracket',
        'SNTP time sync fallback to cellular RTC',
        'Remote SSH hardening & port lockdown',
        'Pre-compliance conducted emissions EN55032',
        'Pilot shipment 20 units to Madrid lab',
      ],
    },
  ];

  const swappedDatesLookup = {
    'Iraq EG800ZEU Modem flow meter-10': { stored: '2026-06-10', swapped: '2026-10-06' },
    'Iraq EG800ZEU Modem flow meter-12': { stored: '2026-07-10', swapped: '2026-10-07' },
    'Iraq EG800ZEU Modem flow meter-13': { stored: '2026-12-10', swapped: '2026-10-12' },
    'DinRail-2': { stored: '2026-10-09', swapped: '2026-09-10' },
    'DinRail-3': { stored: '2026-10-09', swapped: '2026-09-10' },
    'DinRail-13': { stored: '2026-05-10', swapped: '2026-10-05' },
    'DinRail-14': { stored: '2026-05-10', swapped: '2026-10-05' },
    'DinRail-15': { stored: '2026-05-10', swapped: '2026-10-05' },
    'JICA-4': { stored: '2026-06-10', swapped: '2026-10-06' },
    'JICA-5': { stored: '2026-07-10', swapped: '2026-10-07' },
    'Router-2': { stored: '2026-07-10', swapped: '2026-10-07' },
    'Spain DCU-2': { stored: '2026-07-10', swapped: '2026-10-07' },
  };

  const projects = [];
  const tasks = [];
  const comments = [];
  const activityLog = [];
  const activeAssignees = ['u-abdo', 'u-hussein', 'u-ramy', 'u-hazem', 'u-mohamed'];
  const criticalities = ['critical', 'high', 'medium', 'low'];

  let globalTaskIdx = 0;

  tabSpecs.forEach((spec, tabIdx) => {
    const pl = productLines[tabIdx];
    const tabProjects = spec.projects.map((pName, pIdx) => {
      const proj = {
        id: `proj-${tabIdx + 1}-${pIdx + 1}`,
        product_line_id: pl.id,
        name: pName,
        default_priority: ((tabIdx + pIdx) % 4) + 1,
        default_due_date: '2026-10-28',
        archived: false,
        created_at: '2026-09-01T08:00:00Z',
      };
      projects.push(proj);
      return proj;
    });

    for (let i = 0; i < spec.count; i++) {
      globalTaskIdx++;
      const taskId = `task-${globalTaskIdx}`;
      const proj = tabProjects[i % tabProjects.length];
      const title = `${proj.name} — ${spec.tasks[i]}`;
      const excelRow = i + 2;

      const isRescued =
        (spec.tab === 'Madinaty' && spec.tasks[i] === 'Support purchasing process') ||
        (spec.tab === 'Fire Alarm' && spec.tasks[i] === 'Caps ESR issue');

      const isUnassigned = globalTaskIdx <= 5;
      const assignee_id = isUnassigned
        ? null
        : activeAssignees[(globalTaskIdx + tabIdx) % activeAssignees.length];

      let status = 'backlog';
      if (globalTaskIdx % 5 === 0 || globalTaskIdx % 5 === 1) status = 'done';
      else if (globalTaskIdx % 5 === 2 || globalTaskIdx % 5 === 3) status = 'in_progress';
      else if (globalTaskIdx % 11 === 0) status = 'blocked';

      const priority = ((globalTaskIdx + i) % 4) + 1;
      const criticality =
        priority === 1
          ? 'critical'
          : priority === 2
          ? 'high'
          : criticalities[(globalTaskIdx + tabIdx) % criticalities.length];

      const weight = ((globalTaskIdx * 3 + i) % 9) + 2; // 2..10

      const swapKey = `${spec.tab}-${i + 1}`;
      const swapInfo = swappedDatesLookup[swapKey];

      let start_date = null;
      let due_date = null;
      const planned_days = [1, 2, 3, 4, 5, 6, 2, 3][globalTaskIdx % 8];

      // Schedule all 175 tasks across Sep–Nov 2026 so they appear directly on the Gantt timeline
      if (swapInfo) {
        start_date = snapToWorkingDay(swapInfo.swapped, 1);
        due_date = addDays(start_date, planned_days);
      } else {
        const prevTaskInProduct =
          tasks.length > 0 && tasks[tasks.length - 1].project_id === proj.id
            ? tasks[tasks.length - 1]
            : null;
        if (prevTaskInProduct && prevTaskInProduct.due_date && i % 3 !== 0) {
          start_date = snapToWorkingDay(prevTaskInProduct.due_date, 1);
        } else {
          const offsetDays = ((globalTaskIdx * 2) % 38) - 18;
          start_date = addDays(TODAY_CAIRO, offsetDays);
        }
        due_date = addDays(start_date, planned_days);
      }

      // Compute actual_days in working days so some done tasks finish early or late (for the dotted comparison bar)
      let actual_days = 0;
      if (status === 'done') {
        const delta = globalTaskIdx % 3 === 0 ? 2 : globalTaskIdx % 3 === 1 ? -1 : 0;
        actual_days = Math.max(0.5, Number((planned_days + delta).toFixed(1)));
      } else if (status === 'in_progress') {
        const extraDays = due_date <= TODAY_CAIRO ? 1.5 : -0.5;
        actual_days = Math.max(0.5, Number((planned_days + extraDays).toFixed(1)));
      } else if (status === 'blocked') {
        actual_days = Math.max(0.5, Number((planned_days * 0.5).toFixed(1)));
      }

      const time_spent_note =
        status === 'done' && i % 3 === 0
          ? `${actual_days} days`
          : status === 'in_progress' && i % 4 === 0
          ? `${actual_days} days logged`
          : '';

      const blocked_reason =
        status === 'blocked'
          ? 'Awaiting custom ferrite core sample & regulatory lab slot confirmation'
          : '';

      const blocked_days =
        status === 'blocked'
          ? ((globalTaskIdx % 3) + 1)
          : status === 'in_progress' && globalTaskIdx % 9 === 0
          ? 2
          : 0;

      // Wire consecutive tasks inside the same Product by dependency
      const prevTaskInSameProduct =
        tasks.length > 0 && tasks[tasks.length - 1].project_id === proj.id
          ? tasks[tasks.length - 1]
          : null;
      const depends_on_id = prevTaskInSameProduct ? prevTaskInSameProduct.id : null;

      const taskObj = {
        id: taskId,
        project_id: proj.id,
        title,
        details: isRescued
          ? 'Auto-rescued from Details column during Rule 10 sheet import verification.'
          : `Hardware engineering validation for ${proj.name} under ${spec.tab} project. Includes schematic capture, lab bench verification, and Cairo QA sign-off.`,
        assignee_id,
        priority,
        criticality,
        weight,
        start_date,
        due_date,
        planned_days,
        actual_days,
        blocked_days,
        depends_on_id,
        status,
        blocked_reason,
        approved_by: status === 'done' ? 'Mohamed' : '',
        time_spent_note,
        position: i + 1,
        created_by: 'u-mohamed',
        created_at: '2026-09-10T09:00:00Z',
        updated_at: '2026-10-12T12:00:00Z',
        completed_at: status === 'done' ? '2026-10-11T16:30:00Z' : null,
        source_sheet: spec.tab,
        source_row: isRescued ? (spec.tab === 'Madinaty' ? 19 : 22) : excelRow,
        rescued_from_details: isRescued,
        swapped_date_original: swapInfo ? swapInfo.stored : null,
      };

      tasks.push(taskObj);

      if (spec.tab === 'Iraq EG800ZEU Modem flow meter' && i < 4) {
        comments.push({
          id: `cmt-iraq-${i + 1}`,
          task_id: taskId,
          author_id: 'u-mohamed',
          body: `[Imported from Iraq Comments column]: Field modem firmware v2.14 verified with Baghdad APN profile.`,
          created_at: '2026-09-25T10:15:00Z',
        });
      }

      if (time_spent_note) {
        comments.push({
          id: `cmt-status-${globalTaskIdx}`,
          task_id: taskId,
          author_id: assignee_id || 'u-mohamed',
          body: `[Rule 3 Status Cleanup Note]: Bench test completed (${time_spent_note}) — waveform ripple within 15mV spec.`,
          created_at: '2026-10-05T14:20:00Z',
        });
      }
    }
  });

  const dryRunReport = {
    scannedRows: 202,
    tasksToCreate: tasks.length,
    swappedDatesCount: 12,
    skippedRowsCount: 27,
    rescuedRowsCount: 2,
    swappedDates: [
      { tab: 'Iraq EG800ZEU Modem flow meter', row: 10, stored: '2026-06-10', afterSwap: '2026-10-06' },
      { tab: 'Iraq EG800ZEU Modem flow meter', row: 12, stored: '2026-07-10', afterSwap: '2026-10-07' },
      { tab: 'Iraq EG800ZEU Modem flow meter', row: 13, stored: '2026-12-10', afterSwap: '2026-10-12' },
      { tab: 'DinRail', row: 2, stored: '2026-10-09', afterSwap: '2026-09-10' },
      { tab: 'DinRail', row: 3, stored: '2026-10-09', afterSwap: '2026-09-10' },
      { tab: 'DinRail', row: 30, stored: '2026-05-10', afterSwap: '2026-10-05' },
      { tab: 'DinRail', row: 37, stored: '2026-05-10', afterSwap: '2026-10-05' },
      { tab: 'DinRail', row: 38, stored: '2026-05-10', afterSwap: '2026-10-05' },
      { tab: 'JICA', row: 4, stored: '2026-06-10', afterSwap: '2026-10-06' },
      { tab: 'JICA', row: 5, stored: '2026-07-10', afterSwap: '2026-10-07' },
      { tab: 'Router', row: 2, stored: '2026-07-10', afterSwap: '2026-10-07' },
      { tab: 'Spain DCU', row: 2, stored: '2026-07-10', afterSwap: '2026-10-07' },
    ],
  };

  return {
    productLines,
    projects,
    tasks,
    comments,
    activityLog,
    dryRunReport,
  };
}

// ============================================================================
// NOTIFICATION ENGINE (Channel Adapter Pattern: in_app | email)
// ============================================================================
const NotificationEngine = {
  dispatch({ eventType, task, actor, recipients, title, body, existingNotifications = [] }) {
    const created = [];
    const emailLogs = [];
    const todayPrefix = new Date().toISOString().slice(0, 10);

    recipients.filter(recipient => recipient?.id === task?.assignee_id).forEach((recipient) => {
      if (!recipient) return;
      const alreadySentToday = existingNotifications.some(
        (n) =>
          n.task_id === task?.id &&
          n.type === eventType &&
          n.user_id === recipient.id &&
          (n.created_at || '').slice(0, 10) === todayPrefix
      );
      if (alreadySentToday && eventType !== 'manual_reminder') return;

      created.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: recipient.id,
        task_id: task?.id || null,
        type: eventType,
        channel: 'in_app',
        title,
        body,
        link: task ? `/tasks/${task.id}` : '/',
        read_at: null,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Email delivery is handled by the server queue after a task event is persisted.

    });

    return { created, emailLogs };
  },
};

// ============================================================================
// MAIN APPLICATION COMPONENT (Default Export)
// ============================================================================
export default function App({ account, onSignOut }) {
  const initialData = useMemo(() => buildInitialDataset(), []);

  const [darkMode, setDarkMode] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [ganttExpanded, setGanttExpanded] = useState(false);
  const [ganttControls, setGanttControls] = useState(true);
  const [activeTab, setActiveTab] = useState('gantt');
  const shared = realAccount(account.id);
  const workspace = useSharedWorkspace(initialData, shared);
  const [users, setUsers] = useState(() => shared ? [account] : [account, ...SEED_USERS.filter((user) => user.id !== account.id)]);
  useEffect(() => { setUsers(previous => previous.map(user => user.id===account.id ? {...user,name:account.name,email:account.email} : user)); }, [account.id,account.name,account.email]);
  const currentUserId = account.id;

  const {productLines, projects, tasks, comments, activityLog} = workspace.state;
  const setProductLines = workspace.setter('productLines');
  const setProjects = workspace.setter('projects');
  const setTasks = workspace.setter('tasks');
  const setComments = workspace.setter('comments');
  const setActivityLog = workspace.setter('activityLog');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.rpc('task_assignee_directory').then(({data,error}) => {
      if(active && !error && data) setUsers(previous => [...data.map(user => ({ ...user, initials: user.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase(), color: 'bg-indigo-600' })), ...previous.filter(user => !data.some(real => real.id === user.id))]);
    });
    return () => { active = false; };
  }, []);
  const [dryRunReport, setDryRunReport] = useState(initialData.dryRunReport);

  useEffect(() => { if (shared) setUndoHistory([]); }, [workspace.remoteRevision]);

  const [notifications, setNotifications] = useState(shared ? [] : [
    {
      id: 'notif-seed-1',
      user_id: 'u-mohamed',
      task_id: 'task-1',
      type: 'overdue',
      channel: 'in_app',
      title: 'Daily Overdue Digest (Cairo 09:00)',
      body: 'Tasks past planned due date have been flagged on the Gantt chart.',
      read_at: null,
      sent_at: '2026-10-14T09:00:00Z',
      created_at: '2026-10-14T09:00:00Z',
    },
  ]);
  const [emailOutbox, setEmailOutbox] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedProductLines, setSelectedProductLines] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedCriticalities, setSelectedCriticalities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(account.role === 'member');

  // Gantt Controls
  const [ganttZoom, setGanttZoom] = useState('week');
  const [zoomScale, setZoomScale] = useState(1);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const defaultGroupsSet = useRef(false);
  useEffect(() => {
    if (!workspace.ready || defaultGroupsSet.current) return;
    defaultGroupsSet.current = true;
    setCollapsedGroups(Object.fromEntries(projects.map((project) => [`proj-${project.id}`, true])));
  }, [workspace.ready, projects]);

  // Modals & Side Panel
  const [editingProject, setEditingProject] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [checkedTasks, setCheckedTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(() => { const id = new URLSearchParams(location.search).get('task'); return id; });
  const [blockedModalState, setBlockedModalState] = useState(null);
  const [inProgressModalState, setInProgressModalState] = useState(null);
  const [doneTransitionModalState, setDoneTransitionModalState] = useState(null);
  const [createHierarchyModalOpen, setCreateHierarchyModalOpen] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState('backlog');
  const [splitTaskModalTarget, setSplitTaskModalTarget] = useState(null);
  const [dryRunModalOpen, setDryRunModalOpen] = useState(false);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);

  // Multi-Step Undo History Stack & Toasts
  const [undoHistory, setUndoHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const searchInputRef = useRef(null);

  const pushToast = (type, title, message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.id] = u;
    });
    return m;
  }, [users]);

  const productLineMap = useMemo(() => {
    const m = {};
    productLines.forEach((pl) => {
      m[pl.id] = pl;
    });
    return m;
  }, [productLines]);

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [projects]);

  const taskMap = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      m[t.id] = t;
    });
    return m;
  }, [tasks]);

  const currentUser = userMap[currentUserId] || users[0];

  const canEditTask = (task) => {
    if (!task) return false;
    if (currentUser.role === 'manager') return true;
    return currentUser.role === 'member' && task.assignee_id === currentUser.id;
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedAssignees([]);
    setSelectedProductLines([]);
    setSelectedProjects([]);
    setSelectedPriorities([]);
    setSelectedCriticalities([]);
    setSelectedStatuses([]);
    setOverdueOnly(false);
    setMyTasksOnly(false);
  };

  const expandAllGanttGroups = () => setCollapsedGroups((previous) => {
    if (productLines.some((pl) => previous[`pl-${pl.id}`])) {
      const next = { ...previous };
      productLines.forEach((pl) => { delete next[`pl-${pl.id}`]; });
      return next;
    }
    if (projects.some((project) => previous[`proj-${project.id}`])) {
      const next = { ...previous };
      projects.forEach((project) => { delete next[`proj-${project.id}`]; });
      return next;
    }
    return previous;
  });
  const ganttExpandLabel = productLines.some((pl) => collapsedGroups[`pl-${pl.id}`])
    ? 'Show Products'
    : projects.some((project) => collapsedGroups[`proj-${project.id}`])
    ? 'Show Tasks'
    : 'All Tasks Visible';
  const collapseAllGanttGroups = () => setCollapsedGroups((previous) => {
    const next = { ...previous };
    if (projects.some((project) => !previous[`proj-${project.id}`])) {
      projects.forEach((project) => { next[`proj-${project.id}`] = true; });
    } else if (productLines.some((pl) => !previous[`pl-${pl.id}`])) {
      productLines.forEach((pl) => { next[`pl-${pl.id}`] = true; });
    }
    return next;
  });
  const ganttCollapseLabel = projects.some((project) => !collapsedGroups[`proj-${project.id}`])
    ? 'Collapse Tasks'
    : productLines.some((pl) => !collapsedGroups[`pl-${pl.id}`])
    ? 'Collapse Products to Projects'
    : 'All Collapsed';

  const updateSelectedStatus = (ids, status, reason) => {
    const pending = new Set(ids);
    const next = tasks.map(task => ({ ...task }));
    const lookup = new Map(next.map(task => [task.id, task]));
    const timestamp = new Date().toISOString();
    let count = 0;
    for (let progress = true; progress;) {
      progress = false;
      for (const task of next) {
        if (!pending.has(task.id) || !canEditTask(task)) continue;
        if (task.status === status) {
          pending.delete(task.id);
          continue;
        }
        if (status === 'done' && task.depends_on_id && lookup.get(task.depends_on_id)?.status !== 'done') continue;
        task.status = status;
        task.updated_at = timestamp;
        task.completed_at = status === 'done' ? timestamp : null;
        if (status === 'done') task.actual_days = Number(task.actual_days) || Number(task.planned_days) || 1;
        if (status === 'blocked') task.blocked_reason = reason;
        pending.delete(task.id);
        count++;
        progress = true;
      }
    }
    if (count) {
      setUndoHistory(previous => [...previous.slice(-29), { tasksSnapshot: tasks, label: 'Update selected task statuses' }]);
      setTasks(next);
    }
    setCheckedTasks([...pending]);
    pushToast(count ? 'success' : 'info', count + ' task statuses updated', pending.size + ' skipped.');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const proj = projectMap[t.project_id];
      if (!proj || proj.archived || productLineMap[proj.product_line_id]?.archived) return false;

      if (myTasksOnly && t.assignee_id !== currentUser.id) return false;
      if (overdueOnly && !isTaskOverdue(t)) return false;

      if (!myTasksOnly && selectedAssignees.length > 0) {
        if (selectedAssignees.includes('unassigned')) {
          if (t.assignee_id !== null) return false;
        } else if (!selectedAssignees.includes(t.assignee_id)) {
          return false;
        }
      }

      if (selectedProductLines.length > 0 && !selectedProductLines.includes(proj.product_line_id)) {
        return false;
      }

      if (selectedProjects.length > 0 && !selectedProjects.includes(t.project_id)) {
        return false;
      }

      if (selectedCriticalities.length > 0 && !selectedCriticalities.includes(t.criticality)) return false;

      if (selectedPriorities.length > 0 && !selectedPriorities.includes(Number(t.priority))) {
        return false;
      }

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const plName = productLineMap[proj.product_line_id]?.name || '';
        const assigneeName = t.assignee_id ? userMap[t.assignee_id]?.name || '' : '';
        const match =
          [itemNumber(t.id), itemNumber(proj.id), itemNumber(proj.product_line_id)]
            .some(number => number.toLowerCase().includes(q.replace(/^#/, ''))) ||
          (t.title || '').toLowerCase().includes(q) ||
          (t.details || '').toLowerCase().includes(q) ||
          (proj.name || '').toLowerCase().includes(q) ||
          plName.toLowerCase().includes(q) ||
          assigneeName.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    tasks,
    projectMap,
    productLineMap,
    userMap,
    myTasksOnly,
    overdueOnly,
    selectedAssignees,
    selectedProductLines,
    selectedProjects,
    selectedPriorities,
    selectedCriticalities,
    selectedStatuses,
    searchQuery,
    currentUser.id,
  ]);

  const kpiStats = useMemo(() => {
    const total = filteredTasks.length;
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const done = filteredTasks.filter((t) => t.status === 'done').length;
    const inProgress = filteredTasks.filter((t) => t.status === 'in_progress').length;
    const blocked = filteredTasks.filter((t) => t.status === 'blocked').length;
    const backlog = filteredTasks.filter((t) => t.status === 'backlog').length;
    const overdue = filteredTasks.filter((t) => isTaskOverdue(t)).length;

    return [
      { id: 'total', label: 'Total', count: total, pct: 100, color: 'border-indigo-600', bg: 'bg-indigo-50/40 dark:bg-indigo-950/20' },
      { id: 'done', label: 'Done', count: done, pct: pct(done), color: 'border-emerald-600', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20' },
      { id: 'in_progress', label: 'In Progress', count: inProgress, pct: pct(inProgress), color: 'border-sky-600', bg: 'bg-sky-50/40 dark:bg-sky-950/20' },
      { id: 'blocked', label: 'Blocked', count: blocked, pct: pct(blocked), color: 'border-amber-600', bg: 'bg-amber-50/40 dark:bg-amber-950/20' },
      { id: 'backlog', label: 'Backlog', count: backlog, pct: pct(backlog), color: 'border-slate-400', bg: 'bg-slate-50/40 dark:bg-slate-900/40' },
      { id: 'overdue', label: 'Overdue', count: overdue, pct: pct(overdue), color: 'border-rose-600', bg: 'bg-rose-50/40 dark:bg-rose-950/20' },
    ];
  }, [filteredTasks]);

  // Global Keyboard Shortcuts (including Multi-Step Ctrl+Z / Cmd+Z Undo!)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setUndoHistory((prev) => {
          if (prev.length === 0) return prev;
          const lastEntry = prev[prev.length - 1];
          if (lastEntry.tasksSnapshot) {
            setTasks(lastEntry.tasksSnapshot);
          } else if (lastEntry.taskSnapshot) {
            const snap = lastEntry.taskSnapshot;
            setTasks((curr) => curr.map((t) => (t.id === snap.id ? snap : t)));
          }
          pushToast(
            'info',
            `Action Undone (${prev.length - 1} left)`,
            `Reverted: ${lastEntry.label}`
          );
          return prev.slice(0, -1);
        });
        return;
      }

      if (e.key === 'Escape') {
        if (doneTransitionModalState) setDoneTransitionModalState(null);
        else if (blockedModalState) setBlockedModalState(null);
        else if (inProgressModalState) setInProgressModalState(null);
        else if (splitTaskModalTarget) setSplitTaskModalTarget(null);
        else if (editingProduct) setEditingProduct(null);
        else if (editingProject) setEditingProject(null);
        else if (createHierarchyModalOpen) setCreateHierarchyModalOpen(false);
        else if (newTaskModalOpen) setNewTaskModalOpen(false);
        else if (dryRunModalOpen) setDryRunModalOpen(false);
        else if (shortcutModalOpen) setShortcutModalOpen(false);
        else setSelectedTaskId(null);
        return;
      }

      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' && currentUser.role === 'manager') {
        e.preventDefault();
        setNewTaskDefaultStatus('backlog');
        setNewTaskModalOpen(true);
      } else if (e.key.toLowerCase() === 'p' && currentUser.role === 'manager') {
        e.preventDefault();
        setCreateHierarchyModalOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        expandAllGanttGroups();
      } else if (e.key.toLowerCase() === 'c') {
        collapseAllGanttGroups();
      } else if (e.key.toLowerCase() === 'g') {
        setActiveTab('gantt');
      } else if (e.key.toLowerCase() === 'k') {
        setActiveTab('kanban');
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTab('team');
      } else if (e.key.toLowerCase() === 's') {
        setActiveTab('settings');
      } else if (e.key.toLowerCase() === 'o') {
        setOverdueOnly((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        setMyTasksOnly((prev) => !prev);
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))));
      } else if (e.key === '-') {
        setZoomScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tasks, undoHistory, currentUser, doneTransitionModalState, blockedModalState, inProgressModalState, splitTaskModalTarget, editingProduct, editingProject, createHierarchyModalOpen, newTaskModalOpen, dryRunModalOpen, shortcutModalOpen]);

  // Initial Rule: Auto-push any dependent task whose prerequisite is not Done yet
  const cascadeDependentTasks = (taskList, changedTaskId) => {
    let updatedList = [...taskList];
    const visited = new Set();
    const queue = [changedTaskId];
    let cascadedCount = 0;

    while (queue.length > 0) {
      const parentId = queue.shift();
      if (visited.has(parentId)) continue;
      visited.add(parentId);

      const parentTask = updatedList.find((t) => t.id === parentId);
      if (!parentTask || !parentTask.start_date) continue;

      const parentEnd = getEffectiveEndDate(parentTask);
      if (!parentEnd) continue;

      updatedList = updatedList.map((child) => {
        if (child.depends_on_id === parentId && child.dependencies_enabled !== false && parentTask.dependencies_enabled !== false) {
          if (parentTask.status !== 'done' || !child.start_date || child.start_date <= parentEnd) {
            const nextStart = snapToTaskWorkingDay(child, addCalendarDays(parentEnd, 1));
            const nextDue = addTaskDays(child, nextStart, child.planned_days || 1);
            if (child.start_date !== nextStart || child.due_date !== nextDue) {
              cascadedCount++;
              queue.push(child.id);
              return {
                ...child,
                start_date: nextStart,
                due_date: nextDue,
                updated_at: new Date().toISOString(),
              };
            }
          }
        }
        return child;
      });
    }

    return { updatedList, cascadedCount };
  };

  // Core Task Update Function (Enforces RLS, Planned Time auto-calculation, Dependency Auto-Cascade, Activity Log, Notifications)
  const updateTask = (taskId, patch, options = { allowUndo: false, actionLabel: '' }) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return false;

    if (!canEditTask(existing)) {
      pushToast(
        'error',
        'RLS Policy Violation (403 Forbidden)',
        `Role "${currentUser.role}" (${currentUser.name}) can only update tasks where assignee_id = auth.uid().`
      );
      return false;
    }

    if (currentUser.role !== 'manager' && ('planned_days' in patch || 'due_date' in patch || 'assignee_id' in patch || 'project_id' in patch)) {
      pushToast('error', 'Manager permission required', 'Members can move assigned tasks while keeping their planned duration.');
      return false;
    }

    if (patch.status === 'done' && existing.status !== 'done' && existing.depends_on_id && taskMap[existing.depends_on_id]?.status !== 'done') {
      pushToast('error', 'Finish the prerequisite first', taskMap[existing.depends_on_id]?.title || 'The prerequisite is missing.');
      return false;
    }

    if (patch.status === 'blocked' && !(patch.blocked_reason || existing.blocked_reason || '').trim()) {
      setBlockedModalState({
        taskId,
        targetStatus: 'blocked',
        reason: existing.blocked_reason || '',
        blockedDays: existing.blocked_days || 2,
      });
      return false;
    }

    const assignedProduct = projectMap[existing.project_id];
    if ('assignee_id' in patch && assignedProduct?.assignee_ids?.length === 1 && patch.assignee_id !== assignedProduct.assignee_ids[0]) {
      pushToast('error', 'Product has one assignee', 'Change the product assignees first.');
      return false;
    }

    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };

    if (patch.start_date) {
      updated.start_date = snapToTaskWorkingDay(updated, patch.start_date);
    }
    if (patch.due_date) {
      updated.due_date = snapToTaskWorkingDay(updated, patch.due_date);
      if (!updated.start_date || updated.due_date < updated.start_date) {
        pushToast('error', 'Invalid end date', 'Choose an end date on or after the start date.');
        return false;
      }
    }

    // Planned Time (`planned_days`) is the main duration driver on the Gantt chart
    if (patch.planned_days !== undefined) {
      const pDays = Math.max(0, Number(patch.planned_days) || 0);
      updated.planned_days = pDays;
      if (updated.start_date) {
        updated.due_date = pDays ? addTaskDays(updated, updated.start_date, pDays) : null;
      }
    } else if (patch.start_date !== undefined && patch.due_date !== undefined) {
      updated.planned_days = updated.start_date && updated.due_date ? taskDaysBetween(updated, updated.start_date, updated.due_date) : 0;
    } else if (patch.start_date !== undefined && !patch.due_date && updated.planned_days != null) {
      updated.due_date = Number(updated.planned_days) > 0 ? addTaskDays(updated, updated.start_date, updated.planned_days) : null;
    } else if (patch.due_date !== undefined && updated.start_date) {
      updated.planned_days = updated.start_date && updated.due_date ? taskDaysBetween(updated, updated.start_date, updated.due_date) : 0;
    }

    if (['extra_hours_per_day', 'friday_hours', 'saturday_hours'].some((field) => patch[field] !== undefined)) {
      for (const field of ['extra_hours_per_day', 'friday_hours', 'saturday_hours']) {
        updated[field] = Math.max(0, Math.min(field === 'planned_days' ? 3660 : field === 'extra_hours_per_day' ? 15.5 : 16, Number(updated[field]) || 0));
      }
      if (updated.start_date) {
        updated.start_date = snapToTaskWorkingDay(updated, updated.start_date);
        if (Number(updated.planned_days) > 0) updated.due_date = addTaskDays(updated, updated.start_date, updated.planned_days);
      }
    }

    // If this task depends on a prerequisite that isn't Done yet, enforce starting at prerequisite's end day
    if ((!shared || currentUser.role === 'manager') && updated.dependencies_enabled !== false && updated.depends_on_id) {
      const prereq = tasks.find((t) => t.id === updated.depends_on_id);
      if (prereq && prereq.dependencies_enabled !== false && prereq.status !== 'done' && prereq.start_date) {
        const prereqEnd = getEffectiveEndDate(prereq);
        if (prereqEnd && (!updated.start_date || updated.start_date <= prereqEnd)) {
          updated.start_date = snapToTaskWorkingDay(updated, addCalendarDays(prereqEnd, 1));
          updated.due_date = addTaskDays(updated, updated.start_date, updated.planned_days || 1);
        }
      }
    }

    if (patch.status && patch.status !== existing.status) {
      if (patch.status === 'done') {
        updated.completed_at = new Date().toISOString();
        if (!updated.actual_days || Number(updated.actual_days) === 0) {
          updated.actual_days = updated.planned_days || 1;
        }
      } else if (existing.status === 'done') {
        updated.completed_at = null;
      }
    }

    // Push full snapshot to multi-step undo history stack
    setUndoHistory((prev) => [
      ...prev.slice(-29),
      {
        tasksSnapshot: tasks,
        taskSnapshot: existing,
        label: options.actionLabel || `Updated "${existing.title.slice(0, 32)}..."`,
      },
    ]);

    const baseList = tasks.map((t) => (t.id === taskId ? updated : t));
    const { updatedList, cascadedCount } = shared && currentUser.role !== 'manager'
      ? { updatedList: baseList, cascadedCount: 0 }
      : cascadeDependentTasks(baseList, taskId);
    setTasks(updatedList);

    if (cascadedCount > 0) {
      pushToast(
        'info',
        'Dependent Tasks Auto-Shifted',
        `${cascadedCount} dependent task(s) automatically dragged to start at the end day of "${updated.title.slice(0, 26)}...".`
      );
    }

    const newLogs = [];
    Object.keys(patch).forEach((field) => {
      if (existing[field] !== updated[field]) {
        newLogs.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          task_id: taskId,
          actor_id: currentUser.id,
          action: field === 'status' ? 'status_change' : field.includes('date') ? 'date_change' : 'field_update',
          field,
          old_value: String(existing[field] ?? 'none'),
          new_value: String(updated[field] ?? 'none'),
          created_at: new Date().toISOString(),
        });
      }
    });
    if (newLogs.length > 0) {
      setActivityLog((prev) => [...newLogs, ...prev]);
    }

    const managers = users.filter((u) => u.role === 'manager' && u.is_active);
    let dispatched = { created: [], emailLogs: [] };

    if (patch.assignee_id && patch.assignee_id !== existing.assignee_id) {
      const newAssignee = userMap[patch.assignee_id];
      if (newAssignee) {
        dispatched = NotificationEngine.dispatch({
          eventType: 'assigned',
          task: updated,
          actor: currentUser,
          recipients: [newAssignee],
          title: `Task Assigned: ${updated.title}`,
          body: `${currentUser.name} assigned "${updated.title}" to you (Planned: ${updated.planned_days ?? 1}d, Weight: ${updated.weight ?? 5}/10).`,
          existingNotifications: notifications,
        });
      }
    } else if (patch.status === 'blocked' && existing.status !== 'blocked') {
      const assignee = updated.assignee_id ? userMap[updated.assignee_id] : null;
      const recipients = [...managers];
      if (assignee && assignee.id !== currentUser.id && !recipients.some((r) => r.id === assignee.id)) {
        recipients.push(assignee);
      }
      dispatched = NotificationEngine.dispatch({
        eventType: 'blocked',
        task: updated,
        actor: currentUser,
        recipients,
        title: `Task Blocked: ${updated.title}`,
        body: `${currentUser.name} marked "${updated.title}" as Blocked (${updated.blocked_days || 1}d blocked) — Reason: "${updated.blocked_reason}".`,
        existingNotifications: notifications,
      });
    } else if (patch.status === 'done' && existing.status !== 'done') {
      dispatched = NotificationEngine.dispatch({
        eventType: 'done',
        task: updated,
        actor: currentUser,
        recipients: managers,
        title: `Task Completed: ${updated.title}`,
        body: `${currentUser.name} marked "${updated.title}" as Done (Planned: ${updated.planned_days}d / Actual: ${updated.actual_days}d).`,
        existingNotifications: notifications,
      });
    }

    if (dispatched.created.length > 0) {
      setNotifications((prev) => [...dispatched.created, ...prev]);
    }
    if (dispatched.emailLogs.length > 0) {
      setEmailOutbox((prev) => [...dispatched.emailLogs, ...prev]);

    }

    return true;
  };

  // Request Status Change (Triggers interactive transition modals!)
  const requestStatusChange = (taskId, targetStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    if (!canEditTask(task)) {
      pushToast(
        'error',
        'RLS Policy Violation (403 Forbidden)',
        `Role "${currentUser.role}" (${currentUser.name}) can only update tasks assigned to them.`
      );
      return;
    }

    if (targetStatus === 'blocked') {
      setBlockedModalState({
        taskId,
        targetStatus: 'blocked',
        reason: task.blocked_reason || '',
        blockedDays: task.blocked_days || 2,
      });
      return;
    }

    // Transition from Backlog -> In Progress requires entering a kickoff note
    if (task.status === 'backlog' && targetStatus === 'in_progress') {
      setInProgressModalState({
        taskId,
        note: '',
      });
      return;
    }

    if (targetStatus === 'done' && task.depends_on_id && taskMap[task.depends_on_id]?.status !== 'done') {
      pushToast('error', 'Finish the prerequisite first', taskMap[task.depends_on_id]?.title || 'The prerequisite is missing.');
      return false;
    }

    // Transition from anything -> Done prompts for Actual Days + Next Step (including Link Another Task)
    if (targetStatus === 'done' && task.status !== 'done') {
      setDoneTransitionModalState({
        taskId,
        actualDays: task.actual_days && Number(task.actual_days) > 0 ? task.actual_days : task.planned_days || 2,
        note: '',
        nextStepType: 'note_only', // 'send_review_copy' | 'create_related_task' | 'link_existing_task' | 'note_only'
        reviewerId: 'u-mohamed',
        followUpTitle: `${task.title} — Peer Review & QA Sign-off`,
        linkedTaskId: '',
      });
      return;
    }

    updateTask(
      taskId,
      { status: targetStatus },
      { allowUndo: true, actionLabel: `Task moved to ${STATUS_META[targetStatus].label}` }
    );
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const lastEntry = undoHistory[undoHistory.length - 1];
    if (lastEntry.tasksSnapshot) {
      setTasks(lastEntry.tasksSnapshot);
    } else if (lastEntry.taskSnapshot) {
      const snap = lastEntry.taskSnapshot;
      setTasks((prev) => prev.map((t) => (t.id === snap.id ? snap : t)));
    }
    setUndoHistory((prev) => prev.slice(0, -1));
    pushToast(
      'info',
      `Action Undone (${undoHistory.length - 1} left)`,
      `Reverted: ${lastEntry.label}`
    );
  };

  // Split Task into 2 Tasks
  const handleSplitTask = ({ originalTask, part1Title, part1PlannedDays, part2Title, part2PlannedDays, part2AssigneeId }) => {
    if (currentUser.role !== 'manager' || !canEditTask(originalTask)) {
      pushToast('error', 'Permission Denied', 'You do not have permission to split this task.');
      return;
    }

    const p1Days = Math.max(0.5, Number(part1PlannedDays) || 1);
    const p2Days = Math.max(0.5, Number(part2PlannedDays) || 1);

    const p1Start = originalTask.start_date ? snapToWorkingDay(originalTask.start_date, 1) : TODAY_CAIRO;
    const p1Due = addTaskDays(originalTask, p1Start, p1Days);
    const p2Start = snapToTaskWorkingDay(originalTask, addCalendarDays(p1Due, 1));
    const p2Due = addTaskDays(originalTask, p2Start, p2Days);

    const updatedPart1 = {
      ...originalTask,
      title: part1Title.trim() || `${originalTask.title} (Part 1)`,
      planned_days: p1Days,
      actual_days: Math.min(originalTask.actual_days || 0, p1Days),
      start_date: p1Start,
      due_date: p1Due,
      updated_at: new Date().toISOString(),
    };

    const newPart2 = {
      ...originalTask,
      id: `task-${Date.now()}`,
      title: part2Title.trim() || `${originalTask.title} (Part 2)`,
      assignee_id: part2AssigneeId || originalTask.assignee_id,
      planned_days: p2Days,
      actual_days: 0,
      blocked_days: 0,
      depends_on_id: updatedPart1.id, // Wire Part 2 to depend on Part 1
      start_date: p2Start,
      due_date: p2Due,
      status: 'backlog',
      blocked_reason: '',
      completed_at: null,
      position: (originalTask.position || 1) + 1,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === originalTask.id);
      if (idx === -1) return [...prev, newPart2];
      const copy = [...prev];
      copy[idx] = updatedPart1;
      copy.splice(idx + 1, 0, newPart2);
      return copy;
    });

    setActivityLog((prev) => [
      {
        id: `act-${Date.now()}`,
        task_id: originalTask.id,
        actor_id: currentUser.id,
        action: 'task_split',
        field: 'title',
        old_value: originalTask.title,
        new_value: `Split into "${updatedPart1.title}" (${p1Days}d) & dependent "${newPart2.title}" (${p2Days}d)`,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setSplitTaskModalTarget(null);
    pushToast('success', 'Task Split & Linked', `Created "${newPart2.title}" wired to start after Part 1.`);
  };

  // Add Comment
  const handleAddComment = (taskId, bodyText) => {
    if (currentUser.role === 'viewer') return;
    if (!bodyText.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newComment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      author_id: currentUser.id,
      body: bodyText.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);

    const otherCommenterIds = new Set(
      comments.filter((c) => c.task_id === taskId).map((c) => c.author_id)
    );
    if (task.assignee_id) otherCommenterIds.add(task.assignee_id);
    otherCommenterIds.delete(currentUser.id);

    const recipients = Array.from(otherCommenterIds)
      .map((id) => userMap[id])
      .filter(Boolean);

    const dispatched = NotificationEngine.dispatch({
      eventType: 'comment',
      task,
      actor: currentUser,
      recipients,
      title: `New Comment on "${task.title}"`,
      body: `${currentUser.name}: "${bodyText.trim()}"`,
      existingNotifications: notifications,
    });

    if (dispatched.created.length > 0) {
      setNotifications((prev) => [...dispatched.created, ...prev]);
    }
    if (dispatched.emailLogs.length > 0) {
      setEmailOutbox((prev) => [...dispatched.emailLogs, ...prev]);
    }
  };

  const handleSendManualReminder = (task) => {
    if (currentUser.role !== 'manager') {
      pushToast('error', 'Managers Only', 'Only managers can trigger immediate task reminders.');
      return;
    }
    const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
    if (!assignee) {
      pushToast('error', 'Unassigned Task', 'Assign this task to a team member before sending a reminder.');
      return;
    }

    const dispatched = NotificationEngine.dispatch({
      eventType: 'manual_reminder',
      task,
      actor: currentUser,
      recipients: [assignee],
      title: `Reminder from ${currentUser.name}: ${task.title}`,
      body: `Please update progress and actual days on "${task.title}" (Due: ${task.due_date || 'Unscheduled'}).`,
      existingNotifications: notifications,
    });

    setNotifications((prev) => [...dispatched.created, ...prev]);
  };

  const handleExportCSV = () => {
    const headers = [
      'Task ID',
      'Product Line',
      'Project',
      'Task Title',
      'Assignee',
      'Priority',
      'Criticality',
      'Weight',
      'Status',
      'Start Date',
      'Due Date',
      'Planned Days',
      'Actual Days',
      'Blocked Days',
      'Depends On',
      'Overdue',
      'Blocked Reason',
      'Source Sheet',
      'Source Row',
    ];
    const rows = filteredTasks.map((t) => {
      const proj = projectMap[t.project_id];
      const pl = proj ? productLineMap[proj.product_line_id] : null;
      const assignee = t.assignee_id ? userMap[t.assignee_id]?.name || '' : 'Unassigned';
      const depTask = t.depends_on_id ? taskMap[t.depends_on_id]?.title || t.depends_on_id : '';
      return [
        t.id,
        pl?.name || '',
        proj?.name || '',
        t.title || '',
        assignee,
        t.priority ? `P${t.priority}` : '',
        CRITICALITY_META[t.criticality || 'medium']?.label || 'Medium',
        t.weight ?? 5,
        t.status,
        t.start_date || '',
        t.due_date || '',
        t.planned_days ?? 0,
        t.actual_days ?? 0,
        t.blocked_days ?? 0,
        depTask,
        isTaskOverdue(t) ? 'YES' : 'NO',
        t.blocked_reason || '',
        t.source_sheet || '',
        t.source_row || '',
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication_tasks_export_${TODAY_CAIRO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('success', 'CSV Exported', `Exported ${filteredTasks.length} filtered tasks to CSV.`);
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => n.user_id === currentUser.id && !n.read_at),
    [notifications, currentUser.id]
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className={`workspace-shell ${activeTab==='gantt' && ganttExpanded ? 'gantt-expanded' : ''} h-screen overflow-hidden bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors`}>
        {/* ==================================================================== */}
        {/* TOP NAVIGATION BAR */}
        {/* ==================================================================== */}
        <header className="workspace-header shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-stone-200 dark:border-slate-800 px-3 lg:px-6 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Brand & Main Navigation Tabs */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                      CommTeam Task Manager
                    </h1>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hidden md:inline">
                      Cairo · Weekend hours optional
                    </span>
                  </div>

                </div>
              </div>

              {/* Mobile menu toggle or compact nav */}
              <nav aria-label="Workspace navigation" className="hidden md:flex items-center gap-1 bg-stone-100 dark:bg-slate-800/90 p-1 rounded-xl overflow-x-auto max-w-full">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Activity },
                  { id: 'gantt', label: 'Gantt', icon: Calendar },
                  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
                  { id: 'team', label: 'Team', icon: Users },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden xs:inline sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
              {undoHistory.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                  title="Undo last action (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo ({undoHistory.length})</span>
                </button>
              )}

              {currentUser.role === 'manager' && <><button
                onClick={() => setCreateHierarchyModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-xs transition-colors shrink-0"
                title="Create Project or Product"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="md:hidden">Project</span><span className="hidden md:inline">Create Project/Product</span>
              </button>

              <button
                onClick={() => {
                  setNewTaskDefaultStatus('backlog');
                  setNewTaskModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors shrink-0"
                title="New Task (N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button></>}

              <div className="hidden md:flex items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 px-3 py-1.5 text-xs">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span>{currentUser.name} · {currentUser.role}</span>
                <button type="button" onClick={onSignOut} className="font-semibold text-indigo-600 hover:underline">Sign out</button>
              </div>

              {/* Notifications Bell */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative p-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-slate-700 dark:text-slate-200 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="notification-popover absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-stone-200 dark:border-slate-800 p-4 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-semibold text-sm">Notifications ({currentUser.name})</h3>
                        <p className="text-[11px] text-slate-500">Workspace updates</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((n) =>
                              n.user_id === currentUser.id ? { ...n, read_at: new Date().toISOString() } : n
                            )
                          )
                        }
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-stone-100 dark:divide-slate-800 my-2">
                      {notifications
                        .filter((n) => n.user_id === currentUser.id)
                        .slice(0, 12)
                        .map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.task_id) setSelectedTaskId(n.task_id);
                              setNotifications((prev) =>
                                prev.map((item) =>
                                  item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
                                )
                              );
                              setNotifOpen(false);
                            }}
                            className={`py-2.5 px-2 rounded-lg cursor-pointer transition-colors ${
                              !n.read_at
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                                : 'hover:bg-stone-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100">
                              <span>{n.title}</span>
                              {!n.read_at && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{n.body}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className="p-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* SHARED KPI STRIP & FILTER TOOLBAR */}
        {/* ==================================================================== */}
        {shared && workspace.status && <div role="status" className="shrink-0 px-3 py-1 text-xs bg-indigo-50 text-indigo-900">
          {workspace.status}
          {workspace.failed && <><button className="ml-3 underline" onClick={workspace.retrySave}>Retry save</button><button className="ml-3 underline" onClick={workspace.reload}>Reload shared copy</button></>}
        </div>}
        {activeTab === 'gantt' && <div className="flex flex-wrap gap-2 px-3 pt-2 text-xs shrink-0">
          <button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2" aria-expanded={ganttControls} onClick={()=>setGanttControls(!ganttControls)}>{ganttControls ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}{ganttControls?'Hide':'Show'} Gantt controls</button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2" aria-pressed={ganttExpanded} onClick={()=>{setGanttExpanded(!ganttExpanded);setGanttControls(ganttExpanded);}}>{ganttExpanded ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}{ganttExpanded?'Exit expanded view':'Expand Gantt'}</button>
        </div>}
        {workspace.ready && (activeTab === 'kanban' || (activeTab === 'gantt' && ganttControls)) && (
          <div className="workspace-filters shrink-0 px-3 lg:px-6 pt-2 space-y-2">
            {/* 6-Card KPI Strip */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
              {kpiStats.map((k) => (
                <div
                  key={k.id}
                  onClick={() => {
                    if (k.id === 'overdue') setOverdueOnly((prev) => !prev);
                    else if (k.id === 'total') clearAllFilters();
                    else {
                      setSelectedStatuses((prev) =>
                        prev.includes(k.id) ? prev.filter((s) => s !== k.id) : [k.id]
                      );
                    }
                  }}
                  className={`px-2.5 py-1.5 sm:py-2 rounded-xl border-l-4 ${k.color} ${k.bg} bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:scale-[1.01] transition-transform flex items-center justify-between`}
                >
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      {k.label}
                    </span>
                    <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {k.count}
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800 hidden xs:inline">
                    {k.pct}%
                  </span>
                </div>
              ))}
            </div>

            <button aria-expanded={mobileFiltersOpen} onClick={()=>setMobileFiltersOpen(!mobileFiltersOpen)} className="md:hidden w-full flex items-center justify-between bg-white dark:bg-slate-900 border rounded-lg px-3 py-2 text-sm"><span className="flex items-center gap-2"><Filter size={16}/>Search & filters</span>{mobileFiltersOpen?'Hide':'Show'}</button>
            {/* Persistent Filter Toolbar */}
            <div className={`${mobileFiltersOpen ? 'flex' : 'hidden'} md:flex mobile-filter-toolbar bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-stone-200 dark:border-slate-800 shadow-xs flex-wrap items-center justify-between gap-2`}>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1">
                {/* Search Box */}
                <div className="relative min-w-[150px] sm:min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks, products, projects or IDs (/)"
                    className="w-full pl-8 pr-3 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Assignee Filter */}
                <select
                  aria-label="Filter by assignee"
                  value={myTasksOnly ? 'my-tasks' : selectedAssignees[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMyTasksOnly(value === 'my-tasks');
                    setSelectedAssignees(value && value !== 'my-tasks' ? [value] : []);
                  }}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="">All Assignees</option>
                  <option value="my-tasks">My Tasks</option>
                  <option value="unassigned">Unassigned</option>
                  {users
                    .filter((u) => u.is_active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                </select>

                {/* Project Filter */}
                <select
                  value={selectedProductLines[0] || ''}
                  onChange={(e) => {
                    setSelectedProductLines(e.target.value ? [e.target.value] : []);
                    setSelectedProjects([]);
                  }}
                  aria-label="Filter by project"
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="">All Projects</option>
                  {productLines.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>

                {/* Product Filter: limited to the selected project group */}
                <select
                  value={selectedProjects[0] || ''}
                  onChange={(e) => setSelectedProjects(e.target.value ? [e.target.value] : [])}
                  aria-label="Filter by product"
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium max-w-[190px]"
                >
                  <option value="">All Products</option>
                  {projects
                    .filter((project) => !project.archived && (!selectedProductLines.length || selectedProductLines.includes(project.product_line_id)))
                    .map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={selectedPriorities[0] || ''}
                  onChange={(e) => setSelectedPriorities(e.target.value ? [Number(e.target.value)] : [])}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium hidden md:inline-block"
                >
                  <option value="">Priority</option>
                  <option value="1">P1</option>
                  <option value="2">P2</option>
                  <option value="3">P3</option>
                  <option value="4">P4</option>
                </select>

                <select value={selectedCriticalities[0] || ''}
                  onChange={(e) => setSelectedCriticalities(e.target.value ? [e.target.value] : [])}
                  aria-label="Filter by criticality"
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium">
                  <option value="">Criticality</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatuses[0] || ''}
                  onChange={(e) => setSelectedStatuses(e.target.value ? [e.target.value] : [])}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-xs font-medium"
                >
                  <option value="">Status</option>
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>

                {/* Overdue Only Toggle */}
                <button
                  onClick={() => setOverdueOnly((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    overdueOnly
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                  title="Shortcut: O"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Overdue Only</span>
                </button>

                {/* My Tasks Toggle */}
                <button
                  onClick={() => setMyTasksOnly((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    myTasksOnly
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                  }`}
                  title="Shortcut: M"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Tasks</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearAllFilters}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MAIN VIEWPORT CONTENT */}
        {/* ==================================================================== */}
        <main className="workspace-main flex-1 min-h-0 px-3 lg:px-6 py-2 overflow-hidden flex flex-col">
          {!workspace.ready ? <p role="status" className="p-5">Loading the shared workspace�</p> : <>
          {shared && !projects.length && activeTab === 'dashboard' && <p className="mb-2 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            {account.role === 'manager' ? 'Create a project and a product to start saving shared tasks.' : 'Your shared workspace is empty. Tasks will appear here once a manager adds them.'}
          </p>}
          {activeTab === 'dashboard' && <Dashboard tasks={tasks} projects={projects} users={users} currentUser={currentUser} onSelectTask={setSelectedTaskId} onOpenGantt={()=>setActiveTab('gantt')} itemNumber={itemNumber}/>}
          {activeTab === 'gantt' && (
            <GanttView
              controlsVisible={ganttControls || ganttExpanded}
              productLines={productLines}
              projects={projects}
              tasks={filteredTasks}
              allTasks={tasks}
              userMap={userMap}
              taskMap={taskMap}
              users={users}
              zoom={ganttZoom}
              setZoom={setGanttZoom}
              zoomScale={zoomScale}
              setZoomScale={setZoomScale}
              collapsedGroups={collapsedGroups}
              setCollapsedGroups={setCollapsedGroups}
              checkedTasks={checkedTasks}
              setCheckedTasks={setCheckedTasks}
              onBulkStatusChange={currentUser.role === 'viewer' ? null : updateSelectedStatus}
              canEditTask={canEditTask}
              canResize={currentUser.role === 'manager'}
              showEmptyGroups={!searchQuery.trim() && !myTasksOnly && !overdueOnly && !selectedAssignees.length && !selectedProductLines.length && !selectedProjects.length && !selectedPriorities.length && !selectedCriticalities.length && !selectedStatuses.length}
              onExpandAll={expandAllGanttGroups}
              expandLabel={ganttExpandLabel}
              onCollapseAll={collapseAllGanttGroups}
              collapseLabel={ganttCollapseLabel}
              onSelectTask={(taskId) => setSelectedTaskId(taskId)}
              onEditProject={currentUser.role === 'manager' ? (pl) => setEditingProject({ id: pl.id, name: pl.name, description: pl.description || '' }) : null}
              onEditProduct={currentUser.role === 'manager' ? (product) => setEditingProduct({ id: product.id, name: product.name, description: product.description || '', assignee_ids: product.assignee_ids || [] }) : null}
              onUpdateTask={updateTask}
              onRequestSplitTask={(task) => { if (currentUser.role === 'manager') setSplitTaskModalTarget(task); }}
              pushToast={pushToast}
            />
          )}

          {activeTab === 'kanban' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <KanbanView
                tasks={filteredTasks}
                projectMap={projectMap}
                productLineMap={productLineMap}
                userMap={userMap}
                taskMap={taskMap}
                comments={comments}
                onSelectTask={(taskId) => setSelectedTaskId(taskId)}
                onRequestStatusChange={requestStatusChange}
                onUpdateTask={updateTask}
                onRequestSplitTask={(task) => { if (currentUser.role === 'manager') setSplitTaskModalTarget(task); }}
                onQuickAddTask={(status, title) => {
                  if (currentUser.role !== 'manager') return;
                  const firstProj = projects.find((p) => !p.archived && !productLineMap[p.product_line_id]?.archived);
                  if (!firstProj) { pushToast('error', 'Create a product first', 'A task needs a product.'); return; }
                  const newTask = {
                    id: `task-${Date.now()}`,
                    project_id: firstProj.id,
                    title,
                    details: '',
                    assignee_id: firstProj.assignee_ids?.length === 1 ? firstProj.assignee_ids[0] : currentUser.id,
                    priority: 2,
                    criticality: 'medium',
                    weight: 10,
                    start_date: snapToTaskWorkingDay({}, TODAY_CAIRO),
                    due_date: addTaskDays({}, TODAY_CAIRO, 3),
                    planned_days: 3,
                    actual_days: 0,
                    blocked_days: 0,
                    depends_on_id: null,
                    status,
                    blocked_reason: status === 'blocked' ? 'Pending hardware review' : '',
                    approved_by: '',
                    time_spent_note: '',
                    position: tasks.length + 1,
                    created_by: currentUser.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed_at: status === 'done' ? new Date().toISOString() : null,
                  };
                  setTasks((prev) => [newTask, ...prev]);
                  pushToast('success', 'Task Created', `Added "${title}" to ${STATUS_META[status].label}.`);
                }}
              />
            </div>
          )}

          {activeTab === 'team' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <TeamWorkloadView
                users={users}
                tasks={tasks}
                onSelectMember={(userId) => {
                  clearAllFilters();
                  setSelectedAssignees([userId]);
                  setActiveTab('gantt');
                  pushToast('info', 'Filtered to Member', `Showing Gantt timeline for ${userMap[userId]?.name}.`);
                }}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-scroll flex-1 overflow-y-auto pr-1">
              <AccountSettings account={currentUser} onUpdated={patch=>setUsers(previous=>previous.map(user=>user.id===currentUser.id?{...user,...patch}:user))} onSignOut={onSignOut}/><EmailPreferences userId={currentUser.id}/>{currentUser.role === 'manager' && <SettingsView
                currentUser={currentUser}
                productLines={productLines}
                setProductLines={setProductLines}
                projects={projects}
                setProjects={setProjects}
                users={users}
                setUsers={setUsers}
                tasks={tasks}
                dryRunReport={dryRunReport}
                setDryRunReport={setDryRunReport}
                onOpenDryRunModal={() => setDryRunModalOpen(true)}
                onExportCSV={handleExportCSV}
                emailOutbox={emailOutbox}
                pushToast={pushToast}
              />}
            </div>
          )}
          </>}
        </main>
        <nav aria-label="Mobile workspace navigation" className="mobile-bottom-nav md:hidden grid grid-cols-5 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {[{id:'dashboard',label:'Overview',icon:Activity},{id:'gantt',label:'Gantt',icon:Calendar},{id:'kanban',label:'Board',icon:LayoutGrid},{id:'team',label:'Team',icon:Users},{id:'settings',label:'Settings',icon:Settings}].map(({id,label,icon:Icon})=><button key={id} aria-current={activeTab===id?'page':undefined} onClick={()=>setActiveTab(id)} className={'flex flex-col gap-1 items-center justify-center py-2 text-[11px] font-semibold '+(activeTab===id?'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50':'text-slate-500')}><Icon size={20}/>{label}</button>)}
        </nav>

        {/* ==================================================================== */}
        {editingProject && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit project">
          <form onSubmit={(event) => {
            event.preventDefault();
            const name = editingProject.name.trim();
            if (!name) return;
            setProductLines((previous) => previous.map((pl) => pl.id === editingProject.id ? { ...pl, name, description: editingProject.description.trim() } : pl));
            setEditingProject(null);
          }} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold">Edit project</h2>
            <label className="block text-sm font-medium">Name<input required value={editingProject.name} onChange={(event) => setEditingProject({ ...editingProject, name: event.target.value })} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
            <label className="block text-sm font-medium">Description<textarea value={editingProject.description} onChange={(event) => setEditingProject({ ...editingProject, description: event.target.value })} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" rows={3} /></label>
            <button type="button" className="text-rose-600 text-sm" onClick={() => {
              if (!window.confirm('Remove this project from active views? Its products and tasks will be retained.')) return;
              setProductLines(previous => previous.map(project => project.id === editingProject.id ? { ...project, archived: true } : project));
              setEditingProject(null);
            }}>Remove project</button>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingProject(null)} className="rounded-lg border px-3 py-2">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-white">Save project</button></div>
          </form>
        </div>}
        {editingProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit product">
          <form onSubmit={(event) => {
            event.preventDefault();
            const name = editingProduct.name.trim();
            if (!name) return;
            setProjects((previous) => previous.map((product) => product.id === editingProduct.id ? { ...product, name, description: editingProduct.description.trim(), assignee_ids: editingProduct.assignee_ids } : product));
            if (editingProduct.assignee_ids.length === 1) {
              const assignee = editingProduct.assignee_ids[0];
              setTasks(previous => previous.map(task => task.project_id === editingProduct.id && task.assignee_id !== assignee
                ? { ...task, assignee_id: assignee, updated_at: new Date().toISOString() } : task));
            }
            setEditingProduct(null);
          }} className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold">Edit product</h2>
            <label className="block text-sm font-medium">Name<input required value={editingProduct.name} onChange={(event) => setEditingProduct({ ...editingProduct, name: event.target.value })} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
            <label className="block text-sm font-medium">Description<textarea value={editingProduct.description} onChange={(event) => setEditingProduct({ ...editingProduct, description: event.target.value })} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" rows={3} /></label>
            <fieldset className="max-h-32 overflow-auto space-y-1"><legend className="text-sm font-medium">Product assignees</legend>
              {users.filter(user => user.is_active && user.role !== 'viewer').map(user => <label key={user.id} className="block text-sm"><input type="checkbox" className="mr-2" checked={editingProduct.assignee_ids.includes(user.id)} onChange={event => { const checked = event.target.checked; setEditingProduct(previous => ({ ...previous, assignee_ids: checked ? [...previous.assignee_ids, user.id] : previous.assignee_ids.filter(id => id !== user.id) })); }} />{user.name}</label>)}
            </fieldset>
            <button type="button" className="text-rose-600 text-sm" onClick={() => {
              if (!window.confirm('Remove this product from active views? Its tasks are retained and the product can be restored in Settings.')) return;
              setProjects(previous => previous.map(product => product.id === editingProduct.id ? { ...product, archived: true } : product));
              setEditingProduct(null);
            }}>Remove product</button>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingProduct(null)} className="rounded-lg border px-3 py-2">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-white">Save product</button></div>
          </form>
        </div>}
        {/* TASK SIDE PANEL (Fully Responsive Mobile Sheet Modal) */}
        {/* ==================================================================== */}
        {selectedTaskId && taskMap[selectedTaskId] && (
          <TaskSidePanel
            task={tasks.find((t) => t.id === selectedTaskId)}
            allTasks={tasks}
            productLines={productLines}
            projects={projects}
            projectMap={projectMap}
            productLineMap={productLineMap}
            users={users}
            userMap={userMap}
            taskMap={taskMap}
            currentUser={currentUser}
            canEdit={canEditTask(tasks.find((t) => t.id === selectedTaskId))}
            comments={comments.filter((c) => c.task_id === selectedTaskId)}
            logs={activityLog.filter((a) => a.task_id === selectedTaskId)}
            onClose={() => setSelectedTaskId(null)}
            onUpdateTask={updateTask}
            onRequestStatusChange={requestStatusChange}
            onRequestSplitTask={(t) => { if (currentUser.role === 'manager') setSplitTaskModalTarget(t); }}
            onAddComment={handleAddComment}
            onSendReminder={currentUser.role === 'viewer' ? undefined : handleSendManualReminder}
            onSelectOtherTask={(otherId) => setSelectedTaskId(otherId)}
            onDeleteTask={(taskId) => {
              if (currentUser.role !== 'manager') {
                pushToast('error', 'RLS Restricted', 'Only managers can delete tasks.');
                return;
              }
              setTasks((prev) => prev.filter((t) => t.id !== taskId));
              setSelectedTaskId(null);
              pushToast('info', 'Task Deleted', 'Task was permanently removed.');
            }}
          />
        )}

        {/* ==================================================================== */}
        {/* BLOCKED REASON + BLOCKED DAYS MODAL */}
        {/* ==================================================================== */}
        {blockedModalState && (
          <div
            onClick={() => setBlockedModalState(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Ban className="w-5 h-5" />
                <h3 className="font-bold text-lg">Blocked Reason</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Moving a task to <strong>Blocked</strong> requires a reason.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                    Blocked Reason (Required)
                  </label>
                  <textarea
                    rows={3}
                    autoFocus
                    value={blockedModalState.reason}
                    onChange={(e) => setBlockedModalState((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Waiting on customs clearance for STM32 MCU reel..."
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setBlockedModalState(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 dark:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!blockedModalState.reason.trim()) {
                      pushToast('error', 'Blocked Reason Required', 'Cannot move to Blocked with an empty reason.');
                      return;
                    }
                    updateTask(
                      blockedModalState.taskId,
                      {
                        status: 'blocked',
                        blocked_reason: blockedModalState.reason.trim(),
                      },
                      { allowUndo: true, actionLabel: `Task moved to Blocked` }
                    );
                    setBlockedModalState(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Confirm Blocked
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TRANSITION MODAL: BACKLOG -> IN PROGRESS (Requires Kickoff Note) */}
        {/* ==================================================================== */}
        {inProgressModalState && (
          <div
            onClick={() => setInProgressModalState(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-lg">Start Task (Backlog → In Progress)</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Please enter a kickoff note describing your initial plan or lab setup before moving this task to <strong>In Progress</strong>.
              </p>
              <textarea
                rows={3}
                autoFocus
                value={inProgressModalState.note}
                onChange={(e) => setInProgressModalState((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="e.g., Starting schematic review and setting up oscilloscope bench test..."
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setInProgressModalState(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 dark:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!inProgressModalState.note.trim()) {
                      pushToast('error', 'Note Required', 'Please add a short note when transitioning from Backlog to In Progress.');
                      return;
                    }
                    updateTask(
                      inProgressModalState.taskId,
                      { status: 'in_progress' },
                      { allowUndo: true, actionLabel: 'Task moved to In Progress' }
                    );
                    handleAddComment(
                      inProgressModalState.taskId,
                      `[Transition Backlog → In Progress]: ${inProgressModalState.note.trim()}`
                    );
                    setInProgressModalState(null);
                    pushToast('success', 'Task In Progress', 'Kickoff note logged and status updated.');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Start & Save Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TRANSITION MODAL: ANY -> DONE (Next Step + Link Another Item) */}
        {/* ==================================================================== */}
        {doneTransitionModalState && (
          <div
            onClick={() => setDoneTransitionModalState(null)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-lg">Complete Task & Choose Next Step</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Record the <strong>Actual Time (Days)</strong> taken (if different from Planned Days, a dotted comparison bar will appear on the Gantt) and choose the next workflow action.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Actual Time Spent (Working Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={doneTransitionModalState.actualDays}
                    onChange={(e) =>
                      setDoneTransitionModalState((prev) => ({ ...prev, actualDays: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Next Step Action</label>
                  <select
                    value={doneTransitionModalState.nextStepType}
                    onChange={(e) =>
                      setDoneTransitionModalState((prev) => ({ ...prev, nextStepType: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold"
                  >
                    <option disabled={currentUser.role !== 'manager'} value="send_review_copy">1. Send a copy to another person to review</option>
                    <option disabled={currentUser.role !== 'manager'} value="create_related_task">2. Create a related follow-up task</option>
                    <option disabled={currentUser.role !== 'manager'} value="link_existing_task">3. Link another existing task as dependent</option>
                    <option value="note_only">4. Log completion note only</option>
                  </select>
                </div>
              </div>

              {currentUser.role === 'manager' && doneTransitionModalState.nextStepType !== 'note_only' &&
                doneTransitionModalState.nextStepType !== 'link_existing_task' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 block mb-1">
                        {doneTransitionModalState.nextStepType === 'send_review_copy'
                          ? 'Select Reviewer (Receives New Review Copy Task)'
                          : 'Assign Related Task To'}
                      </label>
                      <select
                        value={doneTransitionModalState.reviewerId}
                        onChange={(e) =>
                          setDoneTransitionModalState((prev) => ({ ...prev, reviewerId: e.target.value }))
                        }
                        className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                      >
                        {users
                          .filter((u) => u.is_active)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 block mb-1">
                        New Task Title
                      </label>
                      <input
                        type="text"
                        value={doneTransitionModalState.followUpTitle}
                        onChange={(e) =>
                          setDoneTransitionModalState((prev) => ({ ...prev, followUpTitle: e.target.value }))
                        }
                        className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

              {doneTransitionModalState.nextStepType === 'link_existing_task' && (
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <label className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 block">
                    Select Existing Task to Link as Dependent (Starts after this task)
                  </label>
                  <select
                    value={doneTransitionModalState.linkedTaskId}
                    onChange={(e) =>
                      setDoneTransitionModalState((prev) => ({ ...prev, linkedTaskId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">— Choose a task to link —</option>
                    {tasks
                      .filter((t) => t.id !== doneTransitionModalState.taskId)
                      .slice(0, 60)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({STATUS_META[t.status]?.label})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Completion / Handover Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={doneTransitionModalState.note}
                  onChange={(e) =>
                    setDoneTransitionModalState((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Summarize findings or instructions for the next person..."
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 p-3 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDoneTransitionModalState(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-stone-100 dark:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const orig = tasks.find((t) => t.id === doneTransitionModalState.taskId);
                    if (!orig) return;
                    const actDays = Math.max(0.5, Number(doneTransitionModalState.actualDays) || orig.planned_days || 1);
                    if (!updateTask(
                      orig.id,
                      {
                        status: 'done',
                        actual_days: actDays,
                      },
                      { allowUndo: true, actionLabel: 'Task marked Done' }
                    )) return;

                    if (doneTransitionModalState.note.trim()) handleAddComment(
                      orig.id,
                      `[Transition → Done | Next Step: ${doneTransitionModalState.nextStepType}]: ${doneTransitionModalState.note.trim()}`
                    );

                    if (
                      doneTransitionModalState.nextStepType === 'send_review_copy' ||
                      doneTransitionModalState.nextStepType === 'create_related_task'
                    ) {
                      const nextStart = snapToWorkingDay(orig.due_date ? addCalendarDays(orig.due_date, 1) : TODAY_CAIRO, 1);
                      const nextDue = addTaskDays({}, nextStart, 2);
                      const followTask = {
                        ...orig,
                        id: `task-${Date.now()}`,
                        title:
                          doneTransitionModalState.followUpTitle.trim() ||
                          `${orig.title} — Review Copy`,
                        assignee_id: projectMap[orig.project_id]?.assignee_ids?.length === 1 ? projectMap[orig.project_id].assignee_ids[0] : doneTransitionModalState.reviewerId,
                        status: 'backlog',
                        planned_days: 2,
                        actual_days: 0,
                        blocked_days: 0,
                        depends_on_id: orig.id,
                        start_date: nextStart,
                        due_date: nextDue,
                        completed_at: null,
                        created_by: currentUser.id,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };
                      setTasks((prev) => [followTask, ...prev]);
                      pushToast(
                        'success',
                        'Done & Follow-Up Linked',
                        `Created dependent task "${followTask.title}" for ${userMap[doneTransitionModalState.reviewerId]?.name}.`
                      );
                    } else if (
                      doneTransitionModalState.nextStepType === 'link_existing_task' &&
                      doneTransitionModalState.linkedTaskId
                    ) {
                      setTasks((prev) =>
                        prev.map((t) =>
                          t.id === doneTransitionModalState.linkedTaskId
                            ? { ...t, depends_on_id: orig.id, updated_at: new Date().toISOString() }
                            : t
                        )
                      );
                      pushToast('success', 'Task Linked as Dependent', 'Wired selected task to depend on this completed task.');
                    } else {
                      pushToast('success', 'Task Marked Done', 'Completion note and actual days saved.');
                    }

                    setDoneTransitionModalState(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm Done & Execute Next Step
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CREATE PROJECT / PRODUCT MODAL */}
        {/* ==================================================================== */}
        {createHierarchyModalOpen && currentUser.role === 'manager' && (
          <CreateProjectProductModal
            productLines={productLines.filter(project => !project.archived)}
            onClose={() => setCreateHierarchyModalOpen(false)}
            onCreateProject={(projectName, initialProductName) => {
              const newPl = {
                id: crypto.randomUUID(),
                name: projectName,
                position: productLines.length + 1,
                created_at: new Date().toISOString(),
              };
              setProductLines((prev) => [...prev, newPl]);

              const prodName = initialProductName.trim() || `${projectName} Core Product`;
              const newProd = {
                id: crypto.randomUUID(),
                product_line_id: newPl.id,
                name: prodName,
                default_priority: 2,
                default_due_date: addDays(TODAY_CAIRO, 10),
                archived: false,
                created_at: new Date().toISOString(),
              };
              setProjects((prev) => [...prev, newProd]);
              setCreateHierarchyModalOpen(false);
              pushToast('success', 'Project & Product Created', `Created Project "${projectName}" with Product "${prodName}".`);
            }}
            onCreateProduct={(productLineId, productName, defaultPriority) => {
              const newProd = {
                id: crypto.randomUUID(),
                product_line_id: productLineId,
                name: productName,
                default_priority: Number(defaultPriority) || 2,
                default_due_date: addDays(TODAY_CAIRO, 10),
                archived: false,
                created_at: new Date().toISOString(),
              };
              setProjects((prev) => [...prev, newProd]);
              setCreateHierarchyModalOpen(false);
              const plName = productLineMap[productLineId]?.name || 'Project';
              pushToast('success', 'Product Added', `Added Product "${productName}" under Project "${plName}".`);
            }}
          />
        )}

        {/* ==================================================================== */}
        {/* NEW TASK MODAL (Planned Days, Weight 1-10, Dependency Link) */}
        {/* ==================================================================== */}
        {newTaskModalOpen && currentUser.role === 'manager' && (
          <NewTaskModal
            productLines={productLines.filter(project => !project.archived)}
            projects={projects.filter(product => !productLineMap[product.product_line_id]?.archived)}
            tasks={tasks}
            users={users}
            currentUser={currentUser}
            defaultStatus={newTaskDefaultStatus}
            onClose={() => setNewTaskModalOpen(false)}
            onCreate={(newTask) => {
              setTasks((prev) => [newTask, ...prev]);
              setNewTaskModalOpen(false);
              pushToast('success', 'Task Created', `"${newTask.title}" added.`);
            }}
          />
        )}

        {/* ==================================================================== */}
        {/* SPLIT TASK INTO 2 TASKS MODAL */}
        {/* ==================================================================== */}
        {splitTaskModalTarget && (
          <SplitTaskModal
            task={splitTaskModalTarget}
            users={users}
            onClose={() => setSplitTaskModalTarget(null)}
            onSplit={handleSplitTask}
          />
        )}

        {/* ==================================================================== */}
        {/* DRY-RUN EXCEL IMPORT REVIEW MODAL */}
        {/* ==================================================================== */}
        {dryRunModalOpen && (
          <DryRunImportModal
            report={dryRunReport}
            onClose={() => setDryRunModalOpen(false)}
            onConfirmImport={() => {
              setDryRunModalOpen(false);
              pushToast(
                'success',
                'Idempotent Import Confirmed',
                '175 tasks synced on (source_sheet, source_row). Friday & Saturday excluded from working days.'
              );
            }}
          />
        )}

        {/* ==================================================================== */}
        {/* KEYBOARD SHORTCUTS CHEAT SHEET MODAL (`?`) */}
        {/* ==================================================================== */}
        {shortcutModalOpen && (
          <div
            onClick={() => setShortcutModalOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Keyboard & Mouse Shortcuts</h3>
                <button onClick={() => setShortcutModalOpen(false)} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { key: 'Alt + Wheel', desc: 'Zoom the Gantt timeline horizontally' },
                  { key: 'Alt + Shift + Wheel', desc: 'Zoom Gantt rows vertically' },
                  { key: '+ / -', desc: 'Zoom Gantt timeline in / out via keyboard' },
                  { key: 'N', desc: 'Open New Task dialog' },
                  { key: 'P', desc: 'Open Create Project / Product dialog' },
                  { key: 'E / C', desc: 'Expand All / Collapse All Gantt groups' },
                  { key: 'G / K / W / S', desc: 'Switch to Gantt / Kanban / Workload / Settings' },
                  { key: 'O / M', desc: 'Toggle Overdue Only / My Tasks filter' },
                  { key: '/', desc: 'Focus free-text search box' },
                  { key: 'Esc', desc: 'Close open side panel or modal' },
                  { key: '?', desc: 'Show / hide this shortcuts cheat sheet' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
                    <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold bg-stone-100 dark:bg-slate-800 rounded-md border border-stone-300 dark:border-slate-700">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* UNDO TOAST FOR DRAG / STATUS ACTIONS */}
        {/* ==================================================================== */}
        {undoHistory.length > 0 && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700">
            <span className="text-sm font-medium">{undoHistory[undoHistory.length - 1].label}</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-xs font-bold"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo ({undoHistory.length})</span>
            </button>
            <button onClick={() => setUndoHistory([])} className="text-slate-400 hover:text-white" title="Clear Undo History">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* FLOATING TOAST STACK */}
        {/* ==================================================================== */}
        <div className="fixed bottom-24 md:bottom-5 right-3 left-3 md:left-auto md:right-5 z-50 space-y-2 max-w-sm md:w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-2xl shadow-lg border backdrop-blur-md flex items-start gap-3 transition-all ${
                t.type === 'error'
                  ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : t.type === 'success'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-white/95 dark:bg-slate-900/95 border-stone-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
              }`}
            >
              {t.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="font-bold">{t.title}</div>
                <div className="opacity-85 mt-0.5">{t.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 1. GANTT CHART VIEW (Fixed Column Clipping, Sticky Bottom Scrollbar, Alt+Wheel Zoom,
//    Period Filter by Week/Month/Quarter/Year/Custom, Editable Gantt Dependencies & Blocked Segment)
// ============================================================================
function GanttView({
  controlsVisible,
  productLines,
  projects,
  tasks,
  allTasks,
  userMap,
  taskMap,
  users,
  zoom,
  setZoom,
  zoomScale,
  setZoomScale,
  collapsedGroups,
  setCollapsedGroups,
  onExpandAll,
  expandLabel,
  checkedTasks, setCheckedTasks, onBulkStatusChange, canEditTask, canResize, showEmptyGroups,
  onCollapseAll,
  collapseLabel,
  onSelectTask,
  onEditProject,
  onEditProduct,
  onUpdateTask,
  onRequestSplitTask,
  pushToast,
}) {
  const [overlayMemberId, setOverlayMemberId] = useState('all');
  const [periodPreset, setPeriodPreset] = useState('month'); // 'week' | 'month' | 'quarter' | 'year' | 'custom'
  const currentYear = Number(TODAY_CAIRO.slice(0, 4));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = useMemo(() => {
    const years = new Set(Array.from({ length: 11 }, (_, index) => currentYear - 5 + index));
    for (const task of allTasks) {
      for (const date of [task.start_date, task.due_date]) {
        const year = Number(date?.slice(0, 4));
        if (Number.isInteger(year) && year >= 1000 && year <= 9999) years.add(year);
      }
    }
    years.add(selectedYear);
    return [...years].sort((a, b) => a - b);
  }, [allTasks, currentYear, selectedYear]);
  const [customStart, setCustomStart] = useState(TODAY_CAIRO.slice(0, 7) + '-01');
  const [customEnd, setCustomEnd] = useState(addCalendarDays(TODAY_CAIRO, 30));
  const [showDependencyArrows, setShowDependencyArrows] = useState(true);
  const [linkingFromTaskId, setLinkingFromTaskId] = useState(null);

  const ganttScrollRef = useRef(null);
  const gridPan = useRef(null);
  const startGridPan = (event) => {
    const scroll = ganttScrollRef.current;
    if (!scroll || event.pointerType !== 'mouse' || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gridPan.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: scroll.scrollLeft,
      top: scroll.scrollTop,
    };
  };
  const moveGridPan = (event) => {
    const pan = gridPan.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = pan.left + pan.x - event.clientX;
    event.currentTarget.scrollTop = pan.top + pan.y - event.clientY;
  };
  const stopGridPan = (event) => {
    if (gridPan.current?.pointerId === event.pointerId) gridPan.current = null;
  };
  const timelineScrollbarRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [rowZoom, setRowZoom] = useState(1);
  useEffect(() => {
    const element = ganttScrollRef.current;
    if (!element) return;

    const handleWheel = (event) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) return;
      const vertical = event.altKey && event.shiftKey;
      const wheel = event.deltaY || (vertical ? event.deltaX : 0);
      if (!wheel) return;
      event.preventDefault();
      if (vertical) {
        setRowZoom(scale => Math.max(0.7, Math.min(2, Number((scale + (wheel < 0 ? 0.1 : -0.1)).toFixed(2)))));
        return;
      }
      const delta = wheel < 0 ? 0.14 : -0.14;
      setZoomScale((scale) => Math.max(0.6, Math.min(2.2, Number((scale + delta).toFixed(2)))));
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [setZoomScale]);
  useEffect(() => {
    const element = ganttScrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportWidth(element.clientWidth));
    observer.observe(element);
    setViewportWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Interactive Drag / Resize State for Gantt Task Bars
  const [dragState, setDragState] = useState(null);

  // Period Window Calculation (By Week, By Month, By Quarter, By Year, Custom)
  const { timelineStart, totalDays } = useMemo(() => {
    const today = new Date(`${TODAY_CAIRO}T00:00:00Z`);
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const iso = (date) => date.toISOString().slice(0, 10);
    let start;
    let end;
    if (periodPreset === 'week') {
      const sundayOffset = today.getUTCDay();
      start = iso(new Date(Date.UTC(year, month, today.getUTCDate() - sundayOffset)));
      end = addCalendarDays(start, 6);
    } else if (periodPreset === 'month') {
      start = iso(new Date(Date.UTC(year, month, 1)));
      end = iso(new Date(Date.UTC(year, month + 1, 0)));
    } else if (periodPreset === 'quarter') {
      const quarterStart = Math.floor(month / 3) * 3;
      start = iso(new Date(Date.UTC(year, quarterStart, 1)));
      end = iso(new Date(Date.UTC(year, quarterStart + 3, 0)));
    } else if (periodPreset === 'year') {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
    } else {
      start = customStart || TODAY_CAIRO;
      end = customEnd && customEnd > start ? customEnd : addCalendarDays(start, 30);
    }
    return { timelineStart: start, totalDays: Math.max(7, Math.min(366, diffCalendarDays(start, end) + 1)) };
  }, [periodPreset, customStart, customEnd, selectedYear]);

  // Base cell width multiplied by zoomScale (Enlarged cells & Doubled Task Card Height!)
  const baseWidth = zoom === 'day' ? 50 : zoom === 'week' ? 34 : 18;
  const dayWidth = Math.max(14, Math.round(baseWidth * zoomScale), (viewportWidth - 370) / totalDays);
  const dependentCounts = useMemo(() => {
    const counts = {};
    allTasks.forEach((task) => {
      if (task.dependencies_enabled !== false && task.depends_on_id && taskMap[task.depends_on_id]?.dependencies_enabled !== false) counts[task.depends_on_id] = (counts[task.depends_on_id] || 0) + 1;
    });
    return counts;
  }, [allTasks, taskMap]);
  const rowHeight = Math.round(68 * rowZoom);
  const draggedTask = useRef(null);
  const [bulkStatus, setBulkStatus] = useState('done');
  const [bulkReason, setBulkReason] = useState('');
  const groupRowHeight = Math.round(32 * rowZoom);
  const [compactTimeline, setCompactTimeline] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [timelineOptionsOpen, setTimelineOptionsOpen] = useState(false);
  useEffect(() => {const query=window.matchMedia('(max-width: 767px)');const update=()=>setCompactTimeline(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const leftColWidth = compactTimeline ? 158 : 370;

  const daysArray = useMemo(() => {
    const arr = [];
    const base = new Date(timelineStart + 'T00:00:00Z');
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getUTCDay();
      arr.push({
        iso,
        dayNum: d.getUTCDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
        monthIndex: d.getUTCMonth(),
        monthStart: d.getUTCDate() === 1,
        weekdayShort: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isWeekend: dow === 5 || dow === 6,
        isFirstOfMonth: d.getUTCDate() === 1,
      });
    }
    return arr;
  }, [timelineStart, totalDays]);

  const monthGroups = useMemo(() => {
    const groups = [];
    daysArray.forEach((day) => {
      const key = day.iso.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.days += 1;
      else groups.push({ key, days: 1, monthIndex: day.monthIndex,
        label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
    });
    return groups;
  }, [daysArray]);

  const scrollToDate = (isoDate) => {
    if (!ganttScrollRef.current) return;
    const offsetIdx = diffCalendarDays(timelineStart, isoDate);
    if (offsetIdx >= 0 && offsetIdx <= totalDays) {
      const targetLeft = Math.max(0, offsetIdx * dayWidth - 220);
      ganttScrollRef.current.scrollLeft = targetLeft;
    }
  };

  useEffect(() => {
    scrollToDate(periodPreset === 'custom' || (periodPreset === 'year' && selectedYear !== currentYear) ? timelineStart : TODAY_CAIRO);
  }, [periodPreset, timelineStart]);

  // Mouse move / up listener for dragging or resizing Gantt bars
  useEffect(() => {
    if (!dragState) return;
    const handleMove = (e) => {
      const deltaPx = e.clientX - dragState.startX;
      const deltaCalendarDays = Math.round(deltaPx / dayWidth);
      if (deltaCalendarDays !== dragState.deltaDays) {
        setDragState((prev) => (prev ? { ...prev, deltaDays: deltaCalendarDays } : null));
      }
    };
    const handleUp = () => {
      if (dragState && dragState.deltaDays !== 0) {
        draggedTask.current = dragState.taskId;
        setTimeout(() => { if (draggedTask.current === dragState.taskId) draggedTask.current = null; }, 0);
        const t = taskMap[dragState.taskId];
        if (t) {
          if (dragState.mode === 'move') {
            const rawNewStart = addCalendarDays(dragState.origStart, dragState.deltaDays);
            const snappedStart = snapToTaskWorkingDay(t, rawNewStart);
            onUpdateTask(
              t.id,
              { start_date: snappedStart },
              { allowUndo: true, actionLabel: `Moved "${t.title.slice(0, 24)}..."` }
            );
          } else if (dragState.mode === 'resize_right') {
            const newPlanned = Math.max(0.5, Number(dragState.origPlanned) + dragState.deltaDays);
            onUpdateTask(
              t.id,
              { planned_days: newPlanned },
              { allowUndo: true, actionLabel: `Adjusted Planned Time to ${newPlanned}d` }
            );
          } else if (dragState.mode === 'resize_left') {
            const rawNewStart = addCalendarDays(dragState.origStart, dragState.deltaDays);
            const snappedStart = snapToTaskWorkingDay(t, rawNewStart);
            const newPlanned = taskDaysBetween(t, snappedStart, dragState.origDue);
            onUpdateTask(
              t.id,
              { start_date: snappedStart, planned_days: newPlanned },
              { allowUndo: true, actionLabel: `Adjusted Start & Planned Time (${newPlanned}d)` }
            );
          }
        }
      }
      setDragState(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, dayWidth, taskMap]);
  // Daily Person Capacity Overlay Calculation (Per Assignee & All Assignees Combined)
  const dailyOverlayData = useMemo(() => {
    const mapByDay = {};
    daysArray.forEach((d) => {
      mapByDay[d.iso] = { byUser: {}, maxLoad: 0, maxUserId: null, totalAllLoad: 0 };
    });

    allTasks.forEach((t) => {
      if (!t.start_date || !t.due_date || !t.assignee_id || t.status === 'done') return;
      const w = Number(t.weight) || 5;
      const endIso = getEffectiveEndDate(t) || t.due_date;
      daysArray.forEach((d) => {
        if (d.isWeekend && !taskHoursOnDate(t, d.iso)) return;
        if (d.iso >= t.start_date && d.iso <= endIso) {
          const cell = mapByDay[d.iso];
          if (!cell.byUser[t.assignee_id]) {
            cell.byUser[t.assignee_id] = { totalWeight: 0, tasks: [] };
          }
          cell.byUser[t.assignee_id].totalWeight += w;
          cell.byUser[t.assignee_id].tasks.push({ id: t.id, title: t.title, weight: w });
          cell.totalAllLoad += w;
        }
      });
    });

    daysArray.forEach((d) => {
      const cell = mapByDay[d.iso];
      Object.entries(cell.byUser).forEach(([uid, info]) => {
        if (info.totalWeight > cell.maxLoad) {
          cell.maxLoad = info.totalWeight;
          cell.maxUserId = uid;
        }
      });
    });

    return mapByDay;
  }, [allTasks, daysArray]);

  // Keep undated tasks in the hierarchy so they can be scheduled from Gantt.
  const groupedHierarchy = useMemo(() => {

    const groups = productLines
      .map((pl) => {
        const plProjects = projects
          .filter((p) => p.product_line_id === pl.id && !p.archived)
          .map((proj) => {
            const projTasks = tasks
              .filter((t) => t.project_id === proj.id)
              .sort((a, b) => a.position - b.position);
            return { ...proj, tasks: projTasks };
          })
          .filter((proj) => showEmptyGroups || proj.tasks.length > 0);

        const totalTasksInPl = plProjects.reduce((acc, p) => acc + p.tasks.length, 0);
        return { ...pl, projects: plProjects, totalTasks: totalTasksInPl };
      })
      .filter((pl) => !pl.archived && (showEmptyGroups || pl.totalTasks > 0));

    return groups;
  }, [productLines, projects, tasks, showEmptyGroups]);

  // Flatten visible rows for SVG dependency wire coordinates
  const visibleTaskRows = useMemo(() => {
    const rows = [];
    groupedHierarchy.forEach((pl) => {
      const plKey = `pl-${pl.id}`;
      rows.push({ type: 'pl', id: plKey });
      if (!collapsedGroups[plKey]) {
        pl.projects.forEach((proj) => {
          const projKey = `proj-${proj.id}`;
          rows.push({ type: 'proj', id: projKey });
          if (!collapsedGroups[projKey]) {
            proj.tasks.forEach((t) => {
              rows.push({ type: 'task', id: t.id, task: t });
            });
          }
        });
      }
    });
    return rows;
  }, [groupedHierarchy, collapsedGroups]);

  const rowOffsets = [];
  let timelineRowsHeight = 0;
  visibleTaskRows.forEach((row) => {
    rowOffsets.push(timelineRowsHeight);
    timelineRowsHeight += row.type === 'task' ? rowHeight : groupRowHeight;
  });

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getBarCoordinates = (task) => {
    let startIso = task.start_date;
    let plannedEnd = getPlannedEndDate(task);

    if (dragState?.taskId === task.id && dragState.deltaDays !== 0) {
      const { mode, origStart, origDue, origPlanned, deltaDays } = dragState;
      if (mode === 'move' || mode === 'resize_left') {
        startIso = snapToTaskWorkingDay(task, addCalendarDays(origStart, deltaDays));
      }
      let plannedDays = Number(origPlanned);
      if (mode === 'resize_right') plannedDays = Math.max(0.5, plannedDays + deltaDays);
      if (mode === 'resize_left') plannedDays = taskDaysBetween(task, startIso, origDue);
      plannedEnd = addTaskDays(task, startIso, plannedDays) || plannedEnd;
    }

    const endIso = getBlockedEndDate(task, plannedEnd);
    const leftPx = diffCalendarDays(timelineStart, startIso) * dayWidth;
    const span = Math.max(1, diffCalendarDays(startIso, endIso) + 1);
    const widthPx = span * dayWidth;
    const blockedWidthPx = Math.max(0, diffCalendarDays(plannedEnd, endIso) * dayWidth);
    return { leftPx, widthPx, startIso, plannedEnd, endIso, blockedWidthPx };
  };

  const todayOffsetDays = diffCalendarDays(timelineStart, TODAY_CAIRO);
  const todayLeftPx = todayOffsetDays * dayWidth + dayWidth / 2;

  // Compute SVG Dependency Wires between visible tasks (Strictly Inside Timeline Area so NO overlap with left column!)
  const dependencyPaths = useMemo(() => {
    if (!showDependencyArrows) return [];
    const indexMap = {};
    visibleTaskRows.forEach((r, idx) => {
      if (r.type === 'task') indexMap[r.id] = idx;
    });

    const wires = [];
    visibleTaskRows.forEach((r, targetRowIdx) => {
      if (r.type !== 'task') return;
      const t = r.task;
      if (t.dependencies_enabled === false || !t.depends_on_id || !t.start_date || !t.due_date) return;
      const sourceRowIdx = indexMap[t.depends_on_id];
      if (sourceRowIdx === undefined) return;
      const sourceTask = taskMap[t.depends_on_id];
      if (!sourceTask?.start_date || !sourceTask?.due_date || sourceTask.dependencies_enabled === false) return;

      const srcCoords = getBarCoordinates(sourceTask);
      const tgtCoords = getBarCoordinates(t);

      // Coordinates relative to the right-side timeline track (0 = start of timeline track)
      const x1 = srcCoords.leftPx + srcCoords.widthPx;
      const y1 = rowOffsets[sourceRowIdx] + rowHeight / 2;
      const x2 = tgtCoords.leftPx;
      const y2 = rowOffsets[targetRowIdx] + rowHeight / 2;

      if (x1 < -100 && x2 < -100) return;

      const midX = x1 + Math.max(14, (x2 - x1) / 2);
      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
      const labelX = (x1 + x2) / 2;
      const labelY = (y1 + y2) / 2;
      wires.push({
        id: `${sourceTask.id}->${t.id}`,
        childTaskId: t.id,
        parentTaskId: sourceTask.id,
        d,
        x2,
        y2,
        labelX,
        labelY,
      });
    });
    return wires;
  }, [visibleTaskRows, showDependencyArrows, dayWidth, timelineStart, dragState, taskMap, rowHeight, groupRowHeight]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
      {controlsVisible && <>
      <button aria-expanded={timelineOptionsOpen} onClick={()=>setTimelineOptionsOpen(!timelineOptionsOpen)} className="md:hidden shrink-0 flex justify-between border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"><span>Timeline options</span><span>{timelineOptionsOpen?'Hide':'Show'}</span></button>
      {/* Top Gantt Controls Bar: Expand/Collapse + Comprehensive Period Filter (Week, Month, Quarter, Year, Custom) + Alt+Wheel Zoom */}
      <div className={`${timelineOptionsOpen ? 'flex' : 'hidden'} md:flex gantt-options shrink-0 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-slate-800 shadow-sm flex-wrap items-center justify-between gap-2 text-xs`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onExpandAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
            title="Shortcut: E"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>{expandLabel}</span>
          </button>
          <button
            onClick={onCollapseAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
            title="Shortcut: C"
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{collapseLabel}</span>
          </button>
          {onBulkStatusChange && <button type="button" className="rounded-lg border px-2 py-1" onClick={() => setCheckedTasks(checkedTasks.length ? [] : tasks.filter(task => canEditTask(task)).map(task => task.id))}>{checkedTasks.length ? 'Clear selection' : 'Select all filtered tasks'}</button>}
          {onBulkStatusChange && checkedTasks.length > 0 && <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Status for selected tasks" value={bulkStatus} onChange={event => setBulkStatus(event.target.value)} className="rounded-lg border px-2 py-1 dark:bg-slate-900">
              {Object.entries(STATUS_META).map(([status, meta]) => <option key={status} value={status}>{meta.label}</option>)}
            </select>
            {bulkStatus === 'blocked' && <input aria-label="Blocked reason for selected tasks" placeholder="Blocked reason" value={bulkReason}
              onChange={event => setBulkReason(event.target.value)} className="rounded-lg border px-2 py-1 dark:bg-slate-900" />}
            <button type="button" className="rounded-lg bg-indigo-600 text-white px-2 py-1 disabled:opacity-50"
              disabled={bulkStatus === 'blocked' && !bulkReason.trim()}
              onClick={() => onBulkStatusChange(checkedTasks, bulkStatus, bulkReason.trim())}>Apply to {checkedTasks.length} selected</button>
          </div>}


          <button
            onClick={() => {
              if (periodPreset === 'year' && selectedYear !== currentYear) setSelectedYear(currentYear);
              else scrollToDate(TODAY_CAIRO);
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
          >
            Jump to Today
          </button>

          {/* Period Filter Buttons: By Week, By Month, By Quarter, By Year, Custom */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-slate-800 p-1 rounded-lg border border-stone-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 ml-1" />
            <span className="text-[11px] font-bold text-slate-500 px-1">Period:</span>
            {[
              { id: 'week', label: 'By Week' },
              { id: 'month', label: 'By Month' },
              { id: 'quarter', label: 'By Quarter' },
              { id: 'year', label: periodPreset === 'year' ? 'By Year' : `By Year (${selectedYear})` },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodPreset(p.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  periodPreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            {periodPreset === 'year' && (
              <select aria-label="Gantt year" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}
                className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-stone-300 dark:border-slate-700">
                {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            )}
            {periodPreset === 'custom' && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-stone-300 dark:border-slate-700"
                />
                <span>→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] border border-stone-300 dark:border-slate-700"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setShowDependencyArrows((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
              showDependencyArrows
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-stone-100 dark:bg-slate-800 text-slate-500 border-transparent'
            }`}
            title="Drag the ● handle on the right of any bar onto another bar to link them, or click × on a wire to unlink"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Dependencies (Drag ● to Link)</span>
          </button>
        </div>

        {/* Right Controls: Daily Member Capacity Overlay + Alt+MouseWheel Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <Gauge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-indigo-900 dark:text-indigo-200 text-[11px]">Daily Weight:</span>
            <select
              value={overlayMemberId}
              onChange={(e) => setOverlayMemberId(e.target.value)}
              className="bg-transparent font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="all" className="bg-white dark:bg-slate-900">
                All Assignees (Sum / 10 + Per Assignee)
              </option>
              <option value="peak" className="bg-white dark:bg-slate-900">
                Peak Assignee / Day (/10)
              </option>
              {users
                .filter((u) => u.is_active)
                .map((u) => (
                  <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900">
                    {u.name} (Weight / 10)
                  </option>
                ))}
            </select>
          </div>

          <span className="text-[10px] text-slate-500" title="Hold Alt + Shift and scroll over the Gantt">Rows {Math.round(rowZoom * 100)}% (Alt+Shift+Wheel)</span>
          {/* Zoom Slider + Alt+Wheel Indicator */}
          <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            <button
              onClick={() => setZoomScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
              className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700"
              title="Zoom Out (- or Alt+Wheel)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.6"
              max="2.2"
              step="0.05"
              value={zoomScale}
              onChange={(e) => setZoomScale(Number(e.target.value))}
              className="w-16 accent-indigo-600 cursor-pointer"
              title="Hold Alt + Mouse Wheel on the Gantt to zoom smoothly"
            />
            <button
              onClick={() => setZoomScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
              className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-slate-700"
              title="Zoom In (+ or Alt+Wheel)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 min-w-[68px] text-right">
              {Math.round(zoomScale * 100)}% (Alt+Wheel)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 dark:bg-slate-800 p-1 rounded-lg">
            {['day', 'week', 'month'].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2 py-0.5 rounded-md font-semibold capitalize transition-colors text-[11px] ${
                  zoom === z
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      </>}
      {/* Timeline */}
      {/* Main Gantt Card with Alt+Wheel Zoom, Clipped Timeline Column (No Overlap!), & Native Scroll */}
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col"
      >
        <div
          ref={ganttScrollRef}
          onPointerMove={moveGridPan}
          onPointerUp={stopGridPan}
          onPointerCancel={stopGridPan}
          onLostPointerCapture={stopGridPan}
          onScroll={(event) => {
            if (timelineScrollbarRef.current && timelineScrollbarRef.current.scrollLeft !== event.currentTarget.scrollLeft)
              timelineScrollbarRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          className="gantt-main-scroll overflow-x-auto overflow-y-auto flex-1 min-h-0 relative select-none"
        >
          <div
            className="min-w-max"
            style={{ width: `${leftColWidth + totalDays * dayWidth}px` }}
          >
            {/* STICKY HEADER ROW 1: DATES (Month Initials + Day Number) */}
            <div className="flex sticky top-0 z-40 bg-stone-100 dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 shadow-xs h-16">
              <div
                style={{ width: `${leftColWidth}px` }}
                className="shrink-0 sticky left-0 z-50 bg-stone-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 border-r-2 border-stone-300 dark:border-slate-700 flex items-center justify-between shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
              >
                <span>Tasks</span>
                <span className="hidden md:inline text-[10px] normal-case tracking-normal font-medium text-slate-500 dark:text-slate-400 max-w-[230px] text-right">
                  Dashed: actual duration · Striped: blocked time
                </span>
              </div>
              <div className="flex flex-col relative">
                <div className="flex h-5">
                  {monthGroups.map((group) => <div key={group.key} data-month={group.monthIndex}
                    style={{ width: `${group.days * dayWidth}px` }}
                    className="gantt-month-band shrink-0 text-center text-[10px] font-bold border-r border-white/50 dark:border-slate-700">
                    {group.label}
                  </div>)}
                </div>
                <div className="flex h-11">
                {daysArray.map((d) => {
                  const isToday = d.iso === TODAY_CAIRO;
                  return (
                    <div
                      key={d.iso}
                      data-month={d.monthIndex}
                      data-month-start={d.monthStart}
                      data-today={isToday}
                      data-weekend={d.isWeekend}
                      style={{ width: `${dayWidth}px` }}
                      className={`gantt-month-day shrink-0 border-r border-stone-200/60 dark:border-slate-700/50 flex flex-col items-center justify-center leading-tight ${
                        isToday
                          ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 font-bold'
                          : d.isWeekend
                          ? 'bg-stone-200/70 dark:bg-slate-950/80 text-stone-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold">{d.dayNum}</span>
                      <span className="text-[9px]">{d.weekdayShort}</span>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* STICKY HEADER ROW 2: DAILY PERSON WEIGHT OVERLAY (Per Assignee & All Assignees / 10) */}
            <div className="flex sticky top-16 z-40 bg-indigo-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-indigo-200/80 dark:border-slate-700 h-8">
              <div
                style={{ width: `${leftColWidth}px` }}
                className="shrink-0 sticky left-0 z-50 bg-indigo-50 dark:bg-slate-900 px-4 text-[11px] font-bold text-indigo-900 dark:text-indigo-300 border-r-2 border-stone-300 dark:border-slate-700 flex items-center justify-between shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
              >
                <span>
                  {compactTimeline ? 'Daily weight / 10' : <>Daily Weight (
                  {overlayMemberId === 'all'
                    ? 'All Assignees / 10'
                    : overlayMemberId === 'peak'
                    ? 'Peak Assignee / 10'
                    : `${userMap[overlayMemberId]?.name} / 10`}
                  )</>}
                </span>
                <span className="hidden md:inline text-[10px] font-normal text-slate-500">Hover breakdown</span>
              </div>
              <div className="flex relative">
                {daysArray.map((d) => {
                  if (d.isWeekend && !dailyOverlayData[d.iso]?.totalAllLoad) {
                    return (
                      <div
                        key={d.iso}
                        style={{ width: `${dayWidth}px` }}
                        className="shrink-0 border-r border-stone-200/40 dark:border-slate-800 bg-stone-200/50 dark:bg-slate-950/60 flex items-center justify-center text-[9px] text-slate-400"
                      >
                        Off
                      </div>
                    );
                  }

                  const dayCell = dailyOverlayData[d.iso];
                  let load = 0;
                  let tooltipText = '';

                  if (overlayMemberId === 'all') {
                    load = dayCell?.totalAllLoad || 0;
                    const perUserLines = Object.entries(dayCell?.byUser || {}).map(([uid, info]) => {
                      const uName = userMap[uid]?.name || uid;
                      return `• ${uName}: ${info.totalWeight}/10 (${info.tasks.length} tasks)`;
                    });
                    tooltipText =
                      load > 0
                        ? `${d.iso} — Total Team Weight: ${load}/10\nPer Assignee Breakdown:\n${perUserLines.join('\n')}`
                        : `${d.iso}: 0/10 weight`;
                  } else if (overlayMemberId === 'peak') {
                    load = dayCell?.maxLoad || 0;
                    const uid = dayCell?.maxUserId;
                    const memberLabel = uid ? userMap[uid]?.name || '' : '';
                    const tasksForTooltip = uid ? dayCell.byUser[uid]?.tasks || [] : [];
                    tooltipText =
                      load > 0
                        ? `${d.iso} — Peak (${memberLabel}): ${load}/10\n` +
                          tasksForTooltip.map((t) => `• ${t.title} (W${t.weight})`).join('\n')
                        : `${d.iso}: 0/10 weight`;
                  } else {
                    const uInfo = dayCell?.byUser?.[overlayMemberId];
                    load = uInfo?.totalWeight || 0;
                    const memberLabel = userMap[overlayMemberId]?.name || '';
                    const tasksForTooltip = uInfo?.tasks || [];
                    tooltipText =
                      load > 0
                        ? `${d.iso} — ${memberLabel}: ${load}/10\n` +
                          tasksForTooltip.map((t) => `• ${t.title} (W${t.weight})`).join('\n')
                        : `${d.iso} — ${memberLabel}: 0/10`;
                  }

                  const overloaded = load > DAILY_PERSON_MAX_WEIGHT;
                  const nearCap = load >= 8 && load <= DAILY_PERSON_MAX_WEIGHT;

                  return (
                    <div
                      key={d.iso}
                      style={{ width: `${dayWidth}px` }}
                      title={tooltipText}
                      tabIndex={overloaded ? 0 : undefined}
                      aria-label={tooltipText}
                      className={`shrink-0 border-r border-indigo-200/40 dark:border-slate-800 flex items-center justify-center text-[10px] font-extrabold transition-colors ${
                        overloaded
                          ? 'bg-rose-600 text-white'
                          : nearCap
                          ? 'bg-amber-400/90 text-slate-950'
                          : load > 0
                          ? 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    >
                      {load > 0 ? (dayWidth >= 28 ? `${load}/10` : load) : '·'}
                      {overloaded && dayWidth >= 24 && <small className="text-[8px] ml-0.5" title={tooltipText}>{userMap[overlayMemberId === 'all' || overlayMemberId === 'peak' ? dayCell?.maxUserId : overlayMemberId]?.initials}</small>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GANTT BODY ROWS */}
            <div className="relative divide-y divide-[#e8e8e7] dark:divide-[#2c3a54]">
              {/* Vertical Red Dashed Today Line (Offset inside timeline track) */}
              {todayOffsetDays >= 0 && todayOffsetDays <= totalDays && (
                <div
                  style={{ left: `${leftColWidth + todayLeftPx}px` }}
                  className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-rose-500 z-20 pointer-events-none"
                >
                  <span className="sticky top-20 -ml-7 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold uppercase shadow">
                    Today
                  </span>
                </div>
              )}

              {/* SVG Dependency Connector Wires Layer (Strictly positioned inside the right-side timeline track so it NEVER overlaps the left sticky column) */}
              {showDependencyArrows && dependencyPaths.length > 0 && (
                <div
                  style={{
                    left: `${leftColWidth}px`,
                    width: `${totalDays * dayWidth}px`,
                    height: `${timelineRowsHeight}px`,
                  }}
                  className="absolute top-0 overflow-hidden z-15 pointer-events-none"
                >
                  <svg
                    width={totalDays * dayWidth}
                    height={timelineRowsHeight}
                    className="overflow-hidden"
                  >
                    <defs>
                      <marker
                        id="dep-arrow"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
                      </marker>
                    </defs>
                    {dependencyPaths.map((w) => (
                      <g key={w.id}>
                        <path
                          d={w.d}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="1.8"
                          strokeDasharray="4 2"
                          markerEnd="url(#dep-arrow)"
                          opacity="0.85"
                        />
                        {/* Interactive Unlink (×) button right on the Gantt dependency wire */}
                        <g
                          transform={`translate(${w.labelX - 7}, ${w.labelY - 7})`}
                          className="pointer-events-auto cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateTask(
                              w.childTaskId,
                              { depends_on_id: null },
                              { allowUndo: true, actionLabel: 'Removed dependency link' }
                            );
                            pushToast('info', 'Dependency Unlinked', 'Removed dependency wire on the Gantt chart.');
                          }}
                        >
                          <circle cx="7" cy="7" r="7" fill="#ef4444" />
                          <text x="7" y="10" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                            ×
                          </text>
                        </g>
                      </g>
                    ))}
                  </svg>
                </div>
              )}

              {groupedHierarchy.length === 0 ? (
                <div className="py-16 text-center">
                  <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                  <p className="font-semibold text-base">No tasks match your active filters</p>
                </div>
              ) : (
                groupedHierarchy.map((pl) => {
                  const plKey = `pl-${pl.id}`;
                  const plCollapsed = !!collapsedGroups[plKey];

                  return (
                    <React.Fragment key={pl.id}>
                      {/* Project Header Row */}
                      <div
                        style={{ height: `${groupRowHeight}px` }}
                        onClick={() => toggleGroup(plKey)}
                        onContextMenu={(event) => { if (onEditProject) { event.preventDefault(); onEditProject(pl); } }}
                        title={onEditProject ? `${pl.description ? `${pl.description} - ` : ''}Right-click to edit project` : pl.description || undefined}
                        className="flex items-center bg-stone-100/90 dark:bg-slate-800/80 cursor-pointer hover:bg-stone-200/60 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div
                          style={{ width: `${leftColWidth}px`, height: `${groupRowHeight}px` }}
                          className="gantt-group-label sticky left-0 z-30 bg-stone-100 dark:bg-slate-800 px-4 flex items-center justify-between border-r-2 border-stone-300 dark:border-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-indigo-950 dark:text-indigo-200">
                            {plCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                              Project
                            </span>
                            <span>{pl.name} <small>{itemNumber(pl.id)}</small></span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            {pl.totalTasks} tasks
                          </span>
                        </div>
                        <div className="flex-1 h-full" />
                      </div>

                      {/* Product & Task Rows */}
                      {!plCollapsed &&
                        pl.projects.map((proj) => {
                          const projKey = `proj-${proj.id}`;
                          const projCollapsed = !!collapsedGroups[projKey];

                          return (
                            <React.Fragment key={proj.id}>
                              {/* Product Subheader */}
                              <div
                                style={{ height: `${groupRowHeight}px` }}
                                onClick={() => toggleGroup(projKey)}
                                onContextMenu={(event) => { if (onEditProduct) { event.preventDefault(); onEditProduct(proj); } }}
                                title={onEditProduct ? 'Right-click to edit product' : proj.description || undefined}
                                className="flex items-center bg-stone-50/90 dark:bg-slate-900/90 cursor-pointer hover:bg-stone-100 dark:hover:bg-slate-800/50"
                              >
                                <div
                                  style={{ width: `${leftColWidth}px`, height: `${groupRowHeight}px` }}
                                  className="gantt-group-label sticky left-0 z-30 bg-stone-50 dark:bg-slate-900 pl-7 pr-4 flex items-center justify-between border-r-2 border-stone-300 dark:border-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]"
                                >
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                    {projCollapsed ? (
                                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                                      Product
                                    </span>
                                    <span className="truncate">{proj.name} <small>{itemNumber(proj.id)}</small></span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">{proj.tasks.length} tasks</span>
                                </div>
                                <div className="flex-1 h-full" />
                              </div>

                              {/* Task Timeline Rows */}
                              {!projCollapsed &&
                                proj.tasks.map((task) => {
                                  const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
                                  const overdue = isTaskOverdue(task);
                                  const scheduled = Boolean(task.start_date && task.due_date);
                                  const { leftPx, widthPx, startIso, plannedEnd, endIso, blockedWidthPx } = scheduled
                                    ? getBarCoordinates(task)
                                    : { leftPx: 0, widthPx: 0 };
                                  const pMeta = PRIORITY_META[task.priority] || PRIORITY_META[3];
                                  const cMeta = CRITICALITY_META[task.criticality || 'medium'];
                                  const isDraggingThis = dragState && dragState.taskId === task.id;
                                  const depTask = task.dependencies_enabled !== false && task.depends_on_id ? taskMap[task.depends_on_id] : null;
                                  const dependentChildrenCount = dependentCounts[task.id] || 0;

                                  const showDottedActual =
                                    scheduled && task.status === 'done' &&
                                    Number(task.actual_days) > 0 &&
                                    Number(task.actual_days) !== Number(task.planned_days);
                                  const actualEndIso = showDottedActual
                                    ? addTaskDays(task, task.start_date, task.actual_days)
                                    : null;
                                  const actualSpanDays = actualEndIso
                                    ? Math.max(1, diffCalendarDays(task.start_date, actualEndIso) + 1)
                                    : 0;
                                  const actualWidthPx = actualSpanDays * dayWidth;

                                  const blockedDaysNum = Number(task.blocked_days) || 0;


                                  return (
                                    <div
                                      key={task.id}
                                      style={{ height: `${rowHeight}px` }}
                                      className="flex items-center hover:bg-indigo-50/25 dark:hover:bg-indigo-950/15 group"
                                    >
                                      {/* Left Sticky Column (Doubled Height for 2-Line Title & 2-Line Details) */}
                                      <div
                                        style={{ width: `${leftColWidth}px`, height: `${rowHeight}px` }}
                                        onClick={() => { if (task.start_date) { if (task.start_date < timelineStart || diffCalendarDays(timelineStart, task.start_date) >= totalDays) { setCustomStart(task.start_date); setCustomEnd(addCalendarDays(task.start_date, 30)); setPeriodPreset('custom'); } else scrollToDate(task.start_date); } }}
                                        onContextMenu={(event) => { event.preventDefault(); onSelectTask(task.id); }}
                                        title={itemNumber(task.id) + ' | Click to jump to the task bar; right-click to open'}
                                        className="gantt-task-label sticky left-0 z-30 bg-white dark:bg-slate-900 group-hover:bg-stone-50 dark:group-hover:bg-slate-800/95 pl-10 pr-3 py-2 flex items-center justify-between border-r-2 border-stone-300 dark:border-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] cursor-pointer"
                                      >
                                         {onBulkStatusChange && canEditTask(task) && <input type="checkbox" aria-label={'Select ' + task.title} className="mr-2" checked={checkedTasks.includes(task.id)} onClick={e=>e.stopPropagation()} onChange={e=>{const checked=e.target.checked;setCheckedTasks(previous=>checked ? [...previous, task.id] : previous.filter(id=>id!==task.id));}} />}
                                        <div className="min-w-0 flex-1 pr-2">
                                          <div className="text-xs text-slate-800 dark:text-slate-100 font-bold leading-snug line-clamp-2">
                                            {task.title} <small className="text-slate-500">{itemNumber(task.id)}</small>
                                          </div>
                                          {rowZoom >= 1 && <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                                            {task.details || 'No additional engineering details.'}
                                          </div>}
                                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                              {Number(task.planned_days) > 0 ? `Plan: ${task.planned_days}d` : 'Duration not set'}
                                            </span>
                                            {Number(task.actual_days) > 0 && (
                                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                · Actual: {task.actual_days}d
                                              </span>
                                            )}
                                            {blockedDaysNum > 0 && (
                                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                · ⏸ {blockedDaysNum}d blocked
                                              </span>
                                            )}
                                            {depTask && (
                                              <span
                                                className="text-slate-500 truncate max-w-[110px]"
                                                title={`Waits for: ${depTask.title}`}
                                              >
                                                · ⛓ {depTask.title.slice(0, 14)}..
                                              </span>
                                            )}
                                            {dependentChildrenCount > 0 && (
                                              <span className="text-amber-600 font-semibold">
                                                · →{dependentChildrenCount}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                            {task.weight ?? 5}/10
                                          </span>
                                          {assignee ? (
                                            <span
                                              title={`${assignee.name} (Task Weight: ${task.weight ?? 5}/10)`}
                                              className={`w-7 h-7 rounded-full ${assignee.color} text-white text-[10px] font-bold flex items-center justify-center`}
                                            >
                                              {assignee.initials}
                                            </span>
                                          ) : (
                                            <span className="w-7 h-7 rounded-full bg-stone-200 dark:bg-slate-700 text-slate-500 text-[10px] flex items-center justify-center">
                                              ?
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Timeline Track */}
                                      <div
                                        style={{ width: `${totalDays * dayWidth}px`, height: `${rowHeight}px` }}
                                        onPointerDown={startGridPan}
                                        className="relative overflow-hidden z-10 shrink-0 cursor-grab active:cursor-grabbing"
                                      >
                                        <div className="absolute inset-0 flex pointer-events-none">
                                          {daysArray.map((d) => (
                                            <div
                                              key={d.iso}
                                              style={{ width: `${dayWidth}px` }}
                                              className={`shrink-0 border-r border-[#e8e8e7] dark:border-slate-800/[0.87] ${
                                                d.isWeekend ? 'bg-stone-300/[0.62] dark:bg-black/[0.80]' : ''
                                              }`}
                                            />
                                          ))}
                                        </div>

                                        {!scheduled && (
                                          <button
                                            type="button"
                                            onClick={() => onSelectTask(task.id)}
                                            className="sticky left-3 top-1/2 z-20 -translate-y-1/2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
                                          >
                                            Unscheduled · Open task to set dates
                                          </button>
                                        )}
                                        {showDottedActual && (
                                          <div
                                            style={{
                                              left: `${leftPx}px`,
                                              width: `${actualWidthPx}px`,
                                            }}
                                            title={`Actual Time Taken: ${task.actual_days}d (Planned: ${task.planned_days}d)`}
                                            className={`absolute inset-y-0 border-2 border-dashed pointer-events-none z-20 flex items-end justify-end px-2 pb-1 ${
                                              Number(task.actual_days) > Number(task.planned_days)
                                                ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                                : 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                                            }`}
                                          >
                                            <span className="text-[9px] font-extrabold bg-white/90 dark:bg-slate-900/90 px-1 rounded">
                                              Actual: {task.actual_days}d
                                            </span>
                                          </div>
                                        )}

                                        {/* Full-cell Gantt task bar */}
                                        {scheduled && <div
                                          style={{
                                            left: `${leftPx}px`,
                                            width: `${widthPx}px`,
                                            ...getWeightBarStyle(task.status, task.weight ?? 5),
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDragState({
                                              taskId: task.id,
                                              mode: 'move',
                                              startX: e.clientX,
                                              origStart: task.start_date,
                                              origDue: getPlannedEndDate(task),
                                              origPlanned: task.planned_days || 1,
                                              deltaDays: 0,
                                            });
                                          }}
                                          onMouseUp={(e) => {
                                            if (linkingFromTaskId && linkingFromTaskId !== task.id) {
                                              if (task.dependencies_enabled === false || taskMap[linkingFromTaskId]?.dependencies_enabled === false) {
                                                setLinkingFromTaskId(null);
                                                pushToast('info', 'Dependencies disabled', 'Enable dependencies on both tasks before linking.');
                                                return;
                                              }
                                              e.stopPropagation();
                                              onUpdateTask(
                                                task.id,
                                                { depends_on_id: linkingFromTaskId },
                                                { allowUndo: true, actionLabel: 'Linked task dependency on Gantt' }
                                              );
                                              setLinkingFromTaskId(null);
                                              pushToast(
                                                'success',
                                                'Dependency Linked on Gantt',
                                                `"${task.title.slice(0, 26)}..." now waits for "${taskMap[linkingFromTaskId]?.title?.slice(0, 26)}...".`
                                              );
                                            }
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (draggedTask.current === task.id) { draggedTask.current = null; return; }
                                            if (!dragState || dragState.deltaDays === 0) {
                                              onSelectTask(task.id);
                                            }
                                          }}
                                          title={`#${itemNumber(task.id)} ${task.title}\nDetails: ${task.details || ''}\nWeight: ${task.weight ?? 5}/10 | Planned: ${task.planned_days ?? 1}d | Actual: ${task.actual_days ?? 0}d${
                                            blockedDaysNum > 0 ? ` | Blocked: ${blockedDaysNum}d` : ''
                                          }\nStart: ${startIso} → Planned end: ${plannedEnd}${blockedWidthPx > 0 ? `\nBlocked through: ${endIso}` : ''}`}
                                          className={`absolute inset-y-0 text-white flex flex-col justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing overflow-hidden ${
                                            isDraggingThis ? 'z-30 ring-2 ring-indigo-300 shadow-xl' : 'z-15 hover:brightness-105'
                                          } ${overdue ? 'ring-2 ring-inset ring-rose-500' : ''} ${
                                            linkingFromTaskId && linkingFromTaskId !== task.id
                                              ? 'ring-2 ring-amber-400'
                                              : ''
                                          }`}
                                        >
                                          <div
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              if (!canResize) return;
                                            setDragState({
                                                taskId: task.id,
                                                mode: 'resize_left',
                                                startX: e.clientX,
                                                origStart: task.start_date,
                                                origDue: getPlannedEndDate(task),
                                                origPlanned: task.planned_days || 1,
                                                deltaDays: 0,
                                              });
                                            }}
                                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-l-xl"
                                          />

                                          {blockedDaysNum > 0 && (
                                            <div
                                              style={{
                                                width: `${blockedWidthPx}px`,
                                                backgroundImage:
                                                  'repeating-linear-gradient(45deg, rgba(245,158,11,0.92), rgba(245,158,11,0.92) 6px, rgba(180,83,9,0.92) 6px, rgba(180,83,9,0.92) 12px)',
                                              }}
                                              className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-1.5 text-[9px] font-extrabold text-white border-l border-white/50 pointer-events-none"
                                            >
                                              <span>⏸ {blockedDaysNum}d</span>
                                            </div>
                                          )}

                                          {/* Top Row of Gantt Task Card: Badges & Actions */}
                                          <div className="flex items-center justify-between gap-1.5 min-w-0 relative z-10 overflow-hidden">
                                            <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-1">
                                              {assignee && (
                                                <span className="w-4 h-4 rounded-full bg-white/25 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                                  {assignee.initials}
                                                </span>
                                              )}
                                              <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-black/35 text-white shrink-0">
                                                {task.weight ?? 5}/10
                                              </span>
                                              {task.priority && (
                                                <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-white/90 text-slate-900 shrink-0">
                                                  {pMeta.label}
                                                </span>
                                              )}
                                              <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-black/35 text-white shrink-0 uppercase">
                                                {cMeta?.label}
                                              </span>
                                              <span className="text-[10px] font-bold shrink-0">{itemNumber(task.id)}</span>
                                              <span className="text-[11px] font-bold truncate">{task.title}</span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 max-w-full overflow-hidden">
                                              {widthPx >= 180 && <span className="text-[9px] font-bold bg-black/25 px-1.5 py-0.5 rounded shrink-0">
                                                Plan {task.planned_days ?? 1}d
                                              </span>}
                                              {overdue && (
                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white shadow-xs">
                                                  Overdue
                                                </span>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onRequestSplitTask(task);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 px-1 py-0.5 bg-black/35 hover:bg-black/60 rounded text-[9px]"
                                                title="Split Task into 2 Linked Tasks"
                                              >
                                                <Scissors className="w-2.5 h-2.5" />
                                              </button>
                                              <div
                                                onMouseDown={(e) => {
                                                  e.stopPropagation();
                                                  if (task.dependencies_enabled === false) {
                                                    pushToast('info', 'Dependencies disabled', 'Enable dependencies for this task before linking.');
                                                    return;
                                                  }
                                                  setLinkingFromTaskId(task.id);
                                                  pushToast(
                                                    'info',
                                                    'Drag to Target Task Bar',
                                                    `Release mouse over another task bar to make it depend on "${task.title.slice(0, 24)}...".`
                                                  );
                                                }}
                                                title="Drag ● and release on another task bar to link dependency"
                                                className="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow cursor-crosshair flex items-center justify-center"
                                              >
                                                <span className="w-1 h-1 rounded-full bg-white" />
                                              </div>
                                            </div>
                                          </div>

                                          {/* Bottom 2-Line Details Area inside the Doubled-Height Gantt Bar */}
                                          {rowZoom >= 0.9 && <div className="text-[10px] leading-tight text-white/95 line-clamp-2 relative z-10 pr-2 font-medium">
                                            {task.details || task.title}
                                          </div>}

                                          <div
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              if (!canResize) return;
                                            setDragState({
                                                taskId: task.id,
                                                mode: 'resize_right',
                                                startX: e.clientX,
                                                origStart: task.start_date,
                                                origDue: getPlannedEndDate(task),
                                                origPlanned: task.planned_days || 1,
                                                deltaDays: 0,
                                              });
                                            }}
                                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-r-xl"
                                          />
                                        </div>}
                                      </div>
                                    </div>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 border-t border-stone-200 dark:border-slate-700">
          <div style={{ width: `${leftColWidth}px` }} className="shrink-0 bg-stone-50 dark:bg-slate-900 border-r-2 border-stone-300 dark:border-slate-700" />
          <div ref={timelineScrollbarRef} onScroll={(event) => {
            if (ganttScrollRef.current && ganttScrollRef.current.scrollLeft !== event.currentTarget.scrollLeft)
              ganttScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }} className="timeline-scrollbar flex-1 overflow-x-auto overflow-y-hidden h-5">
            <div style={{ width: `${totalDays * dayWidth}px`, height: '1px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDraftField({ taskId, field, value, onCommit, multiline = false, className, disabled, rows }) {
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);
  useEffect(() => { if (document.activeElement !== inputRef.current) setDraft(value ?? ''); }, [taskId, value]);
  const props = { ref: inputRef, value: draft, disabled, className,
    onChange: (event) => setDraft(event.target.value),
    onBlur: () => { if (draft !== (value ?? '')) onCommit(taskId, { [field]: draft }); },
  };
  return multiline ? <textarea {...props} rows={rows} /> : <input {...props} type="text" />;
}

function TaskDraftNumber({ taskId, field, value, onCommit, disabled, className }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [taskId, value]);
  return <input type="number" min="0" max={field === 'planned_days' ? 3660 : field === 'extra_hours_per_day' ? 15.5 : 16} step="0.5" value={draft} disabled={disabled} className={className}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={() => { const next = Math.max(0, Math.min(field === 'planned_days' ? 3660 : field === 'extra_hours_per_day' ? 15.5 : 16, Number(draft) || 0)); if (next !== Number(value)) onCommit(taskId, { [field]: next }); setDraft(String(next)); }} />;
}

function TaskDraftRange({ task, onCommit, disabled }) {
  const [draft, setDraft] = useState(Number(task.weight) || 1);
  useEffect(() => setDraft(Number(task.weight) || 1), [task.id, task.weight]);
  const committed = useRef(Number(task.weight) || 1);
  useEffect(() => { committed.current = Number(task.weight) || 1; }, [task.id, task.weight]);
  const commit = () => { if (draft !== committed.current) { committed.current = draft; onCommit(task.id, { weight: draft }); } };
  return <input type="range" min="1" max="10" disabled={disabled} value={draft} onChange={(event) => setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} className="w-full accent-indigo-600 cursor-pointer" />;
}

// ============================================================================
// 2. TASK SIDE PANEL (Click-Outside Backdrop Close + Friendly Dependency Section
//    with Project -> Product -> Task Filter + Blocked Days Input)
// ============================================================================
function TaskSidePanel({
  task,
  allTasks,
  productLines,
  projects,
  projectMap,
  productLineMap,
  users,
  userMap,
  taskMap,
  currentUser,
  canEdit,
  comments,
  logs,
  onClose,
  onUpdateTask,
  onRequestStatusChange,
  onRequestSplitTask,
  onAddComment,
  onSendReminder,
  onSelectOtherTask,
  onDeleteTask,
}) {
  const [commentInput, setCommentInput] = useState('');
  const [showActivity, setShowActivity] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const backdropPointerDown = useRef(false);

  // Cascade Filters inside the Dependency Section (Project -> Product -> Task)
  const [depFilterPlId, setDepFilterPlId] = useState('');
  const [depFilterProjId, setDepFilterProjId] = useState(task?.project_id || '');
  useEffect(() => { setDepFilterPlId(projectMap[task?.project_id]?.product_line_id || ''); setDepFilterProjId(task?.project_id || ''); }, [task?.id, task?.project_id]);
  const [childDepToAdd, setChildDepToAdd] = useState('');

  if (!task) return null;

  const project = projectMap[task.project_id];
  const productLine = project ? productLineMap[project.product_line_id] : null;
  const overdue = isTaskOverdue(task);
  const prerequisiteTask = task.depends_on_id ? taskMap[task.depends_on_id] : null;
  const dependentChildren = allTasks.filter((t) => t.depends_on_id === task.id);
  const auditLabels = { dependencies_enabled: 'dependencies enabled', extra_hours_per_day: 'extra hours per regular day', friday_hours: 'Friday hours', saturday_hours: 'Saturday hours', assignee_id: 'assignee', details: 'notes', planned_days: 'planned time', actual_days: 'actual time', blocked_days: 'blocked time', blocked_reason: 'blocked reason', start_date: 'start date', due_date: 'end date', weight: 'daily weight', depends_on_id: 'prerequisite' };
  const auditValue = (field, value) => {
    if (field === 'assignee_id') return !value || value === 'none' ? 'Unassigned' : userMap[value]?.name || 'Former team member';
    if (field === 'depends_on_id') return !value || value === 'none' ? 'None' : taskMap[value]?.title || 'Former task';
    return value;
  };
  const visibleLogs = logs.reduce((result, entry) => {
    const previous = result[result.length - 1];
    if (previous && previous.actor_id === entry.actor_id && previous.field === entry.field &&
        Math.abs(new Date(previous.created_at) - new Date(entry.created_at)) < 10000) {
      previous.old_value = entry.old_value;
      previous.count = (previous.count || 1) + 1;
    } else result.push({ ...entry });
    return result;
  }, []);

  // Filtered candidate tasks for Dependency dropdowns based on Project & Product filter
  const filteredCandidateTasks = allTasks.filter((t) => {
    if (t.id === task.id) return false;
    const p = projectMap[t.project_id];
    if (!p) return false;
    if (depFilterPlId && p.product_line_id !== depFilterPlId) return false;
    if (depFilterProjId && t.project_id !== depFilterProjId) return false;
    return true;
  });

  return (
    <div
      onPointerDown={(event) => { backdropPointerDown.current = event.button === 0 && event.target === event.currentTarget; }}
      onPointerUp={(event) => { if (backdropPointerDown.current && event.target === event.currentTarget) onClose(); backdropPointerDown.current = false; }}
      className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs flex justify-end cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="task-detail-sheet w-full sm:w-[500px] bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-stone-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto cursor-default"
      >
        <div className="p-5 space-y-5">
          {/* 1. Header */}
          <div className="space-y-3 border-b border-stone-200 dark:border-slate-800 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_META[task.status].bg} ${STATUS_META[task.status].text} ${STATUS_META[task.status].border}`}>
                  {STATUS_META[task.status].label}
                </span>
                {overdue && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-600 text-white">
                    Overdue
                  </span>
                )}
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Weight {task.weight ?? 5}/10
                </span>
                {Number(task.blocked_days) > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    ⏸ {task.blocked_days}d Blocked
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-500"
                title="Close (Esc or Click Outside)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <span className="text-xs font-semibold text-slate-500">Task {itemNumber(task.id)}</span>
            <TaskDraftField key={`${task.id}:title`} taskId={task.id} field="title" value={task.title} onCommit={onUpdateTask} disabled={!canEdit}
              className="w-full font-bold text-lg text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none disabled:opacity-70" />

            {!canEdit && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  Read-only via RLS: Switch to <strong>Mohamed (Manager)</strong> or the assigned member to edit fields.
                </span>
              </div>
            )}
          </div>

          {/* 2. Core Fields */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2 p-2.5 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/70 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Hierarchy (Project → Product)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {productLine?.name} → {project?.name}
                </span>
              </div>
              <button
                disabled={!canEdit}
                onClick={() => onRequestSplitTask(task)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs shadow-xs"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Split Task</span>
              </button>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Status</label>
              <select
                disabled={!canEdit}
                value={task.status}
                onChange={(e) => onRequestStatusChange(task.id, e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Assignee</label>
              <select
                disabled={!canEdit || currentUser.role !== 'manager'}
                value={task.assignee_id || ''}
                onChange={(e) => onUpdateTask(task.id, { assignee_id: e.target.value || null })}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {users
                  .filter((u) => u.is_active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Priority (P1–P4)</label>
              <select
                disabled={!canEdit}
                value={task.priority || ''}
                onChange={(e) => onUpdateTask(task.id, { priority: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              >
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
                <option value="4">P4</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Criticality</label>
              <select
                disabled={!canEdit}
                value={task.criticality || 'medium'}
                onChange={(e) => onUpdateTask(task.id, { criticality: e.target.value })}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Task Weight Slider (1-10) */}
            <div className="col-span-2 p-3 rounded-xl bg-stone-50 dark:bg-slate-800/70 border border-stone-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-200">
                  Task Daily Weight (Color Intensity & Person Capacity / 10)
                </label>
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-extrabold text-xs">
                  {task.weight ?? 5} / 10
                </span>
              </div>
              <TaskDraftRange key={task.id} task={task} onCommit={onUpdateTask} disabled={!canEdit} />
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">
                Start Date (per task work schedule)
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={task.start_date || ''}
                onChange={(e) => onUpdateTask(task.id, { start_date: e.target.value || null })}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-slate-500 dark:text-slate-400 font-medium block mb-1">
                Planned End Date
              </label>
              <input
                type="date"
                disabled={!canEdit || currentUser.role !== 'manager'}
                min={task.start_date || undefined}
                value={getPlannedEndDate(task) || ''}
                onChange={(e) => onUpdateTask(task.id, { due_date: e.target.value || null })}
                className="w-full px-2.5 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold disabled:opacity-60"
              />
            </div>

            {/* Manager Planned Days vs Assignee Actual Days + Blocked Days */}
            <div className="col-span-2 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-indigo-900 dark:text-indigo-300 font-bold block mb-1 text-[11px]">
                  Planned Time (Days)
                </label>
                <TaskDraftNumber taskId={task.id} field="planned_days" value={task.planned_days ?? 0} onCommit={onUpdateTask}
                  disabled={currentUser.role !== 'manager'} className="w-full rounded-lg border p-2 bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="text-emerald-900 dark:text-emerald-300 font-bold block mb-1 text-[11px]">
                  Actual Time (Days)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  disabled={!canEdit}
                  value={task.actual_days ?? 0}
                  onChange={(e) =>
                    onUpdateTask(task.id, {
                      actual_days: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 font-bold text-emerald-700 dark:text-emerald-300 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-amber-900 dark:text-amber-300 font-bold block mb-1 text-[11px]">
                  Blocked Time (Days)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  disabled={!canEdit}
                  value={task.blocked_days ?? 0}
                  onChange={(e) =>
                    onUpdateTask(task.id, {
                      blocked_days: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 font-bold text-amber-700 dark:text-amber-300 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="col-span-2 rounded-xl border border-stone-200 dark:border-slate-700 p-3 space-y-2">
              <div className="font-bold text-xs">Work hours and overtime</div>
              <p className="text-[11px] text-slate-500">A regular workday is {STANDARD_DAY_HOURS} hours. Weekend hours are optional and count toward the planned duration.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ['extra_hours_per_day', 'Extra hours / regular day'],
                  ['friday_hours', 'Friday work hours'],
                  ['saturday_hours', 'Saturday work hours'],
                ].map(([field, label]) => <label key={field} className="text-[11px] font-semibold">{label}
                  <TaskDraftNumber key={`${task.id}:${field}`} taskId={task.id} field={field} value={task[field] || 0} onCommit={onUpdateTask} disabled={!canEdit} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-slate-900" />
                </label>)}
              </div>
            </div>

            <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={task.dependencies_enabled !== false} disabled={!canEdit}
                onChange={(event) => onUpdateTask(task.id, { dependencies_enabled: event.target.checked })}
                className="accent-indigo-600" />
              Enable task dependencies
            </label>
            {task.dependencies_enabled === false && <p className="col-span-2 text-[11px] text-slate-500">Existing links are kept, but they will not move dates until dependencies are enabled again.</p>}

            {/* FRIENDLY TASK DEPENDENCY SECTION WITH PROJECT -> PRODUCT -> TASK FILTER */}
            <details open className="col-span-2 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 space-y-4">
              <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer" title="Show or hide dependency controls. Existing links remain active.">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <GitBranch className="w-4 h-4 text-indigo-600" />
                  <span>Task dependencies</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Dates adjust automatically
                </span>
              </summary>
              <fieldset disabled={task.dependencies_enabled === false} className="space-y-4 disabled:opacity-50">

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose what must finish first and what follows this task.
              </p>

              {/* Step 1 & 2: Filter Candidate Tasks by Project & Product */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 dark:bg-slate-800 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Project
                  </label>
                  <select
                    value={depFilterPlId}
                    onChange={(e) => {
                      setDepFilterPlId(e.target.value);
                      setDepFilterProjId('');
                    }}
                    className="w-full min-w-0 h-10 px-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">All Projects ({productLines.length})</option>
                    {productLines.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Product
                  </label>
                  <select
                    value={depFilterProjId}
                    onChange={(e) => setDepFilterProjId(e.target.value)}
                    className="w-full min-w-0 h-10 px-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">All Products</option>
                    {projects
                      .filter((p) => !depFilterPlId || p.product_line_id === depFilterPlId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Step 3A: Wait for this task to finish first (Prerequisite) */}
              <div>
                <label className="text-slate-700 dark:text-slate-200 font-semibold block mb-2 text-xs">
                  Starts after
                </label>
                <div className="flex items-center gap-2">
                  <select
                    disabled={!canEdit}
                    value={task.depends_on_id || ''}
                    onChange={(e) => onUpdateTask(task.id, { depends_on_id: e.target.value || null })}
                    className="flex-1 min-w-0 h-10 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 font-semibold text-xs"
                  >
                    <option value="">None — starts independently</option>
                    {filteredCandidateTasks.map((other) => (
                      <option key={other.id} value={other.id}>
                        {other.title} ({STATUS_META[other.status]?.label}, Ends {other.due_date})
                      </option>
                    ))}
                  </select>
                  {prerequisiteTask && (
                    <button
                      onClick={() => onSelectOtherTask(prerequisiteTask.id)}
                      className="px-2 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold shrink-0"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3B: Tasks that will start after this task finishes */}
              <div>
                <label className="text-slate-700 dark:text-slate-200 font-semibold block mb-2 text-xs">
                  Next tasks ({dependentChildren.length})
                </label>
                {dependentChildren.length === 0 ? (
                  <p className="text-[11px] text-slate-500 mb-3">
                    No next tasks linked.
                  </p>
                ) : (
                  <div className="space-y-1 mb-2">
                    {dependentChildren.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-xs"
                      >
                        <button
                          onClick={() => onSelectOtherTask(child.id)}
                          className="text-left font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1"
                        >
                          → {child.title} (Starts {child.start_date})
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onUpdateTask(child.id, { depends_on_id: null })}
                            className="text-rose-500 hover:text-rose-700 ml-2 text-[11px] font-bold"
                          >
                            Unlink
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={childDepToAdd}
                      onChange={(e) => setChildDepToAdd(e.target.value)}
                      className="flex-1 min-w-0 h-10 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs"
                    >
                      <option value="">Choose a next task…</option>
                      {filteredCandidateTasks
                        .filter((t) => t.depends_on_id !== task.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!childDepToAdd) return;
                        onUpdateTask(childDepToAdd, { depends_on_id: task.id });
                        setChildDepToAdd('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                    >
                      Link Next Task
                    </button>
                  </div>
                )}
              </div>
              </fieldset>
            </details>

            {task.status === 'blocked' && (
              <div className="col-span-2">
                <label className="text-amber-600 dark:text-amber-400 font-bold block mb-1">
                  Blocked Reason (Required)
                </label>
                <TaskDraftField key={`${task.id}:blocked_reason`} taskId={task.id} field="blocked_reason" value={task.blocked_reason || ''} onCommit={onUpdateTask} disabled={!canEdit}
                  className="w-full px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium" />
              </div>
            )}
          </div>

          {/* 3. Details */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Engineering Specification & Notes
            </label>
            <TaskDraftField key={`${task.id}:details`} taskId={task.id} field="details" value={task.details || ''} onCommit={onUpdateTask} disabled={!canEdit} multiline rows={3}
              className="w-full rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-800 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60" />
          </div>

          {/* 4. Threaded Comments */}
          <div className="space-y-3 border-t border-stone-200 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Comments & Transition Notes ({comments.length})
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {comments.map((c) => {
                const author = userMap[c.author_id];
                return (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/60 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {author?.name || 'System Importer'}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.created_at.slice(0, 10)}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{c.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onAddComment(task.id, commentInput);
                    setCommentInput('');
                  }
                }}
                disabled={currentUser.role === 'viewer'}
                placeholder={currentUser.role === 'viewer' ? 'View only' : 'Write a comment on this task...'}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                disabled={currentUser.role === 'viewer'}
                onClick={() => {
                  onAddComment(task.id, commentInput);
                  setCommentInput('');
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5. Activity Log */}
          <div className="border-t border-stone-200 dark:border-slate-800 pt-3">
            <button
              onClick={() => setShowActivity((prev) => !prev)}
              className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <span>Activity Audit Log ({visibleLogs.length})</span>
              {showActivity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showActivity && (
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto text-[11px]">
                {visibleLogs.map((a) => (
                  <div key={a.id} className="p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {userMap[a.actor_id]?.name || 'System'}
                    </span>{' '}
                    changed <span className="font-semibold text-indigo-600 dark:text-indigo-400">{auditLabels[a.field] || a.field.replaceAll('_', ' ')}</span>:{' '}
                    <span className="line-through opacity-75">{auditValue(a.field, a.old_value)}</span> →{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{auditValue(a.field, a.new_value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Manager Actions Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/90 flex items-center justify-between gap-2">
          <button
            disabled={!onSendReminder} onClick={() => onSendReminder?.(task)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Send Reminder</span>
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Task</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDeleteTask(task.id)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 rounded-lg bg-stone-200 dark:bg-slate-800 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. KANBAN BOARD VIEW (Full Colored Cards + Sorting Feature + Motion Drag & Drop)
// ============================================================================
function KanbanView({
  tasks,
  projectMap,
  productLineMap,
  userMap,
  taskMap,
  comments,
  onSelectTask,
  onRequestStatusChange,
  onUpdateTask,
  onRequestSplitTask,
  onQuickAddTask,
}) {
  const columns = ['backlog', 'in_progress', 'blocked', 'done'];
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [quickAddInputs, setQuickAddInputs] = useState({
    backlog: '',
    in_progress: '',
    blocked: '',
    done: '',
  });
  const [sortBy, setSortBy] = useState('priority'); // 'position' | 'priority' | 'criticality' | 'due_date' | 'weight' | 'planned_days'

  const commentCounts = useMemo(() => {
    const map = {};
    comments.forEach((c) => {
      map[c.task_id] = (map[c.task_id] || 0) + 1;
    });
    return map;
  }, [comments]);

  const sortTasks = (list) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'priority') return (a.priority || 4) - (b.priority || 4);
      if (sortBy === 'criticality') {
        const rA = CRITICALITY_META[a.criticality || 'medium']?.rank || 3;
        const rB = CRITICALITY_META[b.criticality || 'medium']?.rank || 3;
        return rA - rB;
      }
      if (sortBy === 'due_date') {
        return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
      }
      if (sortBy === 'weight') {
        return (b.weight || 5) - (a.weight || 5);
      }
      if (sortBy === 'planned_days') {
        return (b.planned_days || 1) - (a.planned_days || 1);
      }
      return (a.position || 0) - (b.position || 0);
    });
  };

  return (
    <div className="space-y-3">
      {/* Kanban Sorting Bar */}
      <div className="kanban-toolbar bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-700 dark:text-slate-200">Sort Kanban Cards By:</span>
          {[
            { id: 'priority', label: 'Priority (P1 → P4)' },
            { id: 'criticality', label: 'Criticality (Critical → Low)' },
            { id: 'due_date', label: 'Due Date (Earliest)' },
            { id: 'weight', label: 'Weight (10 → 1)' },
            { id: 'planned_days', label: 'Planned Time (Days)' },
            { id: 'position', label: 'Manual Position' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                sortBy === opt.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400">
          Swipe columns on mobile; open a task to change its status. Drag cards to reorder on desktop
        </span>
      </div>

      {/* 4 Kanban Columns */}
      <div className="kanban-columns grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((colStatus) => {
          const colMeta = STATUS_META[colStatus];
          const colTasks = sortTasks(tasks.filter((t) => t.status === colStatus));
          const isOver = dragOverCol === colStatus;

          return (
            <div
              key={colStatus}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(colStatus);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                if (draggedTaskId) {
                  onRequestStatusChange(draggedTaskId, colStatus);
                  setDraggedTaskId(null);
                }
              }}
              className={`rounded-2xl p-3.5 border transition-all duration-200 flex flex-col max-h-[680px] ${
                isOver
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-400 ring-2 ring-indigo-400 scale-[1.01]'
                  : 'bg-stone-100/80 dark:bg-slate-900/70 border-stone-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colMeta.dot}`} />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{colMeta.label}</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs">
                  {colTasks.length}
                </span>
              </div>

              {/* Quick-Add Input */}
              <div className="mb-3 flex gap-1.5">
                <input
                  type="text"
                  value={quickAddInputs[colStatus]}
                  onChange={(e) =>
                    setQuickAddInputs((prev) => ({ ...prev, [colStatus]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickAddInputs[colStatus].trim()) {
                      onQuickAddTask(colStatus, quickAddInputs[colStatus].trim());
                      setQuickAddInputs((prev) => ({ ...prev, [colStatus]: '' }));
                    }
                  }}
                  placeholder="＋ Quick add task..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs border border-stone-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Cards Stack (Full Card Colored by Status & Priority/Overdue) */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {colTasks.map((task) => {
                  const proj = projectMap[task.project_id];
                  const pl = proj ? productLineMap[proj.product_line_id] : null;
                  const assignee = task.assignee_id ? userMap[task.assignee_id] : null;
                  const overdue = isTaskOverdue(task);
                  const pMeta = PRIORITY_META[task.priority] || PRIORITY_META[3];
                  const cMeta = CRITICALITY_META[task.criticality || 'medium'];
                  const cCount = commentCounts[task.id] || 0;
                  const depTask = task.dependencies_enabled !== false && task.depends_on_id ? taskMap[task.depends_on_id] : null;
                  const isBeingDragged = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      onDrop={(e) => {
                        e.stopPropagation();
                        if (draggedTaskId && draggedTaskId !== task.id) {
                          if (task.status !== colStatus) {
                            onRequestStatusChange(draggedTaskId, colStatus);
                          } else {
                            onUpdateTask(draggedTaskId, { position: task.position });
                          }
                          setDraggedTaskId(null);
                        }
                      }}
                      onClick={() => onSelectTask(task.id)}
                      className={`p-3.5 rounded-xl border shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 space-y-2 ${
                        colMeta.cardBg
                      } ${
                        overdue
                          ? 'ring-2 ring-rose-500 border-rose-400 dark:border-rose-700'
                          : ''
                      } ${
                        isBeingDragged ? 'opacity-50 scale-95 rotate-1' : 'hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 truncate max-w-[140px]">
                          {pl?.name} · {proj?.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900/80 text-white">
                            W{task.weight ?? 5}
                          </span>
                          {task.priority && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pMeta.badge}`}>
                              {pMeta.label}
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cMeta.badge}`}>
                            {cMeta.label}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        <span className="mr-1 text-xs text-slate-500">{itemNumber(task.id)}</span>{task.title}
                      </h4>

                      {depTask && (
                        <div className="text-[10px] text-indigo-800 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/70 px-2 py-1 rounded-lg flex items-center gap-1 truncate">
                          <GitBranch className="w-3 h-3 shrink-0" />
                          <span className="truncate">Waits for: {depTask.title}</span>
                        </div>
                      )}

                      {task.status === 'blocked' && task.blocked_reason && (
                        <div className="p-2 rounded-lg bg-amber-200/60 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200">
                          <strong>Blocked ({task.blocked_days || 1}d):</strong> {task.blocked_reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                            {getPlannedEndDate(task) ? formatShortDate(getPlannedEndDate(task)) : 'No date'}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-white/80 dark:bg-slate-800 font-bold text-[10px] text-indigo-700 dark:text-indigo-300">
                            Plan: {task.planned_days ?? 1}d
                          </span>
                          {Number(task.actual_days) > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 font-bold text-[10px] text-emerald-800 dark:text-emerald-300">
                              Act: {task.actual_days}d
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestSplitTask(task);
                            }}
                            className="p-1 rounded hover:bg-black/10 text-slate-600 dark:text-slate-300"
                            title="Split Task into 2 Tasks"
                          >
                            <Scissors className="w-3 h-3" />
                          </button>
                          {cCount > 0 && <span className="text-[10px] font-bold">💬 {cCount}</span>}
                          {assignee && (
                            <span
                              title={assignee.name}
                              className={`rounded-full px-2 py-1 ${assignee.color} text-white text-[10px] font-bold`}
                            >
                              {assignee.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 4. TEAM / WORKLOAD PAGE (Shows Daily Capacity 10 Weight & Planned/Actual Days)
// ============================================================================
function TeamWorkloadView({ users, tasks, onSelectMember }) {
  const activeMembers = users.filter((u) => u.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Team Workload & Daily Weight Capacity (Max 10 / Day)
          </h2>
          <p className="text-xs text-slate-500">
            Click any team member card to jump to the Gantt chart filtered to their assigned tasks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeMembers.map((member) => {
          const memberTasks = tasks.filter((t) => t.assignee_id === member.id);
          const total = memberTasks.length || 1;
          const backlog = memberTasks.filter((t) => t.status === 'backlog').length;
          const inProgress = memberTasks.filter((t) => t.status === 'in_progress').length;
          const blocked = memberTasks.filter((t) => t.status === 'blocked').length;
          const done = memberTasks.filter((t) => t.status === 'done').length;
          const openCount = backlog + inProgress + blocked;
          const overdueCount = memberTasks.filter((t) => isTaskOverdue(t)).length;

          const totalPlannedDays = memberTasks.reduce((acc, t) => acc + (Number(t.planned_days) || 0), 0);
          const totalActualDays = memberTasks.reduce((acc, t) => acc + (Number(t.actual_days) || 0), 0);

          const todayWeight = memberTasks
            .filter(
              (t) =>
                t.status !== 'done' &&
                t.start_date &&
                t.due_date &&
                t.start_date <= TODAY_CAIRO &&
                (getEffectiveEndDate(t) || t.due_date) >= TODAY_CAIRO
            )
            .reduce((acc, t) => acc + (Number(t.weight) || 5), 0);

          return (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-stone-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${member.color} text-white font-bold text-base flex items-center justify-center shadow-sm`}>
                    {member.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{member.name}</h3>
                    <p className="text-xs text-slate-500 capitalize">{member.role} · {member.email}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    todayWeight > DAILY_PERSON_MAX_WEIGHT
                      ? 'bg-rose-600 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  Today: {todayWeight}/10 W
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-800/70">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">{openCount}</div>
                  <div className="text-[11px] text-slate-500">Open</div>
                </div>
                <div className={`p-2.5 rounded-xl ${overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-stone-50 dark:bg-slate-800/70'}`}>
                  <div className="text-lg font-extrabold">{overdueCount}</div>
                  <div className="text-[11px]">Overdue</div>
                </div>
                <div className={`p-2.5 rounded-xl ${blocked > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-stone-50 dark:bg-slate-800/70'}`}>
                  <div className="text-lg font-extrabold">{blocked}</div>
                  <div className="text-[11px]">Blocked</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  <div className="text-lg font-extrabold">{done}</div>
                  <div className="text-[11px]">Done</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                  Planned: <strong>{totalPlannedDays}d</strong>
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Actual Logged: <strong>{totalActualDays}d</strong>
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100 dark:bg-slate-800">
                  <div style={{ width: `${(done / total) * 100}%` }} className="bg-emerald-500" />
                  <div style={{ width: `${(inProgress / total) * 100}%` }} className="bg-sky-500" />
                  <div style={{ width: `${(blocked / total) * 100}%` }} className="bg-amber-500" />
                  <div style={{ width: `${(backlog / total) * 100}%` }} className="bg-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 5. SETTINGS & IMPORT PAGE
// ============================================================================
function SettingsView({
  currentUser,
  productLines,
  setProductLines,
  projects,
  setProjects,
  users,
  setUsers,
  tasks,
  dryRunReport,
  onOpenDryRunModal,
  onExportCSV,
  emailOutbox,
  pushToast,
}) {
  const [subTab, setSubTab] = useState('import');
  const [newPlName, setNewPlName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');
  const [draggedPlId, setDraggedPlId] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-stone-200 dark:border-slate-800">
        {[
          { id: 'import', label: '1. Excel Import (17 Rules)', icon: FileSpreadsheet },
          { id: 'lines', label: '2. Projects & Products (Drag to Reorder)', icon: Layers },
          { id: 'users', label: '3. Users & Roles', icon: Users },
          { id: 'notifications', label: '4. Email delivery', icon: Mail },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                subTab === t.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'import' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold">Excel Workbook Importer (`Communication_TeaM_Test_updated.xlsx`)</h3>
              <p className="text-xs text-slate-500">
                Implements all 17 import rules + Friday & Saturday weekend exclusion + Planned/Actual Days.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenDryRunModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Eye className="w-4 h-4" />
                <span>Open Dry-Run Review Report (175 Tasks)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'lines' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base">Projects & Products Hierarchy</h3>
              <p className="text-xs text-slate-500">Drag any Project card to reorder its display position.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                placeholder="New Project name..."
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs"
              />
              <button
                onClick={() => {
                  if (!newPlName.trim()) return;
                  setProductLines((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), name: newPlName.trim(), position: prev.length + 1 },
                  ]);
                  setNewPlName('');
                  pushToast('success', 'Project Added', `Created Project "${newPlName.trim()}".`);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                + Add Project
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {productLines.map((pl) => {
              const plProjects = projects.filter((p) => p.product_line_id === pl.id);
              return (
                <div
                  key={pl.id}
                  draggable
                  onDragStart={() => setDraggedPlId(pl.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!draggedPlId || draggedPlId === pl.id) return;
                    setProductLines((prev) => {
                      const copy = [...prev];
                      const fromIdx = copy.findIndex((x) => x.id === draggedPlId);
                      const toIdx = copy.findIndex((x) => x.id === pl.id);
                      const [moved] = copy.splice(fromIdx, 1);
                      copy.splice(toIdx, 0, moved);
                      return copy;
                    });
                    setDraggedPlId(null);
                  }}
                  className="p-4 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-800 space-y-2 cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                      Project: {pl.name}
                      {pl.archived && <button type="button" className="ml-2 text-indigo-600" onClick={() => setProductLines(previous => previous.map(project => project.id === pl.id ? { ...project, archived: false } : project))}>Restore project</button>}
                    </span>
                    <span className="text-xs text-slate-400">{plProjects.length} products</span>
                  </div>
                  <div className="space-y-1">
                    {plProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900"
                      >
                        <span className={proj.archived ? 'line-through text-slate-400' : ''}>
                          Product: {proj.name}
                        </span>
                        <button
                          onClick={() =>
                            setProjects((prev) =>
                              prev.map((item) =>
                                item.id === proj.id ? { ...item, archived: !item.archived } : item
                              )
                            )
                          }
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {proj.archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-stone-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-base">Team Members & Role Management</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs"
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@company.com"
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
              </select>
              <button
                onClick={() => {
                  if (!newUserName.trim() || !newUserEmail.trim()) return;
                  setUsers((prev) => [
                    ...prev,
                    {
                      id: `u-${Date.now()}`,
                      name: newUserName.trim(),
                      email: newUserEmail.trim(),
                      role: newUserRole,
                      is_active: true,
                      color: 'bg-teal-600',
                      initials: newUserName.trim().slice(0, 2).toUpperCase(),
                      notification_prefs: {},
                    },
                  ]);
                  setNewUserName('');
                  setNewUserEmail('');
                  pushToast('success', 'User Invited', `Invited ${newUserName} (${newUserRole}).`);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Invite User
              </button>
            </div>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full ${u.color} text-white font-bold flex items-center justify-center`}>
                    {u.initials}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-slate-400">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((item) => (item.id === u.id ? { ...item, role: e.target.value } : item))
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 font-semibold"
                  >
                    <option value="manager">Manager</option>
                    <option value="member">Member</option>
                  </select>
                  <button
                    onClick={() =>
                      setUsers((prev) =>
                        prev.map((item) => (item.id === u.id ? { ...item, is_active: !item.is_active } : item))
                      )
                    }
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      u.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-stone-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'notifications' && (<p className="bg-white p-5 rounded-xl border text-sm text-slate-500">Use Email notifications above to choose updates for your assigned tasks. Emails are queued on the server; local sample records never send email.</p>)}

    </div>
  );
}

// ============================================================================
// CREATE PROJECT / PRODUCT MODAL
// ============================================================================
function CreateProjectProductModal({ productLines, onClose, onCreateProject, onCreateProduct }) {
  const [mode, setMode] = useState('product');
  const [selectedPlId, setSelectedPlId] = useState(productLines[1]?.id || productLines[0]?.id || '');
  const [projectName, setProjectName] = useState('');
  const [productName, setProductName] = useState('');
  const [defaultPriority, setDefaultPriority] = useState(2);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg">Create Project or Product</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-stone-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setMode('product')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'product' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            + Add Product to Project
          </button>
          <button
            onClick={() => setMode('project')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'project' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            + Create New Project
          </button>
        </div>

        {mode === 'product' ? (
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Select Parent Project</label>
              <select
                value={selectedPlId}
                onChange={(e) => setSelectedPlId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold"
              >
                {productLines.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    Project: {pl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Sensor"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-500 block mb-1">New Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Fire Alarm"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Initial Product Under This Project</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Sensor"
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={() => {
              if (mode === 'product') {
                if (!productName.trim()) return;
                onCreateProduct(selectedPlId, productName.trim(), defaultPriority);
              } else {
                if (!projectName.trim()) return;
                onCreateProject(projectName.trim(), productName.trim());
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Create Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NEW TASK MODAL
// ============================================================================
function NewTaskModal({ productLines, projects, tasks, users, currentUser, defaultStatus, onClose, onCreate }) {
  const [selectedPlId, setSelectedPlId] = useState(productLines[0]?.id || '');
  const availableProducts = projects.filter((p) => !p.archived && p.product_line_id === selectedPlId);
  const [projectId, setProjectId] = useState(availableProducts[0]?.id || projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState(2);
  const [criticality, setCriticality] = useState('high');
  const [weight, setWeight] = useState(10);
  const [status, setStatus] = useState(defaultStatus || 'backlog');
  const [startDate, setStartDate] = useState(TODAY_CAIRO);
  const [plannedDays, setPlannedDays] = useState(3);
  const [extraHoursPerDay, setExtraHoursPerDay] = useState(0);
  const [fridayHours, setFridayHours] = useState(0);
  const [saturdayHours, setSaturdayHours] = useState(0);
  const [dependsOnId, setDependsOnId] = useState('');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Create Hardware Engineering Task</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Task Title *</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Verify optical smoke labyrinth threshold"
              className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Project</label>
              <select
                value={selectedPlId}
                onChange={(e) => {
                  const nextPl = e.target.value;
                  setSelectedPlId(nextPl);
                  const firstProd = projects.find((p) => !p.archived && p.product_line_id === nextPl);
                  if (firstProd) setProjectId(firstProd.id);
                }}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold"
              >
                {productLines.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Product (Holds Task)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-semibold"
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              >
                <option value="">Unassigned</option>
                {users
                  .filter((u) => u.is_active && u.role !== 'viewer')
                  .sort((a,b) => Number((projects.find(p=>p.id===projectId)?.assignee_ids || []).includes(b.id)) - Number((projects.find(p=>p.id===projectId)?.assignee_ids || []).includes(a.id)))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Criticality</label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">
                Planned Time (Days)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={plannedDays}
                onChange={(e) => setPlannedDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-500 block mb-1">Weight (1–10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={weight}
                onChange={(e) => setWeight(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="rounded-xl border p-3 space-y-2">
            <p className="font-semibold text-slate-600">Work hours: {STANDARD_DAY_HOURS}h per regular day</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                ['Extra hours / regular day', extraHoursPerDay, setExtraHoursPerDay],
                ['Friday hours', fridayHours, setFridayHours],
                ['Saturday hours', saturdayHours, setSaturdayHours],
              ].map(([label, value, setter]) => <label key={label} className="font-semibold text-slate-500">{label}
                <input type="number" min="0" max={label === 'Extra hours / regular day' ? 15.5 : 16} step="0.5" value={value} onChange={(event) => setter(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" />
              </label>)}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">
              Wait for this task to finish first (Optional Dependency)
            </label>
            <select
              value={dependsOnId}
              onChange={(e) => setDependsOnId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800"
            >
              <option value="">— No prerequisite —</option>
              {tasks
                .filter((t) => t.project_id === projectId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} (Ends {t.due_date})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              const pDays = Math.max(0.5, Number(plannedDays) || 1);
              const workSchedule = {
                extra_hours_per_day: Math.max(0, Math.min(15.5, Number(extraHoursPerDay) || 0)),
                friday_hours: Math.max(0, Math.min(16, Number(fridayHours) || 0)),
                saturday_hours: Math.max(0, Math.min(16, Number(saturdayHours) || 0)),
              };
              const snappedStart = snapToTaskWorkingDay(workSchedule, startDate);
              const computedDue = addTaskDays(workSchedule, snappedStart, pDays);
              onCreate({
                id: `task-${Date.now()}`,
                project_id: projectId,
                title: title.trim(),
                details: '',
                assignee_id: (projects.find(product => product.id === projectId)?.assignee_ids?.length === 1 ? projects.find(product => product.id === projectId).assignee_ids[0] : assigneeId) || null,
                priority,
                criticality,
                weight,
                start_date: snappedStart,
                due_date: computedDue,
                planned_days: pDays,
                ...workSchedule,
                actual_days: 0,
                blocked_days: 0,
                depends_on_id: dependsOnId || null,
                dependencies_enabled: true,
                status,
                blocked_reason: '',
                approved_by: '',
                time_spent_note: '',
                position: 1,
                created_by: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                completed_at: null,
              });
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SPLIT TASK INTO 2 TASKS MODAL
// ============================================================================
function SplitTaskModal({ task, users, onClose, onSplit }) {
  const totalPlanned = Math.max(1, Number(task.planned_days) || 2);
  const halfPlanned = Math.max(0.5, Math.round((totalPlanned / 2) * 2) / 2);

  const [part1Title, setPart1Title] = useState(`${task.title} (Part 1)`);
  const [part1PlannedDays, setPart1PlannedDays] = useState(halfPlanned);
  const [part2Title, setPart2Title] = useState(`${task.title} (Part 2)`);
  const [part2PlannedDays, setPart2PlannedDays] = useState(Math.max(0.5, totalPlanned - halfPlanned));
  const [part2AssigneeId, setPart2AssigneeId] = useState(task.assignee_id || 'u-abdo');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Scissors className="w-5 h-5" />
            <h3 className="font-bold text-lg">Split Task into 2 Dependent Tasks</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/70 border border-stone-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-indigo-600 dark:text-indigo-400">Part 1 (Prerequisite Task)</div>
            <div>
              <label className="text-slate-500 block mb-1">Part 1 Title</label>
              <input
                type="text"
                value={part1Title}
                onChange={(e) => setPart1Title(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Part 1 Planned Time (Days)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={part1PlannedDays}
                onChange={(e) => setPart1PlannedDays(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-bold"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <div className="font-bold text-indigo-700 dark:text-indigo-300">
              Part 2 (Automatically Wired to Depend on Part 1)
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Part 2 Title</label>
              <input
                type="text"
                value={part2Title}
                onChange={(e) => setPart2Title(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 block mb-1">Part 2 Assignee</label>
                <select
                  value={part2AssigneeId}
                  onChange={(e) => setPart2AssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-semibold"
                >
                  {users
                    .filter((u) => u.is_active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1">Part 2 Planned Time (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={part2PlannedDays}
                  onChange={(e) => setPart2PlannedDays(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={() =>
              onSplit({
                originalTask: task,
                part1Title,
                part1PlannedDays,
                part2Title,
                part2PlannedDays,
                part2AssigneeId,
              })
            }
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Confirm Split & Wire Dependency</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRY-RUN EXCEL IMPORT REVIEW MODAL
// ============================================================================
function DryRunImportModal({ report, onClose, onConfirmImport }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="font-bold text-lg">Excel Import Dry-Run Review Report</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-800">
            <div className="text-base font-extrabold">{report.scannedRows}</div>
            <div className="text-slate-500">Scanned Rows</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
            <div className="text-base font-extrabold">{report.tasksToCreate}</div>
            <div className="text-xs">Tasks to Create</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
            <div className="text-base font-extrabold">{report.swappedDatesCount}</div>
            <div className="text-xs">Swapped Dates</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <div className="text-base font-extrabold">{report.skippedRowsCount}</div>
            <div className="text-xs">Skipped Rows</div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200">12 Swapped Ambiguous Dates (Rule 5):</h4>
          <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-stone-100 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-xl p-2">
            {report.swappedDates.map((s, idx) => (
              <div key={idx} className="py-1 flex justify-between items-center text-[11px]">
                <span className="font-semibold">{s.tab} (Row {s.row})</span>
                <span className="font-mono text-rose-500">{s.stored} → {s.afterSwap}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={onConfirmImport}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Confirm Import (175 Tasks)
          </button>
        </div>
      </div>
    </div>
  );
}