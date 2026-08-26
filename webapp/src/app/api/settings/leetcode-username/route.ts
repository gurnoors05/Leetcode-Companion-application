import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const result = await db.query('SELECT leetcode_username FROM users WHERE id = $1', [req.user.id]);
      return NextResponse.json({ leetcode_username: result.rows[0]?.leetcode_username || null });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
);

export const PATCH = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json();
      const { leetcode_username } = body;

      if (leetcode_username !== undefined) {
        await db.query(
          'UPDATE users SET leetcode_username = $1 WHERE id = $2',
          [leetcode_username.trim() || null, req.user.id]
        );
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
);
