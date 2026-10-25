'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserPlus,
  Stethoscope,
  BedDouble,
  AlertTriangle,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import TriageBadge, { TRIAGE_CONFIG } from '@/components/TriageBadge';
import QuickPatientModal from '@/components/QuickPatientModal';
import ClinicalAlertDialog from '@/components/ClinicalAlertDialog';

function AdmissionsContent() {
  const searchParams = useSearchParams();
  const preselectedBedId = searchParams.get('bed_id');

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [recentAdmissions, setRecentAdmissions] = useState<any[]>([]);

  // Toggles
  const [showAllBedsForTesting, setShowAllBedsForTesting] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    patient_id: '',
    bed_id: preselectedBedId || '',
    admitting_doctor_id: '',
    triage_priority: 3,
    admission_diagnosis: '',
  });

  // Clinical Alert Dialog State for Exclusion Violation / Constraints
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: any;
    severity?: 'error' | 'warning' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [patRes, docRes, bedRes, admRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/doctors?on_duty=true'),
        fetch('/api/beds'),
        fetch('/api/admissions'),
      ]);

      const [patData, docData, bedData, admData] = await Promise.all([
        patRes.json(),
        docRes.json(),
        bedRes.json(),
        admRes.json(),
      ]);

      if (patData.success) setPatients(patData.patients);
      if (docData.success) setDoctors(docData.doctors);
      if (bedData.success) setBeds(bedData.beds);
      if (admData.success) setRecentAdmissions(admData.admissions);

      // Preselect first on-duty doctor if none chosen
      if (docData.doctors && docData.doctors.length > 0 && !formData.admitting_doctor_id) {
        setFormData((prev) => ({ ...prev, admitting_doctor_id: String(docData.doctors[0].doctor_id) }));
      }
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to load reference clinical data',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (preselectedBedId) {
      setFormData((prev) => ({ ...prev, bed_id: preselectedBedId }));
    }
  }, [preselectedBedId]);

  // Filter beds according to toggle
  const availableBeds = beds.filter((b) => b.operational_status === 'Available');
  const displayedBeds = showAllBedsForTesting ? beds : availableBeds;

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      toast({ type: 'error', title: 'Patient Required', message: 'Please select a patient to admit.' });
      return;
    }
    if (!formData.bed_id) {
      toast({ type: 'error', title: 'Bed Required', message: 'Please select a bed for admission.' });
      return;
    }
    if (!formData.admitting_doctor_id) {
      toast({ type: 'error', title: 'Doctor Required', message: 'Please assign an admitting physician.' });
      return;
    }
    if (!formData.admission_diagnosis.trim()) {
      toast({ type: 'error', title: 'Diagnosis Required', message: 'Please enter clinical admission diagnosis.' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: parseInt(formData.patient_id, 10),
          bed_id: parseInt(formData.bed_id, 10),
          admitting_doctor_id: parseInt(formData.admitting_doctor_id, 10),
          triage_priority: formData.triage_priority,
          admission_diagnosis: formData.admission_diagnosis.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // CATCH POSTGRESQL CONSTRAINT VIOLATION & EXCLUSION CONSTRAINT
        const errDetails = data.details || {};
        const isDoubleBooking =
          errDetails.constraintName === 'ex_no_double_bed_booking' ||
          errDetails.code === '23P01' ||
          data.code === 'PATIENT_ALREADY_ADMITTED';

        // 1. Trigger prominent RED error toast
        toast({
          type: 'error',
          title: isDoubleBooking ? 'Exclusion Constraint Violated' : 'Admission Denied',
          message: data.error || 'The PostgreSQL database rejected this bed admission.',
          duration: 7000,
        });

        // 2. Open rich clinical alert dialog explaining the PostgreSQL violation
        setAlertDialog({
          isOpen: true,
          title: isDoubleBooking
            ? 'PostgreSQL Exclusion Constraint Violation [ex_no_double_bed_booking]'
            : 'Admission Database Conflict',
          message:
            data.error ||
            'PostgreSQL constraint ex_no_double_bed_booking caught an overlapping occupancy on this physical bed.',
          details: errDetails,
          severity: 'error',
        });
        return;
      }

      // Success
      toast({
        type: 'success',
        title: 'Patient Successfully Admitted',
        message: `${data.admission.patient_name} admitted to Room ${data.admission.room_number} (${data.admission.bed_label}) under Dr. ${data.admission.doctor_name}.`,
      });

      // Reset form
      setFormData({
        patient_id: '',
        bed_id: '',
        admitting_doctor_id: doctors[0] ? String(doctors[0].doctor_id) : '',
        triage_priority: 3,
        admission_diagnosis: '',
      });

      // Reload updated bed and admission states
      loadData();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Network / Server Error',
        message: err.message || 'Failed to submit admission request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentTriage = TRIAGE_CONFIG[formData.triage_priority as keyof typeof TRIAGE_CONFIG] || TRIAGE_CONFIG[3];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Quick Patient Registration Modal */}
      <QuickPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientCreated={(newPat) => {
          setPatients((prev) => [newPat, ...prev]);
          setFormData((prev) => ({ ...prev, patient_id: String(newPat.patient_id) }));
        }}
      />

      {/* Clinical Alert Dialog for Constraint Handling */}
      <ClinicalAlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        details={alertDialog.details}
        severity={alertDialog.severity}
      />

      {/* Page Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Emergency Admission Desk
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Immediate patient triage assessment, on-duty attending assignment, and bed allocation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              Trauma Intake Active
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Intake Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Patient Intake Form</h2>
                  <p className="text-xs text-slate-500">Atomic bed booking with exclusion conflict detection</p>
                </div>
              </div>

              {/* Exclusion constraint simulation toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={showAllBedsForTesting}
                  onChange={(e) => setShowAllBedsForTesting(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px]">
                  Show Occupied Beds{' '}
                  <span className="text-rose-600 font-bold">(Test Conflict)</span>
                </span>
              </label>
            </div>

            <form onSubmit={handleAdmissionSubmit} className="mt-6 space-y-5">
              {/* Patient Selection + Quick Register Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Select Patient *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPatientModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Quick-Register New Patient</span>
                  </button>
                </div>

                <select
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Choose Registered Inpatient or Emergency Arrival --</option>
                  {patients.map((pat) => (
                    <option key={pat.patient_id} value={pat.patient_id}>
                      {pat.full_name} ({pat.national_health_id}) • {pat.gender}, {pat.blood_group} • Phone: {pat.primary_phone}
                      {pat.active_admission_id ? ' [ALREADY ADMITTED]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selection (Filtered by on-duty) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Admitting Doctor (On-Duty Filtered) *
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {doctors.length} Physicians On Duty
                  </span>
                </div>

                <select
                  required
                  value={formData.admitting_doctor_id}
                  onChange={(e) => setFormData({ ...formData, admitting_doctor_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Active Attending Physician --</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.full_name} - {doc.specialization} ({doc.dept_name}) • Fee: ₹{Number(doc.consultation_fee).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bed Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. Allocate Bed *
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700">
                    {availableBeds.length} Available Beds
                  </span>
                </div>

                <select
                  required
                  value={formData.bed_id}
                  onChange={(e) => setFormData({ ...formData, bed_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Choose Physical Bed --</option>
                  {displayedBeds.map((bed) => {
                    const isOccupied = bed.operational_status === 'Occupied';
                    return (
                      <option
                        key={bed.bed_id}
                        value={bed.bed_id}
                        className={isOccupied ? 'text-red-700 bg-red-50 font-bold' : ''}
                      >
                        {bed.room_number} ({bed.bed_label}) - {bed.ward_type} - {bed.dept_name} [
                        {bed.operational_status}] • ₹{Number(bed.daily_tariff).toLocaleString('en-IN')}/day
                        {bed.has_ventilator ? ' • [VENTILATOR]' : ''}
                        {isOccupied ? ' ⚠️ OCCUPIED (WILL TRIGGER EXCLUSION CONFLICT)' : ''}
                      </option>
                    );
                  })}
                </select>

                {showAllBedsForTesting && (
                  <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⚠️ Conflict Testing Active: If you select an <strong>Occupied</strong> bed, PostgreSQL will reject the transaction via exclusion constraint <code className="font-mono font-bold">ex_no_double_bed_booking</code> and render a red alert toast.
                  </p>
                )}
              </div>

              {/* Triage ESI Slider */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    4. Emergency Severity Index (ESI Triage Slider)
                  </label>
                  <TriageBadge priority={formData.triage_priority} size="md" />
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.triage_priority}
                    onChange={(e) =>
                      setFormData({ ...formData, triage_priority: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="mt-2 flex justify-between text-[11px] font-bold">
                    <span className="text-red-600">1: Resuscitation</span>
                    <span className="text-orange-600">2: Emergent</span>
                    <span className="text-amber-600">3: Urgent</span>
                    <span className="text-blue-600">4: Less Urgent</span>
                    <span className="text-emerald-600">5: Non-Urgent</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-white p-2.5 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">{currentTriage.label}: </span>
                  {currentTriage.description}
                </div>
              </div>

              {/* Diagnosis Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  5. Admission Diagnosis & Clinical Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.admission_diagnosis}
                  onChange={(e) => setFormData({ ...formData, admission_diagnosis: e.target.value })}
                  placeholder="e.g., Acute ST-Elevation Myocardial Infarction (STEMI), presenting with diaphoresis and radiating chest pain..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{submitting ? 'Executing PostgreSQL Admission Transaction...' : 'Admit Patient & Lock Bed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Triage Reference & Active Admissions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Clinical Triage Protocol Reference Card */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
              <span>ESI Triage Priority Reference</span>
            </h3>

            <div className="mt-3 space-y-2">
              {Object.entries(TRIAGE_CONFIG).map(([level, cfg]) => (
                <div
                  key={level}
                  className={`flex items-start gap-2.5 rounded-xl p-2.5 text-xs border ${cfg.lightBg}`}
                >
                  <TriageBadge priority={parseInt(level, 10)} size="sm" showLabel={false} />
                  <div>
                    <span className="font-bold">{cfg.label}</span>
                    <p className="mt-0.5 text-[11px] opacity-90 leading-tight">{cfg.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Inpatients Snapshot */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Current Inpatients ({recentAdmissions.filter((a) => a.admission_status === 'Admitted').length})</span>
              </h3>
            </div>

            <div className="mt-3 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {recentAdmissions.filter((a) => a.admission_status === 'Admitted').length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No active admissions currently.</p>
              ) : (
                recentAdmissions
                  .filter((a) => a.admission_status === 'Admitted')
                  .map((adm) => (
                    <div key={adm.admission_id} className="py-3 text-xs first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{adm.patient_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            {adm.national_health_id}
                          </span>
                        </div>
                        <TriageBadge priority={adm.triage_priority} size="sm" />
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {adm.room_number} ({adm.bed_label})
                        </span>
                        <span>•</span>
                        <span>Dr. {adm.doctor_name}</span>
                      </div>

                      <p className="mt-1 text-[11px] text-slate-500 italic truncate">
                        &ldquo;{adm.admission_diagnosis}&rdquo;
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdmissionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Admission Desk...</div>}>
      <AdmissionsContent />
    </Suspense>
  );
}
