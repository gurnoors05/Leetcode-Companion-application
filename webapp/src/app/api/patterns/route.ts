import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT pt.id, pt.name, COUNT(pp.problem_id)::int as problem_count
      FROM patterns pt
      LEFT JOIN problem_patterns pp ON pt.id = pp.pattern_id
      WHERE pt.user_id = $1
      GROUP BY pt.id
      ORDER BY problem_count DESC, pt.name ASC
    `;
    const result = await db.query(query, [userId]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching patterns:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
