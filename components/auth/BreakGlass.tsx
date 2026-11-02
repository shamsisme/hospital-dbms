'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import Modal from '../fx/Modal';

interface BreakGlassProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCode: string;
  onGranted: (staff: { staffCode: string; fullName: string; role: string }) => void;
}

// Crack lines radiating from the impact point (viewBox 0 0 200 120)
const CRACKS = [
  'M100 60 L60 18 L48 4',
  'M100 60 L150 22 L178 10',
  'M100 60 L170 70 L198 66',
  'M100 60 L140 104 L150 120',
  'M100 60 L72 100 L58 118',
  'M100 60 L30 70 L2 64',
  'M100 60 L108 14 L104 0',
  'M60 18 L40 44',
  'M150 22 L160 50',
  'M72 100 L44 92',
];

/** "Break the glass" emergency access: skip the PIN with a recorded reason, 15 minutes only. */
export default function BreakGlass({ isOpen, onClose, defaultCode, onGranted }: BreakGlassProps) {
  const [code, setCode] = useState(defaultCode);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode(defaultCode);
      setError(null);
    }
  }, [isOpen, defaultCode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_code: code, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Emergency access was refused.');
      onGranted(data.staff);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} glow="255,59,92" className="max-w-lg">
      <div className="relative -mx-6 -mt-6 mb-5 h-32 overflow-hidden rounded-t-2xl border-b border-rose-500/30 bg-gradient-to-b from-rose-500/20 to-transparent">
        <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          {CRACKS.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="rgba(255,220,225,0.85)"
              strokeWidth={i < 7 ? 0.9 : 0.6}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.04, ease: 'easeOut' }}
            />
          ))}
          <motion.circle
            cx="100"
            cy="60"
            r="5"
            fill="rgba(255,255,255,0.9)"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.6, 1] }}
            transition={{ duration: 0.4 }}
          />
        </svg>
        <div className="absolute bottom-3 left-6 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-300" />
          <span className="font-display text-lg font-bold text-fg">Break-glass emergency access</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg2">
        Use this only when a patient&apos;s life is at risk and you cannot complete PIN sign-in. You get{' '}
        <b className="text-fg">15 minutes</b> of access. Your badge, the reason and the time are written to{' '}
        <code className="font-mono text-rose-300">login_audit</code> for review. Each badge can do this twice a day.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="bg-code">
            Staff badge ID
          </label>
          <input
            id="bg-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="field font-mono tracking-wider"
            placeholder="DOC-1002-TN"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="bg-reason">
              Reason for emergency access
            </label>
            <span className={`mb-1.5 font-mono text-[10.5px] ${reason.trim().length >= 10 ? 'text-emerald-300' : 'text-fg3'}`}>
              {reason.trim().length}/10 min
            </span>
          </div>
          <textarea
            id="bg-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field resize-none"
            placeholder="e.g. Code blue in ER-RESUS, need bed and drug history now"
            required
          />
        </div>
        {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-fg2 hover:bg-tint/[0.06] hover:text-fg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || reason.trim().length < 10}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {busy ? 'Recording…' : 'Break glass & enter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
