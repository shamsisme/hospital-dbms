'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** rgb triplet for the active pill glow */
  glow?: string;
}

interface SegmentedProps<T extends string> {
  id: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/** Pill tabs with a sliding, springy active indicator (21st.dev "Animated Tabs"). */
export default function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedProps<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs';
  return (
    <div className={`inline-flex flex-wrap items-center gap-1 rounded-xl border border-tint/[0.12] bg-tint/[0.03] p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        const glow = opt.glow ?? '46,230,245';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative rounded-lg font-semibold transition-colors ${pad} ${
              active ? 'text-fg' : 'text-fg2 hover:text-fg'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-lg border"
                style={{
                  background: `linear-gradient(180deg, rgba(${glow},0.22), rgba(${glow},0.08))`,
                  borderColor: `rgba(${glow},0.45)`,
                  
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
