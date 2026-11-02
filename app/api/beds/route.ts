import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const deptId = searchParams.get('dept_id');
    const status = searchParams.get('status');
    const wardType = searchParams.get('ward_type');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (deptId && deptId !== 'all') {
      conditions.push(`b.dept_id = $${paramIndex}`);
      params.push(parseInt(deptId, 10));
      paramIndex++;
    }

    if (status && status !== 'all') {
      conditions.push(`b.operational_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (wardType && wardType !== 'all') {
      conditions.push(`b.ward_type = $${paramIndex}`);
      params.push(wardType);
      paramIndex++;
    }

    if (search && search.trim() !== '') {
      conditions.push(`(
        b.room_number ILIKE $${paramIndex} OR 
        b.bed_label ILIKE $${paramIndex} OR 
        p.full_name ILIKE $${paramIndex} OR
        p.national_health_id ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        b.bed_id,
        b.dept_id,
        b.room_number,
        b.bed_label,
        b.ward_type,
        b.has_ventilator,
        b.has_oxygen_port,
        b.daily_tariff::numeric AS daily_tariff,
        b.operational_status,
        d.dept_code,
        d.dept_name,
        d.floor_number,
        a.admission_id,
        a.triage_priority,
        a.admission_time,
        a.admission_diagnosis,
        a.admission_status,
        p.patient_id,
        p.national_health_id,
        p.full_name AS patient_name,
        p.gender AS patient_gender,
        p.blood_group AS patient_blood_group,
        doc.doctor_id,
        doc.full_name AS doctor_name,
        doc.specialization AS doctor_specialization
      FROM wards_beds b
      INNER JOIN departments d ON b.dept_id = d.dept_id
      LEFT JOIN admissions a ON b.bed_id = a.bed_id AND a.discharge_time IS NULL AND a.admission_status = 'Admitted'
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      LEFT JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN b.operational_status = 'Occupied' THEN 1
          WHEN b.operational_status = 'Available' THEN 2
          WHEN b.operational_status = 'Sanitizing' THEN 3
          ELSE 4
        END,
        d.dept_name,
        b.room_number,
        b.bed_label
    `;

    const { rows } = await query(sql, params);

    return NextResponse.json({
      success: true,
      beds: rows,
      count: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch beds' },
      { status: 500 }
    );
  }
}
