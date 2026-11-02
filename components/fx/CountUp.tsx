'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const fmt = (v: number, decimals: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Spring-driven number ticker (React Bits "Count Up" / Magic UI "Number Ticker"). */
export default function CountUp({ value, decimals = 0, prefix = '', suffix = '', className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '-40px' });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 900);
    return () => clearTimeout(t);
  }, []);
  const inView = seen || timedOut;
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 28, stiffness: 80, mass: 0.8 });

  useEffect(() => {
    if (inView) mv.set(Number.isFinite(value) ? value : 0);
  }, [inView, value, mv]);

  useEffect(
    () =>
      spring.on('change', (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${fmt(v, decimals)}${suffix}`;
      }),
    [spring, prefix, suffix, decimals]
  );

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {fmt(0, decimals)}
      {suffix}
    </span>
  );
}
