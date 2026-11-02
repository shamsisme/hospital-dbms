'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, KeyRound, Lock, Nfc, ShieldAlert } from 'lucide-react';
import SplitText from '@/components/fx/SplitText';
import SpotlightCard from '@/components/fx/SpotlightCard';
import EcgLine from '@/components/fx/EcgLine';
import ShinyText from '@/components/fx/ShinyText';
import LanyardBadge, { BadgeState } from '@/components/auth/LanyardBadge';
import PulsePin, { PinStatus } from '@/components/auth/PulsePin';
import BreakGlass from '@/components/auth/BreakGlass';
import { ROLE_STYLE, Role, roleFromCode } from '@/components/auth/SessionContext';

const CODE_RE = /^(DOC-[0-9]{4}-[A-Z]{2}|(NUR|ADM|BIL)-[0-9]{4})$/;

// Seeded demo badges (database/setup_hospital_db.sql); every demo PIN is 246810.
const DEMO_BADGES: { code: string; name: string; role: Role }[] = [
  { code: 'DOC-1002-TN', name: 'Dr. Radhika Menon', role: 'Doctor' },
  { code: 'DOC-1001-TN', name: 'Dr. Arvind Swaminathan', role: 'Doctor' },
  { code: 'NUR-2001', name: 'Sr. Lakshmi Iyer', role: 'Nurse' },
  { code: 'BIL-3001', name: 'Farhan Qureshi', role: 'Billing' },
  { code: 'ADM-0001', name: 'Meera Pillai', role: 'Admin' },
];

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') ? n : '/');

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const notice = params.get('expired') ? 'Your session ended. Badge in again to continue.' : params.get('signed_out') ? 'You are signed out.' : null;

  const [code, setCode] = useState('');
  const [step, setStep] = useState<'badge' | 'pin'>('badge');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<PinStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [granted, setGranted] = useState<{ name: string; mode: 'standard' | 'break_glass' } | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [tapped, setTapped] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const validCode = CODE_RE.test(code);
  const role = roleFromCode(code);
  const demo = DEMO_BADGES.find((b) => b.code === code);
  const locked = lockUntil !== null && lockUntil > now;

  useEffect(() => {
    if (!lockUntil) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [lockUntil]);

  useEffect(() => {
    if (lockUntil && lockUntil <= now) {
      setLockUntil(null);
      setStatus('idle');
      setError(null);
    }
  }, [now, lockUntil]);

  const badgeState: BadgeState = granted
    ? granted.mode === 'break_glass'
      ? 'emergency'
      : 'granted'
    : status === 'fail' || status === 'locked'
      ? 'denied'
      : step === 'pin'
        ? 'scanning'
        : 'idle';

  const goPin = () => {
    if (!validCode) {
      setError('Badge IDs look like DOC-1002-TN, NUR-2001, BIL-3001 or ADM-0001.');
      return;
    }
    setError(null);
    setTapped(true);
    setTimeout(() => setTapped(false), 900);
    setStep('pin');
  };

  const finish = (name: string, mode: 'standard' | 'break_glass') => {
    setGranted({ name, mode });
    setTimeout(() => router.replace(next), 1500);
  };

  const submit = async (value = pin) => {
    if (value.length !== 6 || status === 'checking' || locked) return;
    setStatus('checking');
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_code: code, pin: value }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('ok');
        setAttemptsLeft(null);
        finish(data.staff.fullName, 'standard');
        return;
      }
      if (res.status === 423) {
        setStatus('locked');
        setLockUntil(Date.now() + (data.retryAfterSeconds || 900) * 1000);
        setNow(Date.now());
        setError(data.error);
      } else {
        setStatus('fail');
        setAttemptsLeft(typeof data.attemptsLeft === 'number' ? data.attemptsLeft : null);
        setError(data.error || 'Sign-in failed.');
        setTimeout(() => setStatus((s) => (s === 'fail' ? 'idle' : s)), 1400);
      }
      setPin('');
    } catch {
      setStatus('idle');
      setError('Cannot reach the hospital server. Check that it is running.');
    }
  };

  const onPinChange = (v: string) => {
    if (status === 'fail') setStatus('idle');
    setPin(v);
    if (v.length === 6) setTimeout(() => submit(v), 180);
  };

  const lockLeft = locked ? Math.ceil((lockUntil! - now) / 1000) : 0;
  const shift = useMemo(() => {
    const h = new Date().getHours();
    return h < 8 ? 'Night shift' : h < 16 ? 'Day shift' : 'Evening shift';
  }, []);

  return (
    <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-10">
      {/* LEFT: story + lanyard */}
      <section className="lg:col-span-6">
        <div className="flex items-center gap-3">
          <div className="screen flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-pulse-400/40">
            <EcgLine className="h-6 w-9" bpm={78} strokeWidth={2.2} color="#7af7ff" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-tight text-fg">
              Medi<span className="text-gradient">Resource</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em]">
              <ShinyText>Clinical Command Center</ShinyText>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-center gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-pulse-400/25 bg-pulse-400/[0.06] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-pulse-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-pulse-300" />
              {shift} · staff sign-in
            </motion.div>
            <SplitText
              text="Badge in. Pulse in."
              accent={['Pulse']}
              className="font-display text-[42px] font-bold leading-[1.02] tracking-tight text-fg sm:text-[52px]"
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 max-w-sm text-sm leading-relaxed text-fg2"
            >
              Drag your badge onto the reader, then key your PIN on the pulse monitor. Every digit is a heartbeat; the
              database checks the bcrypt hash and logs the attempt.
            </motion.p>

            <div className="mt-6">
              <div className="label">Badge rack · demo staff</div>
              <div className="flex flex-wrap gap-2">
                {DEMO_BADGES.map((b) => {
                  const active = b.code === code;
                  const s = ROLE_STYLE[b.role];
                  return (
                    <motion.button
                      key={b.code}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCode(b.code);
                        setStep('badge');
                        setPin('');
                        setStatus('idle');
                        setError(null);
                      }}
                      className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition"
                      style={{
                        borderColor: active ? `rgba(${s.rgb},0.7)` : 'rgba(231,236,245,0.12)',
                        background: active ? `rgba(${s.rgb},0.12)` : 'rgba(231,236,245,0.03)',
                      }}
                    >
                      <span className="h-6 w-1 rounded-full" style={{ background: s.hex }} />
                      <span>
                        <span className="block font-mono text-[11px] font-semibold text-fg">{b.code}</span>
                        <span className="block text-[10px] text-fg3">{b.role}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fg3">
                <KeyRound className="h-3.5 w-3.5" /> Demo PIN for every badge: <span className="font-mono text-fg2">246810</span>
              </p>
            </div>
          </div>

          <div className="-mt-4 flex justify-center overflow-visible sm:-mt-10">
            <LanyardBadge code={code} role={role} name={granted?.name ?? demo?.name ?? null} state={badgeState} readerRef={readerRef} onTap={goPin} />
          </div>
        </div>
      </section>

      {/* RIGHT: authentication terminal */}
      <section className="lg:col-span-6">
        <SpotlightCard innerClassName="p-6 sm:p-8">
          <AnimatePresence>
            {notice && !granted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 flex items-center gap-2 overflow-hidden rounded-xl border border-pulse-400/30 bg-pulse-400/[0.07] px-3 py-2 text-xs text-pulse-200"
              >
                <Info className="h-4 w-4" /> {notice}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-fg3">Step {step === 'badge' ? '1' : '2'} of 2</div>
              <h2 className="mt-1 font-display text-2xl font-bold text-fg">
                {granted ? `Welcome, ${granted.name.split(' ').slice(0, 2).join(' ')}` : step === 'badge' ? 'Tap your staff badge' : 'Enter your Pulse PIN'}
              </h2>
            </div>
            <div className="flex gap-1.5">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-8 rounded-full transition-colors"
                  style={{ background: (step === 'pin' ? 1 : 0) >= i || granted ? '#2ee6f5' : 'rgba(231,236,245,0.12)' }}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {granted ? (
              <motion.div
                key="granted"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-col items-center py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 12 }}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border ${
                    granted.mode === 'break_glass' ? 'border-rose-400/50 bg-rose-500/15 text-rose-300' : 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {granted.mode === 'break_glass' ? <ShieldAlert className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                </motion.div>
                <p className="mt-4 text-sm text-fg2">
                  {granted.mode === 'break_glass'
                    ? 'Emergency access granted for 15 minutes. Opening the command center…'
                    : 'Session started for this shift. Opening the command center…'}
                </p>
                <div className="screen mt-5 h-12 w-56 overflow-hidden rounded-xl border border-tint/[0.12]">
                  <EcgLine bpm={72} color={granted.mode === 'break_glass' ? '#ff3b5c' : '#34d399'} className="h-full w-full" />
                </div>
              </motion.div>
            ) : step === 'badge' ? (
              <motion.div key="badge" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="mt-6">
                <label className="label" htmlFor="staff-code">
                  Staff badge ID
                </label>
                <div className="relative">
                  <input
                    id="staff-code"
                    autoFocus
                    autoComplete="username"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase().replace(/\s/g, ''));
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && goPin()}
                    placeholder="DOC-1002-TN"
                    className="field h-12 pr-24 font-mono text-base tracking-[0.12em]"
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
                    style={
                      role
                        ? { color: ROLE_STYLE[role].hex, borderColor: `rgba(${ROLE_STYLE[role].rgb},0.4)`, background: `rgba(${ROLE_STYLE[role].rgb},0.1)` }
                        : { color: 'rgb(var(--c-fg3))', borderColor: 'rgba(231,236,245,0.12)' }
                    }
                  >
                    {role ?? 'Role'}
                  </span>
                </div>

                <div
                  ref={readerRef}
                  className={`relative mt-5 flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
                    validCode ? 'border-pulse-400/50 bg-pulse-400/[0.05]' : 'border-tint/[0.14] bg-tint/[0.02]'
                  }`}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      aria-hidden
                      className="absolute h-20 w-20 rounded-full border border-pulse-400/40"
                      animate={{ scale: [0.6, 2.4], opacity: [0.6, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.div animate={tapped ? { scale: [1, 1.3, 1] } : {}} className="relative">
                    <Nfc className="h-9 w-9 text-pulse-300" />
                  </motion.div>
                  <p className="relative mt-3 text-sm font-semibold text-fg">Drag the badge onto this reader</p>
                  <p className="relative mt-0.5 text-[11px] text-fg3">or press Continue · NFC tap simulation</p>
                </div>

                {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

                <button
                  type="button"
                  onClick={goPin}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-pulse-400 text-sm font-bold text-[#04121a] transition hover:bg-pulse-300"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('badge');
                      setPin('');
                      setStatus('idle');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg2 transition hover:text-fg"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> {code}
                  </button>
                  {attemptsLeft !== null && !locked && (
                    <span className="font-mono text-[10.5px] text-amber-300">
                      {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} before lock-out
                    </span>
                  )}
                  {locked && (
                    <span className="flex items-center gap-1 font-mono text-[10.5px] text-rose-300">
                      <Lock className="h-3 w-3" /> locked {String(Math.floor(lockLeft / 60)).padStart(2, '0')}:
                      {String(lockLeft % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <PulsePin value={pin} status={locked ? 'locked' : status} onChange={onPinChange} onSubmit={() => submit()} disabled={locked || status === 'checking'} />
                {error && <p className="mt-3 text-center text-xs text-rose-300">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {!granted && (
            <div className="mt-7 flex flex-col gap-3 border-t border-tint/[0.1] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] leading-relaxed text-fg3">
                PINs are bcrypt-hashed by <span className="font-mono text-fg2">pgcrypto</span>. 5 wrong PINs lock a badge for 15 min.
              </p>
              <button
                type="button"
                onClick={() => setBreakOpen(true)}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
              >
                <ShieldAlert className="h-4 w-4" /> Break glass
              </button>
            </div>
          )}
        </SpotlightCard>
      </section>

      <BreakGlass
        isOpen={breakOpen}
        onClose={() => setBreakOpen(false)}
        defaultCode={code}
        onGranted={(staff) => {
          setBreakOpen(false);
          setCode(staff.staffCode);
          finish(staff.fullName, 'break_glass');
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
