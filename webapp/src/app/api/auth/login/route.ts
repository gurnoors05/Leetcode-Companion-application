import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Find user by email
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = userRes.rows[0];

    // 2. Check password
    if (!user.password_hash) {
      return NextResponse.json({ error: 'Please login with GitHub' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 3. Generate JWT
    const payload = { id: user.id, email: user.email, username: user.github_username || user.email.split('@')[0] };
    const token = jwt.sign(payload, getJwtAccessSecret(), { expiresIn: '7d' });

    // 4. Create response
    const response = NextResponse.json({ 
      success: true, 
      token, // Return token in JSON body for the extension sync
      user: {
        id: user.id,
        email: user.email,
      }
    });

    // 5. Set HttpOnly cookie for the webapp
    response.cookies.set({
      name: 'jwt_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
