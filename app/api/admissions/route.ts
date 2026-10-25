import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { formatPgError } from '@/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // e.g. 'Admitted' or null
    const search = searchParams.get('q');

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`a.admission_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search && search.trim() !== '') {
      conditions.push(`(
        p.full_name ILIKE $${paramIndex} OR
        p.national_health_id ILIKE $${paramIndex} OR
        b.room_number ILIKE $${paramIndex} OR
        b.bed_label ILIKE $${paramIndex} OR
        doc.full_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        a.admission_id,
        a.patient_id,
        a.bed_id,
        a.admitting_doctor_id,
        a.triage_priority,
        a.admission_time,
        a.discharge_time,
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
        b.operational_status AS bed_operational_status,
        d.dept_id,
        d.dept_name,
        d.dept_code,
        doc.license_no AS doctor_license,
        doc.full_name AS doctor_name,
        doc.specialization AS doctor_specialization,
        bill.bill_id,
        bill.gross_amount::numeric AS gross_amount,
        bill.net_patient_payable::numeric AS net_patient_payable,
        bill.payment_status,
        EXTRACT(EPOCH FROM (COALESCE(a.discharge_time, CURRENT_TIMESTAMP) - a.admission_time))::numeric AS stay_seconds
      FROM admissions a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      INNER JOIN wards_beds b ON a.bed_id = b.bed_id
      INNER JOIN departments d ON b.dept_id = d.dept_id
      INNER JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      LEFT JOIN billing bill ON a.admission_id = bill.admission_id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.admission_status = 'Admitted' THEN 0 ELSE 1 END,
        a.triage_priority ASC,
        a.admission_time DESC
    `;

    const { rows } = await query(sql, params);

    return NextResponse.json({ success: true, admissions: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch admissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      patient_id,
      bed_id,
      admitting_doctor_id,
      triage_priority,
      admission_diagnosis,
    } = body;

    // Validate inputs
    if (!patient_id || !bed_id || !admitting_doctor_id || !admission_diagnosis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required admission fields: patient_id, bed_id, admitting_doctor_id, admission_diagnosis',
        },
        { status: 400 }
      );
    }

    const triageNum = parseInt(triage_priority, 10) || 3;
    if (triageNum < 1 || triageNum > 5) {
      return NextResponse.json(
        { success: false, error: 'Triage priority must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if patient already has an active admission
    const activePatCheck = await client.query(
      `SELECT a.admission_id, b.room_number, b.bed_label 
       FROM admissions a
       JOIN wards_beds b ON a.bed_id = b.bed_id
       WHERE a.patient_id = $1 AND a.discharge_time IS NULL AND a.admission_status = 'Admitted'`,
      [patient_id]
    );

    if (activePatCheck.rows.length > 0) {
      const activeAdm = activePatCheck.rows[0];
      return NextResponse.json(
        {
          success: false,
          error: `Patient is already admitted to Bed ${activeAdm.room_number} (${activeAdm.bed_label}). Discharge current stay before admitting to a new bed.`,
          code: 'PATIENT_ALREADY_ADMITTED',
        },
        { status: 409 }
      );
    }

    // Begin atomic transaction
    await client.query('BEGIN');

    // Attempt insert into admissions (triggers ex_no_double_bed_booking if bed is overlapping)
    const insertAdmissionSql = `
      INSERT INTO admissions (
        patient_id,
        bed_id,
        admitting_doctor_id,
        triage_priority,
        admission_time,
        admission_status,
        admission_diagnosis
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Admitted', $5)
      RETURNING *
    `;

    const admissionResult = await client.query(insertAdmissionSql, [
      patient_id,
      bed_id,
      admitting_doctor_id,
      triageNum,
      admission_diagnosis.trim(),
    ]);

    // Update bed status to 'Occupied'
    await client.query(
      `UPDATE wards_beds SET operational_status = 'Occupied' WHERE bed_id = $1`,
      [bed_id]
    );

    await client.query('COMMIT');

    // Fetch newly created admission with joined details
    const detailRes = await client.query(
      `SELECT 
        a.admission_id,
        a.triage_priority,
        a.admission_time,
        a.admission_status,
        a.admission_diagnosis,
        p.full_name AS patient_name,
        p.national_health_id,
        b.room_number,
        b.bed_label,
        b.ward_type,
        doc.full_name AS doctor_name,
        d.dept_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN wards_beds b ON a.bed_id = b.bed_id
      JOIN departments d ON b.dept_id = d.dept_id
      JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      WHERE a.admission_id = $1`,
      [admissionResult.rows[0].admission_id]
    );

    return NextResponse.json(
      {
        success: true,
        admission: detailRes.rows[0] || admissionResult.rows[0],
        message: 'Patient admitted successfully into bed',
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    const formatted = formatPgError(error);
    return NextResponse.json(
      {
        success: false,
        error: formatted.message,
        details: formatted,
      },
      { status: 409 }
    );
  } finally {
    client.release();
  }
}
