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
        b.bill_id,
        b.admission_id,
        b.bed_charges::numeric AS bed_charges,
        b.clinical_procedure_charges::numeric AS clinical_procedure_charges,
        b.pharmacy_charges::numeric AS pharmacy_charges,
        b.gross_amount::numeric AS gross_amount,
        b.insurance_claim_approved::numeric AS insurance_claim_approved,
        b.discount_percentage::numeric AS discount_percentage,
        b.net_patient_payable::numeric AS net_patient_payable,
        b.payment_status,
        b.settled_at,
        p.patient_id,
        p.national_health_id,
        p.full_name AS patient_name,
        p.primary_phone,
        wb.room_number,
        wb.bed_label,
        wb.ward_type,
        d.dept_name,
        doc.full_name AS doctor_name,
        a.admission_time,
        a.discharge_time,
        a.admission_diagnosis
      FROM billing b
      INNER JOIN admissions a ON b.admission_id = a.admission_id
      INNER JOIN patients p ON a.patient_id = p.patient_id
      INNER JOIN wards_beds wb ON a.bed_id = wb.bed_id
      INNER JOIN departments d ON wb.dept_id = d.dept_id
      INNER JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      ORDER BY b.bill_id DESC
    `;

    const { rows } = await query(sql);

    return NextResponse.json({
      success: true,
      invoices: rows,
      count: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
