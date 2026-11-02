'use client';

import React from 'react';
import { motion } from 'framer-motion';
import SplitText from './fx/SplitText';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  accent?: string[];
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, accent, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-pulse-400/25 bg-pulse-400/[0.06] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-pulse-300"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-300" />
          {eyebrow}
        </motion.div>
        <SplitText
          text={title}
          accent={accent}
          className="font-display text-[34px] font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl"
        />
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-3 max-w-2xl text-sm leading-relaxed text-fg2"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-3"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl border border-tint/[0.14] bg-tint/[0.04] px-3.5 py-2.5 text-xs font-semibold text-fg backdrop-blur transition hover:border-tint/25 hover:bg-tint/[0.08] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
