'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  BedDouble,
  DollarSign,
  Printer,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import DischargeModal, { InpatientBillingItem } from '@/components/DischargeModal';
import { useToast } from '@/components/ToastContext';

function BillingTerminalContent() {
  const searchParams = useSearchParams();
  const preselectedAdmissionId = searchParams.get('admission_id');

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeInpatients, setActiveInpatients] = useState<InpatientBillingItem[]>([]);
  const [pastInvoices, setPastInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'invoices'>('active');

  // Modal State
  const [selectedInpatient, setSelectedInpatient] = useState<InpatientBillingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [actRes, invRes] = await Promise.all([
        fetch('/api/billing/active'),
        fetch('/api/billing/invoices'),
      ]);

      const [actData, invData] = await Promise.all([actRes.json(), invRes.json()]);

      if (actData.success) {
        setActiveInpatients(actData.activeInpatients);

        // Preselect if requested via query param
        if (preselectedAdmissionId) {
          const match = actData.activeInpatients.find(
            (item: InpatientBillingItem) => String(item.admission_id) === String(preselectedAdmissionId)
          );
          if (match) {
            setSelectedInpatient(match);
            setIsModalOpen(true);
          }
        }
      }

      if (invData.success) {
        setPastInvoices(invData.invoices);
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Billing Load Error',
        message: err.message || 'Failed to fetch billing records.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [preselectedAdmissionId]);

  const handleOpenDischarge = (inpatient: InpatientBillingItem) => {
    setSelectedInpatient(inpatient);
    setIsModalOpen(true);
  };

  const handleDischargeSuccess = (invoice: any) => {
    // Reload data to reflect discharged patient and newly created invoice
    loadBillingData();
  };

  const filteredInpatients = activeInpatients.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patient_name.toLowerCase().includes(q) ||
      item.national_health_id.toLowerCase().includes(q) ||
      item.room_number.toLowerCase().includes(q) ||
      item.doctor_name.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = pastInvoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.patient_name.toLowerCase().includes(q) ||
      inv.national_health_id.toLowerCase().includes(q) ||
      String(inv.bill_id).includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Discharge & Billing Modal */}
      <DischargeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inpatient={selectedInpatient}
        onDischargeSuccess={handleDischargeSuccess}
      />

      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Patient Discharge & Billing Terminal
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time length-of-stay tracking, automated bed tariff calculation, insurance deductions, and clinical clearance.
            </p>
          </div>

          <button
            onClick={loadBillingData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Inpatient Census</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 sm:border-0 sm:pb-0">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'active'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Active Inpatients ({activeInpatients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Settled & Historical Invoices ({pastInvoices.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, NHID, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Content Table Area */}
      <div className="mt-6">
        {activeTab === 'active' ? (
          /* Active Inpatients Table */
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Active Hospital Census ({filteredInpatients.length} Inpatients)
                </h3>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Discharge & Generate Bill&rdquo; to calculate bed charges and release bed in an atomic transaction.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Patient / NHID</th>
                    <th className="px-5 py-3.5">Assigned Bed & Ward</th>
                    <th className="px-5 py-3.5">Admitting Physician</th>
                    <th className="px-5 py-3.5">Admission Date</th>
                    <th className="px-5 py-3.5">Length of Stay</th>
                    <th className="px-5 py-3.5">Daily Tariff</th>
                    <th className="px-5 py-3.5">Est. Bed Charges</th>
                    <th className="px-5 py-3.5 text-right">Clearance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInpatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        {loading ? 'Loading active census...' : 'No active inpatients found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInpatients.map((item) => (
                      <tr key={item.admission_id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-sm">{item.patient_name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{item.national_health_id}</div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {item.room_number} <span className="font-mono text-xs">({item.bed_label})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{item.ward_type} • {item.dept_name}</div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{item.doctor_name}</div>
                          <div className="text-[11px] text-slate-500 italic max-w-xs truncate">
                            {item.admission_diagnosis}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-700">
                            {new Date(item.admission_time).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(item.admission_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3" />
                            {item.billable_days} {item.billable_days === 1 ? 'day' : 'days'}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            ({item.actual_days_elapsed}d actual)
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                          ₹{Number(item.daily_tariff).toLocaleString('en-IN')}/day
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          ₹{Number(item.estimated_bed_charges).toLocaleString('en-IN')}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenDischarge(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Discharge & Bill</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Settled Invoices Table */
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-900">Historical Hospital Invoices</h3>
              <p className="text-xs text-slate-500">Audit trail of discharged admissions and generated bills.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Bill ID</th>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">Discharge Bed</th>
                    <th className="px-5 py-3.5">Bed Charges</th>
                    <th className="px-5 py-3.5">Gross Bill</th>
                    <th className="px-5 py-3.5">Insurance / Discount</th>
                    <th className="px-5 py-3.5">Net Payable</th>
                    <th className="px-5 py-3.5">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        No billing invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.bill_id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-mono font-bold text-blue-600">
                          #{inv.bill_id}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{inv.patient_name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{inv.national_health_id}</div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {inv.room_number} ({inv.bed_label})
                          </div>
                          <div className="text-[11px] text-slate-500">{inv.ward_type} • {inv.dept_name}</div>
                        </td>

                        <td className="px-5 py-4 font-mono text-slate-700">
                          ₹{Number(inv.bed_charges).toLocaleString('en-IN')}
                        </td>

                        <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                          ₹{Number(inv.gross_amount).toLocaleString('en-IN')}
                        </td>

                        <td className="px-5 py-4 text-[11px]">
                          {Number(inv.insurance_claim_approved) > 0 && (
                            <span className="block text-emerald-700 font-mono">
                              Ins: ₹{Number(inv.insurance_claim_approved).toLocaleString('en-IN')}
                            </span>
                          )}
                          {Number(inv.discount_percentage) > 0 && (
                            <span className="block text-amber-700 font-mono">
                              Disc: {inv.discount_percentage}%
                            </span>
                          )}
                          {Number(inv.insurance_claim_approved) === 0 && Number(inv.discount_percentage) === 0 && (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono font-black text-slate-900 text-sm">
                          ₹{Number(inv.net_patient_payable).toLocaleString('en-IN')}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              inv.payment_status === 'Settled'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : inv.payment_status === 'Unpaid'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Billing Terminal...</div>}>
      <BillingTerminalContent />
    </Suspense>
  );
}
