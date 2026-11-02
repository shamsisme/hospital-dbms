import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { clientMeta, createSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Break-glass emergency access: a known staff badge may skip the PIN when a
 * written reason is given. Access lasts 15 minutes and is always audited.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const staffCode = String(body.staff_code || '').trim().toUpperCase();
    const reason = String(body.reason || '').trim();

    if (reason.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Describe the emergency in at least 10 characters. The reason is recorded in the audit log.' },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `SELECT staff_id, full_name, staff_role FROM staff_accounts WHERE staff_code = $1 AND is_active`,
      [staffCode]
    );
    const staff = rows[0];
    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Break-glass access needs a valid staff badge ID.' },
        { status: 403 }
      );
    }

    const recent = await query(
      `SELECT count(*)::int AS n FROM login_audit
       WHERE staff_code = $1 AND event_type = 'break_glass' AND occurred_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      [staffCode]
    );
    if (recent.rows[0].n >= 2) {
      return NextResponse.json(
        { success: false, error: 'This badge has used break-glass access twice in 24 hours. Sign in with your PIN or ask the duty administrator.' },
        { status: 429 }
      );
    }

    const { ip, userAgent } = clientMeta(request);
    await query(
      `INSERT INTO login_audit (staff_code, staff_id, event_type, detail, ip_address, user_agent)
       VALUES ($1, $2, 'break_glass', $3, $4, $5)`,
      [staffCode, staff.staff_id, reason.slice(0, 500), ip, userAgent]
    );
    const { token, maxAge } = await createSession(staff.staff_id, 'break_glass', reason.slice(0, 500));
    const res = NextResponse.json({
      success: true,
      staff: { staffCode, fullName: staff.full_name, role: staff.staff_role },
      expiresInSeconds: maxAge,
    });
    setSessionCookie(res, token, maxAge);
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Break-glass access failed' }, { status: 500 });
  }
}
