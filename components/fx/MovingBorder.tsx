'use client';

import React from 'react';
import Link from 'next/link';

interface MovingBorderProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  /** css colour stops for the rotating beam */
  colors?: string;
  size?: 'md' | 'lg';
}

/** Button with a light beam orbiting its border (Aceternity "Moving Border"). */
export default function MovingBorder({
  children,
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
  colors = '#2ee6f5, #9474ff, #3b82f6, #2ee6f5',
  size = 'md',
}: MovingBorderProps) {
  const pad = size === 'lg' ? 'px-6 py-3.5 text-sm' : 'px-4 py-2.5 text-xs';
  const inner = (
    <>
      <span
        aria-hidden
        className="absolute inset-[-200%] animate-spin-slow"
        style={{ background: `conic-gradient(from 0deg, transparent 0 55%, ${colors})` }}
      />
      <span
        className={`relative z-10 flex w-full items-center justify-center gap-2 rounded-[11px] bg-ink-900/95 font-semibold text-fg backdrop-blur-xl transition-colors group-hover/mb:bg-ink-800/90 ${pad}`}
      >
        {children}
      </span>
    </>
  );
  const cls = `group/mb relative inline-flex overflow-hidden rounded-xl p-[1.5px] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
