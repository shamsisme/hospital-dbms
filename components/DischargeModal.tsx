'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  X,
  Calendar,
  BedDouble,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useToast } from './ToastContext';

export interface InpatientBillingItem {
  admission_id: number;
  patient_id: number;
  national_health_id: string;
  patient_name: string;
  room_number: string;
  bed_label: string;
  ward_type: string;
  daily_tariff: number;
  dept_name: string;
  doctor_name: string;
  admission_time: string;
  billable_days: number;
  actual_days_elapsed: number;
  estimated_bed_charges: number;
  admission_diagnosis: string;
}

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inpatient: InpatientBillingItem | null;
  onDischargeSuccess: (invoice: any) => void;
}

export default function DischargeModal({
  isOpen,
  onClose,
  inpatient,
  onDischargeSuccess,
}: DischargeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Billing form inputs
  const [days, setDays] = useState<number>(1);
  const [bedCharges, setBedCharges] = useState<number>(0);
  const [procedureCharges, setProcedureCharges] = useState<number>(0);
  const [pharmacyCharges, setPharmacyCharges] = useState<number>(0);
  const [insuranceApproved, setInsuranceApproved] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>('Settled');
  const [nextBedStatus, setNextBedStatus] = useState<string>('Available');

  // Completed invoice state for receipt view
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (inpatient) {
      const billDays = inpatient.billable_days || 1;
      setDays(billDays);
      const calculatedBedCharges = billDays * Number(inpatient.daily_tariff);
      setBedCharges(calculatedBedCharges);
      setProcedureCharges(1500); // Standard clinical consultation & baseline diagnostics
      setPharmacyCharges(750);
      setInsuranceApproved(0);
      setDiscountPercent(0);
      setPaymentStatus('Settled');
      setNextBedStatus('Available');
      setCompletedInvoice(null);
      setError(null);
    }
  }, [inpatient]);

  if (!isOpen || !inpatient) return null;

  // Real-time calculations
  const grossAmount = bedCharges + procedureCharges + pharmacyCharges;
  const discountAmount = grossAmount * (discountPercent / 100);
  const netPayable = Math.max(0, grossAmount - insuranceApproved - discountAmount);

  const handleDaysChange = (newDays: number) => {
    const val = Math.max(1, newDays);
    setDays(val);
    setBedCharges(val * Number(inpatient.daily_tariff));
  };

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (insuranceApproved > grossAmount) {
        throw new Error('Insurance claim cannot exceed gross hospital billing.');
      }

      const res = await fetch('/api/billing/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_id: inpatient.admission_id,
          bed_charges: bedCharges,
          clinical_procedure_charges: procedureCharges,
          pharmacy_charges: pharmacyCharges,
          insurance_claim_approved: insuranceApproved,
          discount_percentage: discountPercent,
          payment_status: paymentStatus,
          next_bed_status: nextBedStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to discharge patient');
      }

      toast({
        type: 'success',
        title: 'Discharge Finalized',
        message: `${inpatient.patient_name} discharged. Bill #${data.invoice.bill_id} generated. Bed ${inpatient.room_number} (${inpatient.bed_label}) set to ${nextBedStatus}.`,
      });

      setCompletedInvoice(data.invoice);
      onDischargeSuccess(data.invoice);
    } catch (err: any) {
      setError(err.message || 'Error executing discharge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {!completedInvoice ? (
          <div>
            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Patient Discharge & Billing Terminal
                </h3>
                <p className="text-xs text-slate-500">
                  Admission #{inpatient.admission_id} • Enforce tariff audit and discharge clearance
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                <span className="font-bold">Discharge Failed: </span>
                {error}
              </div>
            )}

            {/* Inpatient Summary Card */}
            <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Patient Name</span>
                  <span className="font-bold text-slate-900 text-sm">{inpatient.patient_name}</span>
                  <span className="text-slate-500 font-mono text-[11px] block">{inpatient.national_health_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bed Assignment</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {inpatient.room_number} ({inpatient.bed_label})
                  </span>
                  <span className="text-slate-500 text-[11px] block">{inpatient.ward_type} • {inpatient.dept_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Admitting Physician</span>
                  <span className="font-bold text-slate-900 text-sm">{inpatient.doctor_name}</span>
                  <span className="text-slate-500 text-[11px] block italic truncate">{inpatient.admission_diagnosis}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleDischargeSubmit} className="mt-5 space-y-4">
              {/* Tariff & Length of stay computation */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-900">Length of Stay & Bed Tariff</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-blue-700">
                    Daily Tariff: ₹{Number(inpatient.daily_tariff).toLocaleString('en-IN')}/day
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Billable Days</label>
                    <input
                      type="number"
                      min={1}
                      value={days}
                      onChange={(e) => handleDaysChange(parseInt(e.target.value, 10) || 1)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Actual stay: {inpatient.actual_days_elapsed} days
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">Bed Charges Total</label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-mono font-bold text-slate-900">
                      ₹{bedCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      ({days} days × ₹{Number(inpatient.daily_tariff).toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>
              </div>

              {/* Procedure & Pharmacy charges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Clinical Procedure Charges (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={procedureCharges}
                    onChange={(e) => setProcedureCharges(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <span className="text-[10px] text-slate-500">Diagnostics, surgery, nursing</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Pharmacy Charges (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={pharmacyCharges}
                    onChange={(e) => setPharmacyCharges(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <span className="text-[10px] text-slate-500">Medications, IV fluids</span>
                </div>
              </div>

              {/* Insurance & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Insurance Claim Approved (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={grossAmount}
                    step="0.01"
                    value={insuranceApproved}
                    onChange={(e) => setInsuranceApproved(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  <span className="text-[10px] text-slate-500">Max: ₹{grossAmount.toLocaleString('en-IN')}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Discount % (Max 50%)
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-700">{discountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value, 10) || 0)}
                    className="mt-2 w-full accent-blue-600"
                  />
                  <span className="text-[10px] text-slate-500">Hospital concession discount</span>
                </div>
              </div>

              {/* Payment Status & Bed Release State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Settled">Settled (Full Payment Received)</option>
                    <option value="Unpaid">Unpaid (Awaiting Payment)</option>
                    <option value="Partially-Paid">Partially-Paid</option>
                    <option value="Insurance-Pending">Insurance-Pending (TPA approval)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Next Bed Status</label>
                  <select
                    value={nextBedStatus}
                    onChange={(e) => setNextBedStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Available">Available (Ready for next intake)</option>
                    <option value="Sanitizing">Sanitizing (Send for sterilization)</option>
                  </select>
                </div>
              </div>

              {/* Live Billing Totals Card */}
              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Amount (Bed + Proc + Pharm):</span>
                    <span className="font-mono text-slate-200">
                      ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>Discount ({discountPercent}%):</span>
                      <span className="font-mono">
                        - ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {insuranceApproved > 0 && (
                    <div className="flex justify-between text-emerald-300">
                      <span>Insurance Claim Approved:</span>
                      <span className="font-mono">
                        - ₹{insuranceApproved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-baseline justify-between">
                  <span className="font-bold text-sm text-slate-100">Net Patient Payable:</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-5 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {loading ? 'Processing Discharge...' : 'Confirm Discharge & Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Finalized Bill Receipt View */
          <div>
            <div className="text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Discharge Clearance Finalized</h3>
              <p className="text-xs text-slate-500">Official Hospital Tax Invoice & Discharge Receipt</p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-5 bg-white shadow-sm font-sans">
              <div className="flex justify-between border-b pb-3 text-xs">
                <div>
                  <p className="font-extrabold text-sm text-slate-900">CENTRALIZED HOSPITAL NETWORK</p>
                  <p className="text-slate-500">Emergency & Critical Inpatient Care</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-900">INVOICE #{completedInvoice.bill_id}</p>
                  <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-b text-xs">
                <div>
                  <p className="text-slate-500">Patient Details:</p>
                  <p className="font-bold text-slate-900">{completedInvoice.patient_name}</p>
                  <p className="font-mono text-slate-600">{completedInvoice.national_health_id}</p>
                </div>
                <div>
                  <p className="text-slate-500">Stay & Physician:</p>
                  <p className="font-bold text-slate-900">
                    {completedInvoice.room_number} ({completedInvoice.bed_label}) - {completedInvoice.ward_type}
                  </p>
                  <p className="text-slate-600">Dr. {completedInvoice.doctor_name}</p>
                </div>
              </div>

              <div className="py-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Bed Charges:</span>
                  <span className="font-mono font-semibold">₹{Number(completedInvoice.bed_charges).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Clinical Procedures:</span>
                  <span className="font-mono font-semibold">₹{Number(completedInvoice.clinical_procedure_charges).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Pharmacy Charges:</span>
                  <span className="font-mono font-semibold">₹{Number(completedInvoice.pharmacy_charges).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold">
                  <span>Gross Hospital Bill:</span>
                  <span className="font-mono">₹{Number(completedInvoice.gross_amount).toLocaleString('en-IN')}</span>
                </div>
                {Number(completedInvoice.discount_percentage) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount ({completedInvoice.discount_percentage}%):</span>
                    <span className="font-mono">- ₹{(Number(completedInvoice.gross_amount) * (Number(completedInvoice.discount_percentage) / 100)).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {Number(completedInvoice.insurance_claim_approved) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Insurance Approved:</span>
                    <span className="font-mono">- ₹{Number(completedInvoice.insurance_claim_approved).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 pt-2 text-sm font-black text-slate-900">
                  <span>Net Patient Payable:</span>
                  <span className="font-mono text-emerald-600">₹{Number(completedInvoice.net_patient_payable).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="mt-3 rounded bg-slate-50 p-2 text-center text-xs text-slate-600 font-medium">
                Status: <span className="font-bold text-emerald-700">{completedInvoice.payment_status}</span>
                {completedInvoice.settled_at && ` • Settled: ${new Date(completedInvoice.settled_at).toLocaleTimeString()}`}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Close Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
