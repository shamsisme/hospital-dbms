import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await query(`
      SELECT 
        d.dept_id,
        d.dept_code,
        d.dept_name,
        d.floor_number,
        d.emergency_contact,
        d.annual_budget::numeric AS annual_budget,
        COUNT(b.bed_id)::int AS total_beds,
        COUNT(b.bed_id) FILTER (WHERE b.operational_status = 'Occupied')::int AS occupied_beds,
        COUNT(b.bed_id) FILTER (WHERE b.operational_status = 'Available')::int AS available_beds
      FROM departments d
      LEFT JOIN wards_beds b ON d.dept_id = b.dept_id
      GROUP BY d.dept_id
      ORDER BY d.dept_id
    `);

    return NextResponse.json({ success: true, departments: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
