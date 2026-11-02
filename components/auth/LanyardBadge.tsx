'use client';

import React, { useMemo, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';
import { Nfc, ShieldCheck, UserRound } from 'lucide-react';
import { ROLE_STYLE, Role, initials } from './SessionContext';

export type BadgeState = 'idle' | 'scanning' | 'granted' | 'denied' | 'emergency';

interface LanyardBadgeProps {
  code: string;
  role: Role | null;
  name: string | null;
  state: BadgeState;
  /** element the badge can be dropped on to "tap" it */
  readerRef?: React.RefObject<HTMLElement>;
  onTap?: () => void;
}

const W = 248;
const ANCHOR_Y = 0;
const BADGE_TOP = 120;

/** Deterministic barcode bars generated from the badge ID. */
function Barcode({ value, color }: { value: string; color: string }) {
  const bars = useMemo(() => {
    const src = (value || 'MEDIRESOURCE').padEnd(12, '0');
    const out: number[] = [];
    for (let i = 0; i < src.length; i++) {
      const c = src.charCodeAt(i);
      out.push((c % 3) + 1, ((c >> 2) % 2) + 1, ((c >> 3) % 3) + 1);
    }
    return out;
  }, [value]);
  let x = 0;
  return (
    <svg viewBox="0 0 160 28" className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      {bars.map((w, i) => {
        const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w * 1.3} height={28} fill={color} /> : null;
        x += w * 1.3 + 0.9;
        return rect;
      })}
    </svg>
  );
}

/**
 * Staff ID badge hanging from a lanyard (inspired by React Bits "Lanyard").
 * Drag it and it swings back on a spring; drop it on the NFC reader to tap in.
 */
