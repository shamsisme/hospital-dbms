import React from 'react';
import { AlertOctagon, XCircle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { FormattedDbError } from '@/lib/db-errors';

interface ClinicalAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: FormattedDbError | null;
  severity?: 'error' | 'warning' | 'success';
}

export default function ClinicalAlertDialog({
  isOpen,
  onClose,
  title,
  message,
  details,
  severity = 'error',
}: ClinicalAlertDialogProps) {
  if (!isOpen) return null;

  const config = {
    error: {
      border: 'border-red-300',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100 text-red-600',
      titleColor: 'text-red-900',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white',
      badgeBg: 'bg-red-100 text-red-800 border-red-200',
      Icon: AlertOctagon,
    },
    warning: {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100 text-amber-600',
      titleColor: 'text-amber-900',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      Icon: ShieldAlert,
    },
    success: {
      border: 'border-emerald-300',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100 text-emerald-600',
      titleColor: 'text-emerald-900',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Icon: CheckCircle,
    },
  }[severity];

  const Icon = config.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 border-2 ${config.border}`}
        role="alertdialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold uppercase border ${config.badgeBg}`}>
                {details?.code ? `PG-${details.code}` : 'SYSTEM ALERT'}
              </span>
              {details?.constraintName && (
                <span className="font-mono text-xs text-slate-500 truncate max-w-[200px]" title={details.constraintName}>
                  [{details.constraintName}]
                </span>
              )}
            </div>

            <h3 className={`mt-1 text-lg font-bold ${config.titleColor}`}>
              {title}
            </h3>

            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              {message}
            </p>

            {details?.detail && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600 border border-slate-200">
                <p className="font-semibold text-slate-700">Database Diagnostic:</p>
                <p className="mt-1 break-all text-slate-600">{details.detail}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${config.btnBg}`}
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
