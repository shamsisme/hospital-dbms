'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import SpotlightCard from './fx/SpotlightCard';
import CountUp from './fx/CountUp';

type Variant = 'blue' | 'rose' | 'amber' | 'emerald' | 'slate' | 'violet';

const RGB: Record<Variant, string> = {
  blue: '46,230,245',
  rose: '251,113,133',
  amber: '251,191,36',
  emerald: '52,211,153',
  slate: '148,163,184',
  violet: '148,116,255',
};

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: Variant;
  badge?: string;
  index?: number;
  /** 0-100 progress shown as a thin glowing bar */
  progress?: number;
}

export default function MetricCard({
  title,
  value,
  prefix,
  suffix,
  decimals = 0,
  subtitle,
  icon: Icon,
  variant = 'blue',
  badge,
  index = 0,
  progress,
}: MetricCardProps) {
  const rgb = RGB[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.1 + index * 0.08 }}
      whileHover={{ y: -4 }}
    >
      <SpotlightCard glow={rgb} innerClassName="p-5">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
          style={{ background: `rgba(${rgb},0.08)` }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <p className="min-w-0 pt-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fg2">{title}</p>
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
            style={{
              color: `rgb(${rgb})`,
              borderColor: `rgba(${rgb},0.3)`,
              background: `rgba(${rgb},0.09)`,
              
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
        </div>
        <div className="relative mt-2">
          {value === null || value === undefined ? (
            <span className="block h-9 w-16 animate-pulse rounded-lg bg-tint/5" />
          ) : (
            <CountUp
              value={value}
              decimals={decimals}
              prefix={prefix}
              suffix={suffix}
              className="block font-display text-[32px] font-bold leading-none tracking-tight text-fg"
            />
          )}
        </div>
        <div className="relative mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {subtitle && <p className="min-w-0 text-xs text-fg2">{subtitle}</p>}
          {badge && (
            <span
              className="whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
              style={{ color: `rgb(${rgb})`, borderColor: `rgba(${rgb},0.3)`, background: `rgba(${rgb},0.08)` }}
            >
              {badge}
            </span>
          )}
        </div>
        {progress !== undefined && (
          <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-tint/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: `rgb(${rgb})`, }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 + index * 0.08 }}
            />
          </div>
        )}
      </SpotlightCard>
    </motion.div>
  );
}
