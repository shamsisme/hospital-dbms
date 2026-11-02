'use client';

import { useEffect, useRef } from 'react';

interface Spark {
  x: number;
  y: number;
  angle: number;
  start: number;
  color: string;
}

const COLORS = ['#2ee6f5', '#9474ff', '#fb7185'];

/** Burst of light rays wherever the user clicks (React Bits "Click Spark"). */
export default function ClickSpark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let sparks: Spark[] = [];
    let raf = 0;
    let cleanup = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const DURATION = 520;
    const draw = () => {
      const t = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sparks = sparks.filter((s) => t - s.start < DURATION);
      for (const s of sparks) {
        const p = (t - s.start) / DURATION;
        const ease = 1 - Math.pow(1 - p, 3);
        const dist = ease * 34;
        const len = 12 * (1 - ease);
        const x1 = s.x + Math.cos(s.angle) * dist;
        const y1 = s.y + Math.sin(s.angle) * dist;
        const x2 = s.x + Math.cos(s.angle) * (dist + len);
        const y2 = s.y + Math.sin(s.angle) * (dist + len);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 1 - p;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (sparks.length) raf = requestAnimationFrame(draw);
      else raf = 0;
    };

    const onClick = (e: MouseEvent) => {
      const now = performance.now();
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      clearTimeout(cleanup);
      cleanup = window.setTimeout(() => {
        sparks = [];
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }, DURATION + 80);
      for (let i = 0; i < 9; i++) {
        sparks.push({ x: e.clientX, y: e.clientY, angle: (Math.PI * 2 * i) / 9, start: now, color });
      }
      if (!raf) raf = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', onClick);
      cancelAnimationFrame(raf);
      clearTimeout(cleanup);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100]" />;
}
