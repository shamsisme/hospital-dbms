import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { clientMeta, createSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CODE_RE = /^(DOC-[0-9]{4}-[A-Z]{2}|(NUR|ADM|BIL)-[0-9]{4})$/;

/** Badge + Pulse-PIN sign-in. PIN verification, lock-out and auditing run inside PostgreSQL. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const staffCode = String(body.staff_code || '').trim().toUpperCase();
    const pin = String(body.pin || '');

    if (!CODE_RE.test(staffCode)) {
      return NextResponse.json(
        { success: false, error: 'Badge IDs look like DOC-1002-TN, NUR-2001, BIL-3001 or ADM-0001.' },
        { status: 400 }
      );
    }
    if (!/^[0-9]{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: 'Enter your 6-digit PIN.' }, { status: 400 });
    }

    const { ip, userAgent } = clientMeta(request);
    const { rows } = await query(`SELECT * FROM fn_authenticate_staff($1, $2, $3, $4)`, [staffCode, pin, ip, userAgent]);
    const r = rows[0];

    if (r.result === 'locked') {
      return NextResponse.json(
        {
          success: false,
          code: 'LOCKED',
          error: 'Too many wrong PINs. This badge is locked for 15 minutes.',
          retryAfterSeconds: r.retry_after_seconds,
        },
        { status: 423 }
      );
    }
    if (r.result !== 'ok') {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID',
          error: 'That badge and PIN do not match.',
          attemptsLeft: r.attempts_left,
        },
        { status: 401 }
      );
    }

    const { token, maxAge } = await createSession(r.staff_id, 'standard');
    const res = NextResponse.json({
      success: true,
      staff: { staffCode, fullName: r.full_name, role: r.staff_role },
    });
    setSessionCookie(res, token, maxAge);
    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Sign-in failed' }, { status: 500 });
  }
}
