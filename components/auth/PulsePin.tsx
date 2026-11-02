'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Delete } from 'lucide-react';

export type PinStatus = 'idle' | 'checking' | 'ok' | 'fail' | 'locked';

interface PulsePinProps {
  value: string;
  length?: number;
  status: PinStatus;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  /** listen to the physical keyboard */
  keyboard?: boolean;
}

const COLORS: Record<PinStatus, string> = {
  idle: '#2ee6f5',
  checking: '#7af7ff',
  ok: '#34d399',
  fail: '#fb7185',
  locked: '#fb7185',
};

/** One PQRST complex; u = seconds since the beat started. */
function beat(u: number) {
  const g = (mu: number, s: number, a: number) => a * Math.exp(-((u - mu) ** 2) / (2 * s * s));
  return g(0.05, 0.018, 0.12) + g(0.105, 0.006, -0.18) + g(0.12, 0.007, 1) + g(0.135, 0.007, -0.32) + g(0.27, 0.035, 0.22);
}

/**
 * Patient-monitor trace that answers the keypad: every digit is a heartbeat.
 * Correct PIN settles into sinus rhythm; a wrong one shows fibrillation; lock-out flatlines.
 */
function Monitor({ status, beats }: { status: PinStatus; beats: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ status, triggers: [] as number[], failAt: 0 });

  useEffect(() => {
    state.current.status = status;
    if (status === 'fail') state.current.failAt = performance.now() / 1000;
  }, [status]);

  useEffect(() => {
    if (beats > 0) state.current.triggers.push(performance.now() / 1000);
  }, [beats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let buf = new Float32Array(1);
    let pos = 0;
    let raf = 0;
    let last = performance.now() / 1000;
    let lastAuto = 0;
    const SPEED = 150; // px per second

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buf = new Float32Array(Math.max(1, Math.floor(w)));
      pos = 0;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const sample = (t: number) => {
      const s = state.current;
      if (s.status === 'locked') return 0;
      if (s.status === 'fail' && t - s.failAt < 1.4) {
        return 0.55 * Math.sin(t * 31) * Math.sin(t * 7.3) + 0.25 * Math.sin(t * 53 + 1.3) + (Math.random() - 0.5) * 0.1;
      }
      if (s.status === 'ok' && t - lastAuto > 0.75) {
        s.triggers.push(t);
        lastAuto = t;
      }
      let y = (Math.random() - 0.5) * 0.02;
      for (const tb of s.triggers) {
        const u = t - tb;
        if (u >= 0 && u < 0.4) y += beat(u);
      }
      return y;
    };

    const draw = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      state.current.triggers = state.current.triggers.filter((tb) => now - tb < 0.5);
      const steps = Math.max(1, Math.round(dt * SPEED));
      for (let i = 0; i < steps; i++) {
        const t = now - dt + (i / steps) * dt;
        pos = (pos + 1) % buf.length;
        buf[pos] = sample(t);
      }

      ctx.clearRect(0, 0, w, h);
      const color = COLORS[state.current.status];
      const mid = h * 0.62;
      const amp = h * 0.5;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const GAP = 16;
      let started = false;
      for (let x = 0; x < buf.length; x++) {
        const ahead = (x - pos + buf.length) % buf.length;
        if (ahead > 0 && ahead <= GAP) {
          started = false;
          continue;
        }
        const yy = mid - buf[x] * amp;
        if (!started) {
          ctx.moveTo(x, yy);
          started = true;
        } else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      // sweep head
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pos, mid - buf[pos] * amp, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'];

export default function PulsePin({ value, length = 6, status, onChange, onSubmit, disabled, keyboard = true }: PulsePinProps) {
  const beatsRef = useRef(0);
  const [beats, setBeats] = React.useState(0);
  const color = COLORS[status];

  const press = (k: string) => {
    if (disabled) return;
    if (k === 'del') return onChange(value.slice(0, -1));
    if (k === 'go') return value.length === length && onSubmit();
    if (value.length >= length) return;
    beatsRef.current += 1;
    setBeats(beatsRef.current);
    onChange(value + k);
  };

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('go');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label =
    status === 'ok'
      ? 'Sinus rhythm · access granted'
      : status === 'fail'
        ? 'Arrhythmia · PIN rejected'
        : status === 'locked'
          ? 'Flatline · badge locked'
          : status === 'checking'
            ? 'Verifying in hospital_db…'
            : value.length
              ? `${value.length} of ${length} beats`
              : 'Waiting for pulse';

  return (
    <div>
      <div className="screen relative h-28 overflow-hidden rounded-2xl border border-tint/[0.12]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(46,230,245,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(46,230,245,0.35) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <Monitor status={status} beats={beats} />
        <div className="pointer-events-none absolute left-3 top-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fg3">
          Pulse PIN · lead II
        </div>
        <div className="pointer-events-none absolute right-3 top-2 text-right">
          <div className="font-display text-lg font-bold tabular-nums" style={{ color }}>
            {status === 'ok' ? '72' : status === 'fail' ? 'VF' : status === 'locked' ? '0' : value.length ? 60 + value.length * 9 : '--'}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px]" style={{ color }}>
          {label}
        </div>
      </div>

      <motion.div
        className="mt-4 flex justify-center gap-3"
        animate={status === 'fail' ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        aria-label={`${value.length} of ${length} digits entered`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <motion.span
              key={i}
              className="h-3.5 w-3.5 rounded-full border"
              animate={{
                scale: filled ? [1.4, 1] : 1,
                backgroundColor: filled ? color : 'rgba(231,236,245,0)',
                borderColor: filled ? color : 'rgba(231,236,245,0.25)',
              }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
      </motion.div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {KEYS.map((k) => {
          const isGo = k === 'go';
          const isDel = k === 'del';
          const ready = value.length === length;
          return (
            <motion.button
              key={k}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => press(k)}
              disabled={disabled || (isGo && !ready)}
              aria-label={isDel ? 'Delete digit' : isGo ? 'Sign in' : `Digit ${k}`}
              className={`flex h-14 items-center justify-center rounded-2xl border font-display text-xl font-semibold transition disabled:opacity-40 ${
                isGo
                  ? 'border-pulse-400/50 bg-pulse-400 text-[#04121a] hover:bg-pulse-300'
                  : 'border-tint/[0.12] bg-tint/[0.04] text-fg hover:border-tint/25 hover:bg-tint/[0.08]'
              }`}
            >
              {isDel ? <Delete className="h-5 w-5" /> : isGo ? <ArrowRight className="h-5 w-5" /> : k}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
