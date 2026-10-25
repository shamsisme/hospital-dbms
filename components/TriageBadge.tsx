import React from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck, Activity, Info } from 'lucide-react';

interface TriageBadgeProps {
  priority: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TRIAGE_CONFIG = {
  1: {
    label: 'ESI 1: Resuscitation',
    shortLabel: 'ESI 1 (Resus)',
    description: 'Immediate life-saving intervention required',
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-700',
    lightBg: 'bg-red-50 text-red-700 border-red-200',
    pulse: true,
    Icon: AlertCircle,
  },
  2: {
    label: 'ESI 2: Emergent',
    shortLabel: 'ESI 2 (Emergent)',
    description: 'High risk, severe pain or altered mental status',
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-600',
    lightBg: 'bg-orange-50 text-orange-700 border-orange-200',
    pulse: false,
    Icon: AlertTriangle,
  },
  3: {
    label: 'ESI 3: Urgent',
    shortLabel: 'ESI 3 (Urgent)',
    description: 'Multiple resources needed, stable vitals',
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-600',
    lightBg: 'bg-amber-50 text-amber-800 border-amber-200',
    pulse: false,
    Icon: Activity,
  },
  4: {
    label: 'ESI 4: Less Urgent',
    shortLabel: 'ESI 4 (Less Urgent)',
    description: 'Single diagnostic/treatment resource required',
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-700',
    lightBg: 'bg-blue-50 text-blue-700 border-blue-200',
    pulse: false,
    Icon: Info,
  },
  5: {
    label: 'ESI 5: Non-Urgent',
    shortLabel: 'ESI 5 (Non-Urgent)',
    description: 'No resources required, routine care',
    bg: 'bg-emerald-600',
    text: 'text-white',
    border: 'border-emerald-700',
    lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pulse: false,
    Icon: ShieldCheck,
  },
};

export default function TriageBadge({ priority, showLabel = true, size = 'md' }: TriageBadgeProps) {
  const cfg = TRIAGE_CONFIG[priority as keyof typeof TRIAGE_CONFIG] || TRIAGE_CONFIG[3];
  const Icon = cfg.Icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm transition-all ${sizeClasses} ${
        cfg.bg
      } ${cfg.text} ${cfg.border} ${cfg.pulse ? 'ring-2 ring-red-400 ring-offset-1 animate-pulse' : ''}`}
      title={`${cfg.label} - ${cfg.description}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {showLabel && <span>{size === 'sm' ? cfg.shortLabel : cfg.label}</span>}
    </span>
  );
}
