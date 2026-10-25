import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'rose' | 'amber' | 'emerald' | 'slate';
  badge?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  badge,
}: MetricCardProps) {
  const variantStyles = {
    blue: {
      bg: 'bg-white',
      border: 'border-blue-200/80 hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
      valueColor: 'text-slate-900',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    rose: {
      bg: 'bg-white',
      border: 'border-rose-200/80 hover:border-rose-300',
      iconBg: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
      valueColor: 'text-slate-900',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-amber-200/80 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      valueColor: 'text-slate-900',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-emerald-200/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
      valueColor: 'text-slate-900',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    slate: {
      bg: 'bg-white',
      border: 'border-slate-200/80 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
      valueColor: 'text-slate-900',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md ${variantStyles.bg} ${variantStyles.border}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${variantStyles.valueColor}`}>
              {value}
            </span>
            {badge && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variantStyles.badgeColor}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 shadow-inner ${variantStyles.iconBg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
