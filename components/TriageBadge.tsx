import React from 'react';
import { Activity, AlertCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react';

interface TriageBadgeProps {
  priority: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TRIAGE_CONFIG = {
  1: {
    label: 'ESI 1: Resuscitation',
    shortLabel: 'ESI 1 · Resus',
    name: 'Resuscitation',
    description: 'Immediate life-saving intervention required',
    hex: '#ff3b5c',
    rgb: '255,59,92',
    screen: '#ff3b5c',
    screenRgb: '255,59,92',
    bpm: 148,
    pulse: true,
    Icon: AlertCircle,
  },
  2: {
    label: 'ESI 2: Emergent',
    shortLabel: 'ESI 2 · Emergent',
    name: 'Emergent',
    description: 'High risk, severe pain or altered mental status',
    hex: '#fb923c',
    rgb: '251,146,60',
    screen: '#ffa04d',
    screenRgb: '255,160,77',
    bpm: 120,
    pulse: false,
    Icon: AlertTriangle,
  },
  3: {
    label: 'ESI 3: Urgent',
    shortLabel: 'ESI 3 · Urgent',
    name: 'Urgent',
    description: 'Multiple resources needed, stable vitals',
    hex: '#fbbf24',
    rgb: '251,191,36',
    screen: '#ffd34d',
    screenRgb: '255,211,77',
    bpm: 96,
    pulse: false,
    Icon: Activity,
  },
  4: {
    label: 'ESI 4: Less Urgent',
    shortLabel: 'ESI 4 · Less Urgent',
    name: 'Less Urgent',
    description: 'Single diagnostic/treatment resource required',
    hex: '#60a5fa',
    rgb: '96,165,250',
    screen: '#7fb2ff',
    screenRgb: '127,178,255',
    bpm: 80,
    pulse: false,
    Icon: Info,
  },
  5: {
    label: 'ESI 5: Non-Urgent',
    shortLabel: 'ESI 5 · Non-Urgent',
    name: 'Non-Urgent',
    description: 'No resources required, routine care',
    hex: '#34d399',
    rgb: '52,211,153',
    screen: '#34d399',
    screenRgb: '52,211,153',
    bpm: 68,
    pulse: false,
    Icon: ShieldCheck,
  },
};

export type TriageLevel = keyof typeof TRIAGE_CONFIG;

export function triage(priority?: number | null) {
  return TRIAGE_CONFIG[(priority ?? 3) as TriageLevel] || TRIAGE_CONFIG[3];
}

export default function TriageBadge({ priority, showLabel = true, size = 'md' }: TriageBadgeProps) {
  const cfg = triage(priority);
  const Icon = cfg.Icon;
  const sizeClasses = {
    sm: 'text-[10.5px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`relative inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${sizeClasses}`}
      style={{
        color: cfg.hex,
        borderColor: `rgba(${cfg.rgb},0.45)`,
        background: `rgba(${cfg.rgb},0.12)`,
        
      }}
      title={`${cfg.label} - ${cfg.description}`}
    >
      {cfg.pulse && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ring rounded-full border"
          style={{ borderColor: `rgba(${cfg.rgb},0.6)` }}
        />
      )}
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {showLabel && <span>{size === 'sm' ? cfg.shortLabel : cfg.label}</span>}
    </span>
  );
}
