import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';

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

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 401 });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find the token in the DB
    const tokenRes = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    
    if (tokenRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }
    
    const tokenRecord = tokenRes.rows[0];
    const userId = tokenRecord.user_id;
    
    // Get user to generate new payload
    const userRes = await db.query('SELECT github_username FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const payload = { id: userId, username: userRes.rows[0].github_username };
    const accessToken = jwt.sign(payload, getJwtAccessSecret(), { expiresIn: '15m' });
    
    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
