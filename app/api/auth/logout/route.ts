import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { clearSessionCookie, clientMeta, getSession, revokeSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (session) {
      const { ip, userAgent } = clientMeta(request);
      await query(
        `INSERT INTO login_audit (staff_code, staff_id, event_type, ip_address, user_agent) VALUES ($1, $2, 'logout', $3, $4)`,
        [session.staffCode, session.staffId, ip, userAgent]
      );
    }
    await revokeSession(request);
  } catch {
    // signing out should always clear the cookie, even if the database is unreachable
  }
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
