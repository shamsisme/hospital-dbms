import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const sql = `
      SELECT 
        a.admission_id,
        a.patient_id,
        a.bed_id,
        a.admitting_doctor_id,
        a.triage_priority,
        a.admission_time,
        a.admission_status,
        a.admission_diagnosis,
        p.national_health_id,
        p.full_name AS patient_name,
        p.gender,
        p.dob,
        p.blood_group,
        p.primary_phone,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        b.room_number,
        b.bed_label,
        b.ward_type,
        b.has_ventilator,
        b.has_oxygen_port,
        b.daily_tariff::numeric AS daily_tariff,
        d.dept_id,
        d.dept_name,
        d.dept_code,
        doc.full_name AS doctor_name,
        doc.specialization AS doctor_specialization,
        -- Calculated length of stay in fractional days & whole days (min 1 day)
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.admission_time)) / 86400.0))::int AS billable_days,
        ROUND((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.admission_time)) / 86400.0)::numeric, 1) AS actual_days_elapsed,
        -- Estimated bed charges = billable_days * daily_tariff
        (GREATEST(1, CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.admission_time)) / 86400.0)) * b.daily_tariff)::numeric AS estimated_bed_charges
      FROM admissions a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      INNER JOIN wards_beds b ON a.bed_id = b.bed_id
      INNER JOIN departments d ON b.dept_id = d.dept_id
      INNER JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      WHERE a.discharge_time IS NULL AND a.admission_status = 'Admitted'
      ORDER BY a.admission_time ASC
    `;

    const { rows } = await query(sql);

    return NextResponse.json({
      success: true,
      activeInpatients: rows,
      count: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch active inpatients' },
      { status: 500 }
    );
  }
}
