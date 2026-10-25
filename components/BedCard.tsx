import React, { useState } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Wind,
  Gauge,
  User,
  Stethoscope,
  Clock,
  Sparkles,
  ArrowRight,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import TriageBadge from './TriageBadge';

export interface BedData {
  bed_id: number;
  dept_id: number;
  room_number: string;
  bed_label: string;
  ward_type: string;
  has_ventilator: boolean;
  has_oxygen_port: boolean;
  daily_tariff: number | string;
  operational_status: 'Available' | 'Occupied' | 'Sanitizing' | 'Out-Of-Service';
  dept_code: string;
  dept_name: string;
  floor_number: number;
  admission_id?: number | null;
  triage_priority?: number | null;
  admission_time?: string | null;
  admission_diagnosis?: string | null;
  patient_id?: number | null;
  national_health_id?: string | null;
  patient_name?: string | null;
  patient_gender?: string | null;
  patient_blood_group?: string | null;
  doctor_id?: number | null;
  doctor_name?: string | null;
  doctor_specialization?: string | null;
}

interface BedCardProps {
  bed: BedData;
  onStatusChange?: (bedId: number, newStatus: string) => void;
  onOpenDischargeModal?: (admissionId: number) => void;
}

export default function BedCard({ bed, onStatusChange, onOpenDischargeModal }: BedCardProps) {
  const [updating, setUpdating] = useState(false);

  const statusStyles = {
    Available: {
      pillBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotBg: 'bg-emerald-500',
      cardBorder: 'border-slate-200 hover:border-emerald-300',
      topBar: 'bg-emerald-500',
    },
    Occupied: {
      pillBg: 'bg-rose-100 text-rose-800 border-rose-300',
      dotBg: 'bg-rose-500',
      cardBorder: bed.triage_priority === 1
        ? 'border-red-400 ring-2 ring-red-400/40 shadow-red-100'
        : 'border-slate-200 hover:border-rose-300',
      topBar: bed.triage_priority === 1 ? 'bg-red-600' : 'bg-rose-500',
    },
    Sanitizing: {
      pillBg: 'bg-amber-100 text-amber-800 border-amber-300',
      dotBg: 'bg-amber-500 animate-pulse',
      cardBorder: 'border-slate-200 hover:border-amber-300',
      topBar: 'bg-amber-500',
    },
    'Out-Of-Service': {
      pillBg: 'bg-slate-100 text-slate-700 border-slate-300',
      dotBg: 'bg-slate-400',
      cardBorder: 'border-slate-200 opacity-75',
      topBar: 'bg-slate-400',
    },
  }[bed.operational_status] || {
    pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
    dotBg: 'bg-slate-500',
    cardBorder: 'border-slate-200',
    topBar: 'bg-slate-500',
  };

  const handleMarkCleaned = async () => {
    if (!onStatusChange) return;
    setUpdating(true);
    try {
      await onStatusChange(bed.bed_id, 'Available');
    } finally {
      setUpdating(false);
    }
  };

  const formattedTariff = Number(bed.daily_tariff).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  // Calculate length of stay if occupied
  const getStayTime = (timeStr?: string | null) => {
    if (!timeStr) return '';
    const diffMs = Date.now() - new Date(timeStr).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h stay`;
    }
    return `${hours}h stay`;
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border shadow-sm transition-all duration-200 hover:shadow-md ${statusStyles.cardBorder}`}
    >
      {/* Top status indicator stripe */}
      <div className={`h-1.5 w-full ${statusStyles.topBar}`} />

      <div className="p-4 sm:p-5">
        {/* Header: Room, Bed & Status Pill */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                {bed.room_number}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                {bed.bed_label}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {bed.dept_name} • Floor {bed.floor_number}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide ${statusStyles.pillBg}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusStyles.dotBg}`} />
            {bed.operational_status}
          </span>
        </div>

        {/* Equipment Badges & Tariff */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {bed.ward_type}
          </span>

          {bed.has_ventilator && (
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
              <Wind className="h-3 w-3" />
              Ventilator
            </span>
          )}

          {bed.has_oxygen_port && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
              <Gauge className="h-3 w-3" />
              O2 Port
            </span>
          )}

          <span className="ml-auto text-[11px] font-medium text-slate-500">
            ₹{formattedTariff}/day
          </span>
        </div>

        {/* Content depending on Bed Operational Status */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {bed.operational_status === 'Occupied' && (
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {bed.patient_name || 'Inpatient Admitted'}
                    </span>
                    {bed.patient_blood_group && (
                      <span className="rounded bg-rose-50 px-1 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                        {bed.patient_blood_group}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-slate-500 truncate">
                    {bed.national_health_id}
                  </p>
                </div>

                {bed.triage_priority && (
                  <TriageBadge priority={bed.triage_priority} size="sm" showLabel={true} />
                )}
              </div>

              {bed.doctor_name && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Stethoscope className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Attending: {bed.doctor_name}</span>
                </div>
              )}

              {bed.admission_diagnosis && (
                <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 line-clamp-2 border border-slate-100 italic">
                  &ldquo;{bed.admission_diagnosis}&rdquo;
                </p>
              )}

              {bed.admission_time && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{getStayTime(bed.admission_time)}</span>
                </div>
              )}
            </div>
          )}

          {bed.operational_status === 'Available' && (
            <div className="py-2 text-center">
              <p className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Sanitized & Ready for Emergency Intake
              </p>
            </div>
          )}

          {bed.operational_status === 'Sanitizing' && (
            <div className="py-2 text-center">
              <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                Sterilization & Disinfection in progress
              </p>
            </div>
          )}

          {bed.operational_status === 'Out-Of-Service' && (
            <div className="py-2 text-center">
              <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                Under Engineering Maintenance
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100">
        {bed.operational_status === 'Available' && (
          <Link
            href={`/admissions?bed_id=${bed.bed_id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <span>Admit Patient Here</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}

        {bed.operational_status === 'Occupied' && (
          <div className="flex items-center gap-2">
            <Link
              href={`/billing?admission_id=${bed.admission_id}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Discharge & Bill</span>
            </Link>
          </div>
        )}

        {bed.operational_status === 'Sanitizing' && (
          <button
            onClick={handleMarkCleaned}
            disabled={updating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{updating ? 'Updating...' : 'Mark Cleaned & Available'}</span>
          </button>
        )}

        {bed.operational_status === 'Out-Of-Service' && (
          <button
            onClick={handleMarkCleaned}
            disabled={updating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
          >
            <span>{updating ? 'Updating...' : 'Restore to Available'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
