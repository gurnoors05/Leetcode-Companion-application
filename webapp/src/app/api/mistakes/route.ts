import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getJwtAccessSecret } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.id;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let query = `SELECT * FROM submission_attempts WHERE user_id = $1`;
    let params: any[] = [userId];

    if (category && category !== 'All Categories') {
      query += ` AND mistake_category = $2`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC`;

    const res = await db.query(query, params);
    return NextResponse.json({ mistakes: res.rows }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch mistakes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
