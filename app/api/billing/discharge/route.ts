import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { formatPgError } from '@/lib/db-errors';

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      admission_id,
      bed_charges = 0,
      clinical_procedure_charges = 0,
      pharmacy_charges = 0,
      insurance_claim_approved = 0,
      discount_percentage = 0,
      payment_status = 'Settled',
      next_bed_status = 'Available', // or 'Sanitizing'
    } = body;

    if (!admission_id) {
      return NextResponse.json(
        { success: false, error: 'Admission ID is required' },
        { status: 400 }
      );
    }

    const bedChargesNum = Math.max(0, parseFloat(bed_charges) || 0);
    const procChargesNum = Math.max(0, parseFloat(clinical_procedure_charges) || 0);
    const pharmChargesNum = Math.max(0, parseFloat(pharmacy_charges) || 0);
    const grossAmountCalculated = bedChargesNum + procChargesNum + pharmChargesNum;

    const insuranceNum = Math.max(0, parseFloat(insurance_claim_approved) || 0);
    if (insuranceNum > grossAmountCalculated) {
      return NextResponse.json(
        {
          success: false,
          error: `Insurance claim approved ($${insuranceNum}) cannot exceed the gross hospital bill ($${grossAmountCalculated}).`,
        },
        { status: 400 }
      );
    }

    const discountNum = Math.max(0, Math.min(50, parseFloat(discount_percentage) || 0));

    // Verify admission exists and is still active
    const admCheck = await client.query(
      `SELECT admission_id, patient_id, bed_id, admission_status FROM admissions WHERE admission_id = $1`,
      [admission_id]
    );

    if (admCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Admission record not found' },
        { status: 404 }
      );
    }

    const admission = admCheck.rows[0];
    if (admission.admission_status === 'Discharged') {
      return NextResponse.json(
        { success: false, error: 'Patient is already discharged from this admission.' },
        { status: 400 }
      );
    }

    // Begin atomic discharge and billing transaction
    await client.query('BEGIN');

    // 1. Update admission to 'Discharged' with discharge_time = NOW()
    const updateAdmRes = await client.query(
      `UPDATE admissions 
       SET admission_status = 'Discharged', 
           discharge_time = CURRENT_TIMESTAMP 
       WHERE admission_id = $1 
       RETURNING *`,
      [admission_id]
    );

    // 2. Update bed operational_status to 'Available' (or 'Sanitizing')
    const finalBedStatus = next_bed_status === 'Sanitizing' ? 'Sanitizing' : 'Available';
    await client.query(
      `UPDATE wards_beds 
       SET operational_status = $1 
       WHERE bed_id = $2`,
      [finalBedStatus, admission.bed_id]
    );

    // 3. Insert into Billing (PostgreSQL computes gross_amount & net_patient_payable stored generated columns)
    // Constraint chk_settled_time: settled_at MUST be set if payment_status is 'Settled', and NULL otherwise
    const settledAtVal = payment_status === 'Settled' ? 'CURRENT_TIMESTAMP' : null;

    const billingSql = `
      INSERT INTO billing (
        admission_id,
        bed_charges,
        clinical_procedure_charges,
        pharmacy_charges,
        insurance_claim_approved,
        discount_percentage,
        payment_status,
        settled_at
      ) VALUES (
        $1, 
        $2, 
        $3, 
        $4, 
        $5, 
        $6, 
        $7, 
        ${settledAtVal ? 'CURRENT_TIMESTAMP' : 'NULL'}
      )
      RETURNING *
    `;

    const billingRes = await client.query(billingSql, [
      admission_id,
      bedChargesNum.toFixed(2),
      procChargesNum.toFixed(2),
      pharmChargesNum.toFixed(2),
      insuranceNum.toFixed(2),
      discountNum.toFixed(2),
      payment_status,
    ]);

    await client.query('COMMIT');

    // Fetch complete bill invoice with patient & doctor info for receipt display
    const invoiceQuery = await client.query(
      `SELECT 
        b.bill_id,
        b.admission_id,
        b.bed_charges::numeric,
        b.clinical_procedure_charges::numeric,
        b.pharmacy_charges::numeric,
        b.gross_amount::numeric,
        b.insurance_claim_approved::numeric,
        b.discount_percentage::numeric,
        b.net_patient_payable::numeric,
        b.payment_status,
        b.settled_at,
        p.full_name AS patient_name,
        p.national_health_id,
        wb.room_number,
        wb.bed_label,
        wb.ward_type,
        d.dept_name,
        doc.full_name AS doctor_name,
        a.admission_time,
        a.discharge_time,
        a.admission_diagnosis
      FROM billing b
      JOIN admissions a ON b.admission_id = a.admission_id
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN wards_beds wb ON a.bed_id = wb.bed_id
      JOIN departments d ON wb.dept_id = d.dept_id
      JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      WHERE b.bill_id = $1`,
      [billingRes.rows[0].bill_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Patient discharged and billing finalized successfully',
      invoice: invoiceQuery.rows[0],
      admission: updateAdmRes.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    const formatted = formatPgError(error);
    return NextResponse.json(
      {
        success: false,
        error: formatted.message,
        details: formatted,
      },
      { status: 400 }
    );
  } finally {
    client.release();
  }
}
