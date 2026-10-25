'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  DollarSign,
  Users,
  BedDouble,
  RefreshCw,
  ShieldCheck,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import { useToast } from '@/components/ToastContext';

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    departmentCapacity: any[];
    wardTypeDistribution: any[];
    kpis: any;
  } | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch analytics');
      }
      setData(json);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Analytics Query Failed',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpis = data?.kpis;
  const departments = data?.departmentCapacity || [];
  const wardTypes = data?.wardTypeDistribution || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Departmental Capacity & Clinical Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              SQL aggregate reporting of floor capacity, occupancy saturation, and hospital revenue metrics.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Aggregates</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Bed Occupancy"
          value={`${kpis ? kpis.overallOccupancyPct : 0}%`}
          subtitle={`${kpis ? kpis.total_occupied : 0} of ${kpis ? kpis.total_beds : 0} Total Beds Occupied`}
          icon={BedDouble}
          variant={kpis && kpis.overallOccupancyPct > 80 ? 'rose' : 'blue'}
          badge="Live Hospital Census"
        />

        <MetricCard
          title="Active Inpatients"
          value={kpis ? kpis.total_active_admissions : 0}
          subtitle="Currently receiving inpatient care"
          icon={Users}
          variant="emerald"
          badge="Inpatient Care"
        />

        <MetricCard
          title="Gross Billed Revenue"
          value={`₹${kpis ? Number(kpis.total_gross_billed).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}`}
          subtitle={`${kpis ? kpis.settled_bills_count : 0} Settled Bills • ${kpis ? kpis.pending_bills_count : 0} Pending`}
          icon={DollarSign}
          variant="slate"
          badge="Hospital Revenue"
        />

        <MetricCard
          title="Net Patient Collections"
          value={`₹${kpis ? Number(kpis.total_net_payable).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}`}
          subtitle={`₹${kpis ? Number(kpis.total_insurance_claimed).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0} Insurance Claimed`}
          icon={TrendingUp}
          variant="emerald"
          badge="Net Payable"
        />
      </div>

      {/* Main Requirement: Department-wise SQL Aggregate Summary Table */}
      <div className="mt-8 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span>Departmental Capacity & Revenue Summary</span>
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated from departments, wards_beds, admissions, and billing via parameterized SQL group queries.
            </p>
          </div>

          <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            SQL: GROUP BY d.dept_id
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Floor</th>
                <th className="px-5 py-3.5">Total Beds</th>
                <th className="px-5 py-3.5">Occupied</th>
                <th className="px-5 py-3.5">Bed Occupancy Rate %</th>
                <th className="px-5 py-3.5">Active Inpatients</th>
                <th className="px-5 py-3.5">Gross Revenue Billed</th>
                <th className="px-5 py-3.5">Net Collected</th>
                <th className="px-5 py-3.5">Staffing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    Executing SQL aggregate analytics...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    No departmental data found in database.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => {
                  const occRate = Number(dept.occupancy_rate_pct);
                  const isHigh = occRate >= 80;
                  const isMedium = occRate >= 50 && occRate < 80;

                  return (
                    <tr key={dept.dept_id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{dept.dept_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {dept.dept_code} • Hotline: {dept.emergency_contact}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-700">
                        Floor {dept.floor_number}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {dept.total_beds}
                      </td>

                      <td className="px-5 py-4 font-semibold text-rose-600">
                        {dept.occupied_beds}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, occRate)}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              isHigh
                                ? 'text-rose-700'
                                : isMedium
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {occRate}%
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200">
                          {dept.active_admissions} active
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        ₹{Number(dept.total_revenue_billed).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        ₹{Number(dept.total_net_patient_payable).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800">{dept.on_duty_doctors}</span> / {dept.total_doctors} doctors on-duty
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Aggregation: Ward Type Distribution */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Ward Type Capacity & Tariff Distribution</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Bed categorization by clinical specialty and life-support readiness.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {wardTypes.map((ward) => (
              <div key={ward.ward_type} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{ward.ward_type}</span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {ward.ventilator_equipped > 0 && `${ward.ventilator_equipped} Ventilators equipped • `}
                    Avg Tariff: ₹{Number(ward.avg_daily_tariff).toLocaleString('en-IN')}/day
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 font-mono font-bold">
                    <span className="text-rose-600">{ward.occupied_beds} occupied</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-700">{ward.total_beds} total</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {ward.available_beds} Available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Operations Summary */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Database Integrity & Exclusion Enforcement</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Summary of PostgreSQL constraints protecting patient safety and hospital ops.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold font-mono text-slate-900">ex_no_double_bed_booking:</span>
                <p className="text-slate-600 mt-0.5">
                  GiST exclusion constraint on <code className="text-blue-700 font-mono">(bed_id WITH =, stay_duration_range WITH &&)</code> completely prevents double-booking of any hospital bed across overlapping stay intervals.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold font-mono text-slate-900">chk_critical_infra:</span>
                <p className="text-slate-600 mt-0.5">
                  Enforces that all ICU and CCU beds must have <code className="text-blue-700 font-mono">has_ventilator = true</code> and <code className="text-blue-700 font-mono">has_oxygen_port = true</code> prior to patient allocation.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold font-mono text-slate-900">chk_settled_time:</span>
                <p className="text-slate-600 mt-0.5">
                  Guarantees that timestamp <code className="text-blue-700 font-mono">settled_at</code> is non-null only when bill payment status is strictly &lsquo;Settled&rsquo;.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Connection: pg native pool (20 clients max)</span>
            <span className="text-emerald-600 font-bold">Database Health: Optimal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
