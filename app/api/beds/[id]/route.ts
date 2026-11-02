import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatPgError } from '@/lib/db-errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const bedId = parseInt(params.id, 10);
    if (isNaN(bedId)) {
      return NextResponse.json({ success: false, error: 'Invalid bed ID' }, { status: 400 });
    }

    const body = await request.json();
    const { operational_status } = body;

    const allowedStatuses = ['Available', 'Occupied', 'Sanitizing', 'Out-Of-Service'];
    if (!allowedStatuses.includes(operational_status)) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // If attempting to mark 'Available', check if there is an active admission
    if (operational_status === 'Available') {
      const activeCheck = await query(
        `SELECT admission_id FROM admissions WHERE bed_id = $1 AND discharge_time IS NULL AND admission_status = 'Admitted'`,
        [bedId]
      );
      if (activeCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot mark bed as Available while an inpatient is currently admitted to it. Discharge patient first.',
          },
          { status: 400 }
        );
      }
    }

    const { rows } = await query(
      `UPDATE wards_beds SET operational_status = $1 WHERE bed_id = $2 RETURNING *`,
      [operational_status, bedId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Bed not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bed: rows[0],
      message: `Bed operational status updated to ${operational_status}`,
    });
  } catch (error: any) {
    const formatted = formatPgError(error);
    return NextResponse.json({ success: false, error: formatted.message, details: formatted }, { status: 400 });
  }
}
