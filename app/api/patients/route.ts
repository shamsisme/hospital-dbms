import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatPgError } from '@/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');

    let sql = `
      SELECT 
        p.patient_id,
        p.national_health_id,
        p.full_name,
        p.gender,
        p.dob,
        p.blood_group,
        p.primary_phone,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        (
          SELECT a.admission_id 
          FROM admissions a 
          WHERE a.patient_id = p.patient_id AND a.discharge_time IS NULL AND a.admission_status = 'Admitted'
          LIMIT 1
        ) AS active_admission_id
      FROM patients p
    `;

    const params: any[] = [];
    if (search && search.trim() !== '') {
      sql += ` WHERE p.full_name ILIKE $1 OR p.national_health_id ILIKE $1 OR p.primary_phone ILIKE $1`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY p.patient_id DESC`;

    const { rows } = await query(sql, params);
    return NextResponse.json({ success: true, patients: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const {
      national_health_id,
      full_name,
      gender,
      dob,
      blood_group,
      primary_phone,
      emergency_contact_name,
      emergency_contact_phone,
    } = body;

    // Basic front validation
    if (!national_health_id || !full_name || !gender || !dob || !blood_group || !primary_phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required patient fields: national_health_id, full_name, gender, dob, blood_group, primary_phone',
        },
        { status: 400 }
      );
    }

    // Phone format sanitization (must be 10 digits to satisfy chk_pat_phone)
    const sanitizedPhone = String(primary_phone).replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Primary phone number must be exactly 10 digits.',
        },
        { status: 400 }
      );
    }

    const sanitizedEmergencyPhone = emergency_contact_phone
      ? String(emergency_contact_phone).replace(/\D/g, '')
      : null;

    const sql = `
      INSERT INTO patients (
        national_health_id,
        full_name,
        gender,
        dob,
        blood_group,
        primary_phone,
        emergency_contact_name,
        emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      national_health_id.trim().toUpperCase(),
      full_name.trim(),
      gender.toUpperCase(),
      dob,
      blood_group,
      sanitizedPhone,
      emergency_contact_name ? emergency_contact_name.trim() : null,
      sanitizedEmergencyPhone,
    ];

    const { rows } = await query(sql, params);

    return NextResponse.json(
      {
        success: true,
        patient: rows[0],
        message: 'Patient registered successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    const formatted = formatPgError(error);
    return NextResponse.json(
      {
        success: false,
        error: formatted.message,
        details: formatted,
      },
      { status: formatted.isConstraintError ? 409 : 500 }
    );
  }
}
