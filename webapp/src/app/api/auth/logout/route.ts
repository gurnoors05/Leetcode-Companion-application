import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    let refreshToken = undefined;
    
    // Check cookies first
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/refresh_token=([^;]+)/);
      if (match) refreshToken = match[1];
    }
    
    // Check body if not in cookies
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }
    
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    }
    
    const response = NextResponse.json({ message: 'Logged out successfully' });
    // Clear the cookies
    response.cookies.set('refresh_token', '', { maxAge: -1 });
    response.cookies.set('jwt_token', '', { maxAge: -1 });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
