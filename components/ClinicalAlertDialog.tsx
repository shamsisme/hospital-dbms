'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, CheckCircle, ShieldAlert, Terminal } from 'lucide-react';
import type { FormattedDbError } from '@/lib/db-errors';
import Modal from './fx/Modal';

interface ClinicalAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: FormattedDbError | null;
  severity?: 'error' | 'warning' | 'success';
}

const CFG = {
  error: { rgb: '255,59,92', text: 'text-rose-300', Icon: AlertOctagon, btn: 'from-rose-500 to-rose-600' },
  warning: { rgb: '251,191,36', text: 'text-amber-300', Icon: ShieldAlert, btn: 'from-amber-500 to-amber-500' },
  success: { rgb: '52,211,153', text: 'text-emerald-300', Icon: CheckCircle, btn: 'from-emerald-500 to-emerald-500' },
};

/** Database-constraint alert: shakes on error and shows the PostgreSQL diagnostic. */
export default function ClinicalAlertDialog({
  isOpen,
  onClose,
  title,
  message,
  details,
  severity = 'error',
}: ClinicalAlertDialogProps) {
  const c = CFG[severity];
  const Icon = c.Icon;
  return (
    <Modal isOpen={isOpen} onClose={onClose} glow={c.rgb} shake={severity === 'error'} className="max-w-lg">
      <div role="alertdialog" className="relative">
        {/* red scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 opacity-[0.07]"
          style={{ backgroundImage: `repeating-linear-gradient(0deg, rgb(${c.rgb}) 0 1px, transparent 1px 4px)` }}
        />
        <div className="relative flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
            className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${c.text}`}
            style={{ borderColor: `rgba(${c.rgb},0.4)`, background: `rgba(${c.rgb},0.12)` }}
          >
            <span className="absolute inset-0 animate-ring rounded-2xl border" style={{ borderColor: `rgba(${c.rgb},0.5)` }} />
            <Icon className="h-6 w-6" />
          </motion.div>
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase"
                style={{ color: `rgb(${c.rgb})`, borderColor: `rgba(${c.rgb},0.35)`, background: `rgba(${c.rgb},0.08)` }}
              >
                {details?.code ? `SQLSTATE ${details.code}` : 'SYSTEM ALERT'}
              </span>
              {details?.constraintName && (
                <span className="truncate font-mono text-[10.5px] text-fg3">[{details.constraintName}]</span>
              )}
            </div>
            <h3 className="mt-2 font-display text-lg font-bold leading-snug text-fg">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg2">{message}</p>
          </div>
        </div>

        {details?.detail && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative mt-5 overflow-hidden screen rounded-xl border border-tint/[0.14] p-3 font-mono text-[11px]"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-fg3">
              <Terminal className="h-3 w-3" /> postgres diagnostic
            </div>
            <p className="break-all text-fg2">
              <span className={c.text}>ERROR:</span> {details.detail}
            </p>
          </motion.div>
        )}

        <div className="relative mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 ${c.btn}`}
            style={{ boxShadow: `0 10px 30px -10px rgba(${c.rgb},0.8)` }}
          >
            Acknowledge alert
          </button>
        </div>
      </div>
    </Modal>
  );
}