export default function LanyardBadge({ code, role, name, state, readerRef, onTap }: LanyardBadgeProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-220, 220], [24, -24]), { stiffness: 180, damping: 10 });
  const badgeRef = useRef<HTMLDivElement>(null);

  // Lanyard strap: a curve from the ceiling anchor to the badge clip.
  const strap = useTransform([x, y] as any, ([vx, vy]: number[]) => {
    const ax = W / 2 + 6;
    const bx = W / 2 + 6 + vx;
    const by = BADGE_TOP + vy + 6;
    return `M ${ax} ${ANCHOR_Y} C ${ax} ${by * 0.45}, ${bx} ${by * 0.55}, ${bx} ${by}`;
  });

  const style = role ? ROLE_STYLE[role] : { rgb: '148,163,184', hex: '#94a3b8', prefix: '---' };
  const flipped = state === 'granted' || state === 'emergency';
  const ringColor =
    state === 'denied' ? '251,113,133' : state === 'emergency' ? '255,59,92' : state === 'granted' ? '52,211,153' : style.rgb;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const el = readerRef?.current;
    if (el && onTap) {
      const r = el.getBoundingClientRect();
      const { x: px, y: py } = info.point;
      const cx = px - window.scrollX;
      const cy = py - window.scrollY;
      if (cx >= r.left - 30 && cx <= r.right + 30 && cy >= r.top - 30 && cy <= r.bottom + 30) onTap();
    }
  };

  return (
    <div className="relative mx-auto select-none" style={{ width: W + 12, height: BADGE_TOP + 400 }}>
      {/* strap */}
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W + 12} height={BADGE_TOP + 400} aria-hidden>
        <motion.path d={strap} stroke="#13233a" strokeWidth={22} fill="none" strokeLinecap="round" />
        <motion.path d={strap} stroke="rgba(231,236,245,0.08)" strokeWidth={22} fill="none" strokeLinecap="round" strokeDasharray="1 3" />
        <motion.path d={strap} stroke={`rgba(${style.rgb},0.55)`} strokeWidth={1.2} fill="none" strokeDasharray="2 7" />
        <text fontSize="9" letterSpacing="3" fill={`rgba(${style.rgb},0.85)`} fontFamily="var(--font-mono), monospace" dy="3">
          <textPath href="#strap-path" startOffset="6%">
            MEDIRESOURCE · STAFF · MEDIRESOURCE
          </textPath>
        </text>
        <motion.path id="strap-path" d={strap} fill="none" stroke="none" />
      </svg>

      {/* badge */}
      <motion.div
        ref={badgeRef}
        drag
        dragSnapToOrigin
        dragElastic={0.5}
        dragTransition={{ bounceStiffness: 220, bounceDamping: 11 }}
        onDragEnd={onDragEnd}
        style={{ x, y, rotate, top: BADGE_TOP, left: 6, width: W, transformOrigin: '50% 0%' }}
        whileDrag={{ scale: 1.04, cursor: 'grabbing', zIndex: 60 }}
        className="absolute z-20 cursor-grab touch-none"
        aria-label={`Staff badge ${code || 'blank'}. Drag onto the reader to tap in.`}
      >
        {/* clip */}
        <div className="mx-auto -mb-2 h-6 w-12 rounded-md border border-tint/20 bg-gradient-to-b from-slate-300 to-slate-500 shadow-md" />
        <motion.div
          style={{ perspective: 1200 }}
          animate={state === 'denied' ? { x: [0, -16, 14, -10, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 14 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative h-[352px]"
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 overflow-hidden rounded-2xl border bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]"
              style={{
                backfaceVisibility: 'hidden',
                borderColor: `rgba(${ringColor},0.55)`,
                boxShadow: state === 'scanning' ? `0 0 0 3px rgba(${ringColor},0.35), 0 40px 80px -30px rgba(0,0,0,0.9)` : undefined,
              }}
            >
              <div className="relative h-24" style={{ background: `linear-gradient(135deg, rgba(${style.rgb},0.9), rgba(148,116,255,0.75))` }}>
                <div className="absolute left-1/2 top-3 h-2.5 w-14 -translate-x-1/2 rounded-full bg-ground/80" />
                <div className="absolute left-4 top-7 font-display text-[12px] font-bold leading-tight tracking-tight text-[#060812]">
                  MediResource
                  <span className="block font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] opacity-75">Staff ID</span>
                </div>
                <Nfc className="absolute right-4 top-7 h-5 w-5 text-[#060812]/70" />
              </div>
              {/* holographic sweep */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-shine opacity-40 mix-blend-overlay"
                style={{
                  backgroundImage: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 45%, rgba(46,230,245,0.25) 52%, transparent 65%)',
                  backgroundSize: '220% 100%',
                }}
              />
              <div className="relative -mt-9 flex justify-center">
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-surface font-display text-xl font-bold text-[#060812]"
                  style={{ background: name ? style.hex : 'rgb(var(--c-sunk))' }}
                >
                  {name ? initials(name) : <UserRound className="h-8 w-8 text-fg3" />}
                </div>
              </div>
              <div className="px-5 pt-3 text-center">
                <div className="truncate font-display text-[17px] font-bold text-fg">{name || 'Staff member'}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: style.hex, borderColor: `rgba(${style.rgb},0.4)`, background: `rgba(${style.rgb},0.1)` }}
                >
                  {role || 'Unassigned'}
                </div>
                <div className="mt-4 rounded-lg border border-tint/[0.1] bg-sunk/70 px-3 py-2 font-mono text-[15px] font-bold tracking-[0.12em] text-fg">
                  {code || '— — — —'}
                </div>
                <div className="mt-3 opacity-80">
                  <Barcode value={code} color="rgb(var(--c-fg))" />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-fg3">
                  <span>hospital_db</span>
                  <span>staff_accounts</span>
                </div>
              </div>
            </div>

            {/* BACK (shown after sign-in) */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface px-6 text-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderColor: `rgba(${ringColor},0.6)`,
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-20"
                style={{ background: `radial-gradient(circle at 50% 30%, rgba(${ringColor},0.8), transparent 60%)` }}
              />
              <ShieldCheck className="relative h-14 w-14" style={{ color: `rgb(${ringColor})` }} />
              <div
                className="relative mt-4 rotate-[-6deg] rounded-md border-2 px-3 py-1 font-mono text-sm font-bold uppercase tracking-[0.25em]"
                style={{ color: `rgb(${ringColor})`, borderColor: `rgb(${ringColor})` }}
              >
                {state === 'emergency' ? 'Break-glass' : 'Access granted'}
              </div>
              <div className="relative mt-5 font-display text-lg font-bold text-fg">{name || 'Staff member'}</div>
              <div className="relative font-mono text-[11px] text-fg2">{code}</div>
              <div className="relative mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-fg3">
                {state === 'emergency' ? '15-minute audited session' : '8-hour shift session'}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
