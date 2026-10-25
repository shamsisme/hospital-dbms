'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Users,
  AlertTriangle,
  HeartPulse,
  Wind,
  Filter,
  Search,
  RefreshCw,
  PlusCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import BedCard, { BedData } from '@/components/BedCard';
import { useToast } from '@/components/ToastContext';
import ClinicalAlertDialog from '@/components/ClinicalAlertDialog';

export default function DashboardPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [beds, setBeds] = useState<BedData[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedWardType, setSelectedWardType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Alert dialog
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, bedsRes, deptsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/beds?dept_id=${selectedDept}&status=${selectedStatus}&ward_type=${selectedWardType}&search=${encodeURIComponent(searchQuery)}`),
        fetch('/api/departments'),
      ]);

      const [statsData, bedsData, deptsData] = await Promise.all([
        statsRes.json(),
        bedsRes.json(),
        deptsRes.json(),
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (bedsData.success) setBeds(bedsData.beds);
      if (deptsData.success) setDepartments(deptsData.departments);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to communicate with PostgreSQL hospital_db.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDept, selectedStatus, selectedWardType, searchQuery, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBedStatusUpdate = async (bedId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/beds/${bedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operational_status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAlertDialog({
          isOpen: true,
          title: 'Bed Status Update Denied',
          message: data.error || 'Failed to update bed status.',
          details: data.details,
        });
        return;
      }

      toast({
        type: 'success',
        title: 'Bed Status Updated',
        message: `Bed operational status changed to ${newStatus}.`,
      });

      fetchData(true);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Update Error',
        message: err.message,
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Alert Dialog */}
      <ClinicalAlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        details={alertDialog.details}
      />

      {/* Page Title & Emergency Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Bed Occupancy & Triage Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time floor grid, critical ICU reserves, and clinical occupancy triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Grid'}</span>
          </button>

          <Link
            href="/admissions"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Emergency Admission</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Section */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Physical Beds"
          value={stats ? stats.totalBeds : '...'}
          subtitle={`${stats ? stats.availableBeds : 0} Sanitized & Ready`}
          icon={BedDouble}
          variant="blue"
          badge={`${stats ? stats.occupancyRate : 0}% Occupied`}
        />

        <MetricCard
          title="Occupied Beds"
          value={stats ? stats.occupiedBeds : '...'}
          subtitle={`${stats ? stats.activeInpatients : 0} Admitted Patients`}
          icon={Users}
          variant="rose"
          badge="Inpatients"
        />

        <MetricCard
          title="Available ICU Beds"
          value={stats ? stats.availableIcuBeds : '...'}
          subtitle={`Out of ${stats ? stats.totalIcuBeds : 0} Total Critical Beds`}
          icon={HeartPulse}
          variant="emerald"
          badge="Critical Care"
        />

        <MetricCard
          title="Critical Triage (ESI 1-2)"
          value={stats ? stats.criticalTriageCount : '...'}
          subtitle={`ESI 1 (Resus): ${stats ? stats.esi1Resus : 0} • ESI 2: ${stats ? stats.esi2Emergent : 0}`}
          icon={AlertTriangle}
          variant={stats && stats.criticalTriageCount > 0 ? 'amber' : 'slate'}
          badge="High Alert"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.dept_id} value={dept.dept_id}>
                    {dept.dept_code} - {dept.dept_name} ({dept.total_beds} beds)
                  </option>
                ))}
              </select>
            </div>

            {/* Operational Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available Only</option>
                <option value="Occupied">Occupied Only</option>
                <option value="Sanitizing">Sanitizing Only</option>
                <option value="Out-Of-Service">Out-Of-Service</option>
              </select>
            </div>

            {/* Ward Type Filter */}
            <select
              value={selectedWardType}
              onChange={(e) => setSelectedWardType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Ward Types</option>
              <option value="ICU">ICU (Intensive Care)</option>
              <option value="General">General Ward</option>
              <option value="Pediatric">Pediatric</option>
              <option value="Semi-Private">Semi-Private</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search room, bed, or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick status count pills bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Count:</span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`rounded-full px-2.5 py-0.5 font-bold transition ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({stats?.totalBeds || beds.length})
          </button>
          <button
            onClick={() => setSelectedStatus('Available')}
            className={`rounded-full px-2.5 py-0.5 font-bold transition ${
              selectedStatus === 'Available'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Available ({stats?.availableBeds || 0})
          </button>
          <button
            onClick={() => setSelectedStatus('Occupied')}
            className={`rounded-full px-2.5 py-0.5 font-bold transition ${
              selectedStatus === 'Occupied'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Occupied ({stats?.occupiedBeds || 0})
          </button>
          <button
            onClick={() => setSelectedStatus('Sanitizing')}
            className={`rounded-full px-2.5 py-0.5 font-bold transition ${
              selectedStatus === 'Sanitizing'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Sanitizing ({stats?.sanitizingBeds || 0})
          </button>
        </div>
      </div>

      {/* Visual Bed Grid */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-white p-5 border border-slate-200 animate-pulse"
              >
                <div className="h-6 w-24 bg-slate-200 rounded" />
                <div className="mt-3 h-4 w-36 bg-slate-100 rounded" />
                <div className="mt-6 h-20 bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : beds.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <BedDouble className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-800">No beds matched filters</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your department, status, or search query filters above.
            </p>
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedStatus('all');
                setSelectedWardType('all');
                setSearchQuery('');
              }}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {beds.map((bed) => (
              <BedCard
                key={bed.bed_id}
                bed={bed}
                onStatusChange={handleBedStatusUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
