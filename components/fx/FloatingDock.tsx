'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface DockItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

/** macOS-style magnifying dock (Aceternity "Floating Dock"). */
export default function FloatingDock({ items, active }: { items: DockItem[]; active: string }) {
  const mouseX = useMotionValue(Infinity);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
      <motion.nav
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.3 }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="pointer-events-auto flex h-[68px] items-end gap-3 rounded-2xl border border-tint/[0.14] bg-ink-900/70 px-3 pb-2.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      >
        {items.map((item) => (
          <DockIcon key={item.href} item={item} mouseX={mouseX} isActive={active === item.href} />
        ))}
      </motion.nav>
    </div>
  );
}

function DockIcon({ item, mouseX, isActive }: { item: DockItem; mouseX: MotionValue<number>; isActive: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - b.x - b.width / 2;
  });
  const size = useSpring(useTransform(distance, [-140, 0, 140], [44, 70, 44]), {
    mass: 0.1,
    stiffness: 160,
    damping: 12,
  });
  const iconSize = useSpring(useTransform(distance, [-140, 0, 140], [20, 32, 20]), {
    mass: 0.1,
    stiffness: 160,
    damping: 12,
  });
  const Icon = item.icon;

  return (
    <Link
      ref={ref}
      href={item.href}
      aria-label={item.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      <motion.div
        style={{ width: size, height: size }}
        className={`relative flex items-center justify-center rounded-xl border transition-colors ${
          isActive
            ? 'border-pulse-400/50 bg-gradient-to-b from-pulse-400/25 to-plasma-500/20 text-fg'
            : 'border-tint/[0.14] bg-tint/[0.04] text-fg2 hover:text-fg'
        }`}
      >
        <motion.div style={{ width: iconSize, height: iconSize }} className="flex items-center justify-center">
          <Icon className="h-full w-full" strokeWidth={1.7} />
        </motion.div>
      </motion.div>

      {isActive && (
        <motion.span
          layoutId="dock-dot"
          className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pulse-300"
        />
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 4, x: '-50%', scale: 0.95 }}
            className="pointer-events-none absolute -top-12 left-1/2 whitespace-nowrap rounded-lg border border-tint/[0.14] bg-ink-850/95 px-2.5 py-1.5 text-center shadow-xl backdrop-blur"
          >
            <div className="text-xs font-semibold text-fg">{item.label}</div>
            {item.hint && <div className="font-mono text-[9.5px] text-pulse-300/80">{item.hint}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </Link>
  );
}
