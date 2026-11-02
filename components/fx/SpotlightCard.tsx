'use client';

import React, { useRef } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** rgb triplet, e.g. "231,236,245" */
  glow?: string;
  innerClassName?: string;
}

/**
 * Card whose border and surface light up under the cursor
 * (React Bits "Spotlight Card" + Aceternity "Card Spotlight").
 */
export default function SpotlightCard({
  glow = '46,230,245',
  className = '',
  innerClassName = '',
  children,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - r.left}px`);
    el.style.setProperty('--sy', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group/spot relative rounded-2xl p-px ${className}`}
      style={{
        background: `radial-gradient(420px circle at var(--sx, -999px) var(--sy, -999px), rgba(${glow},0.55), transparent 40%), rgba(231,236,245,0.09)`,
      }}
      {...rest}
    >
      <div className={`relative h-full overflow-hidden rounded-[15px] bg-ink-900/90 backdrop-blur-xl ${innerClassName}`}>
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{
            background: `radial-gradient(500px circle at var(--sx) var(--sy), rgba(${glow},0.09), transparent 40%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
}
