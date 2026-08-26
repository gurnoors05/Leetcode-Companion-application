import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user.id;
  try {
    const query = `
      WITH multi_pattern_problems AS (
        SELECT problem_id
        FROM problem_patterns
        GROUP BY problem_id
        HAVING COUNT(pattern_id) >= 2
      )
      SELECT p.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'pattern_id', pt.id,
                   'pattern_name', pt.name,
                   'approach_notes', pp.approach_notes,
                   'code_snippet', pp.code_snippet,
                   'language', pp.language,
                   'time_complexity', pp.time_complexity,
                   'space_complexity', pp.space_complexity
                 )
               ) FILTER (WHERE pt.id IS NOT NULL), '[]'
             ) as patterns
      FROM problems p
      INNER JOIN multi_pattern_problems mp ON p.id = mp.problem_id
      LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
      LEFT JOIN patterns pt ON pp.pattern_id = pt.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
    const result = await db.query(query, [userId]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching multi-approach problems:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
