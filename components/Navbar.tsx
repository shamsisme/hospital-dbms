'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BedDouble,
  UserPlus,
  Receipt,
  BarChart3,
  Activity,
  Database,
  PhoneCall,
  Clock,
  Shield,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    {
      href: '/',
      label: 'Bed Grid & Triage',
      icon: BedDouble,
      badge: 'Live',
    },
    {
      href: '/admissions',
      label: 'Emergency Admission',
      icon: UserPlus,
    },
    {
      href: '/billing',
      label: 'Discharge & Billing',
      icon: Receipt,
    },
    {
      href: '/analytics',
      label: 'Capacity Analytics',
      icon: BarChart3,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top emergency status banner */}
      <div className="bg-slate-900 px-4 py-1.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <Database className="h-3.5 w-3.5" />
              <span>PostgreSQL: hospital_db:5432 (Pool Active)</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-400">
              Exclusion Constraint: <code className="text-amber-300">ex_no_double_bed_booking</code> Enforced
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <PhoneCall className="h-3 w-3" />
              <span>ER Trauma Hotline: 108 / 9900112233</span>
            </span>
            {time && (
              <span className="hidden md:flex items-center gap-1 text-slate-400 font-mono">
                <Clock className="h-3 w-3" />
                <span>{time}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  MediResource <span className="text-blue-600">CMS</span>
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Clinical
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Centralized Hospital Bed & Emergency Resource Management
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1.5">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && !isActive && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
