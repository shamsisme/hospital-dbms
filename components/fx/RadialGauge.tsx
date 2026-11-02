'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import CountUp from './CountUp';

interface RadialGaugeProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  color?: string;
}

/** Animated ring gauge with a glowing arc and count-up centre value. */
export default function RadialGauge({
  value,
  size = 180,
  stroke = 12,
  label,
  sub,
  color,
}: RadialGaugeProps) {
  const gid = useId().replace(/:/g, '');
  const v = Math.max(0, Math.min(100, value || 0));
  const c = color ?? (v >= 80 ? '#fb7185' : v >= 50 ? '#fbbf24' : '#2ee6f5');
  const r = (size - stroke) / 2;
  const ticks = Array.from({ length: 40 });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c} />
            <stop offset="100%" stopColor="#9474ff" />
          </linearGradient>
        </defs>
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const r1 = r - stroke - 4;
          const r2 = r - stroke - (i % 5 === 0 ? 11 : 7);
          return (
            <line
              key={i}
              x1={(size / 2 + Math.cos(a) * r1).toFixed(2)}
              y1={(size / 2 + Math.sin(a) * r1).toFixed(2)}
              x2={(size / 2 + Math.cos(a) * r2).toFixed(2)}
              y2={(size / 2 + Math.sin(a) * r2).toFixed(2)}
              stroke="rgba(231,236,245,0.14)"
              strokeWidth={1}
            />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(231,236,245,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#g-${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.005, v / 100) }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <CountUp value={v} decimals={1} suffix="%" className="font-display text-3xl font-bold text-fg" />
        {label && <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg2">{label}</span>}
        {sub && <span className="mt-1 text-[11px] text-fg3">{sub}</span>}
      </div>
    </div>
  );
}
