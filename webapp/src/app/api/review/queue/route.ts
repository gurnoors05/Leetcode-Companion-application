import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user.id;

      const res = await db.query(
        `SELECT 
           p.id as problem_id,
           p.title, 
           p.leetcode_number, 
           p.difficulty,
           p.next_review_date,
           COALESCE(
             json_agg(
               json_build_object(
                 'pattern_name', pat.name,
                 'approach_notes', pp.approach_notes,
                 'code_snippet', pp.code_snippet,
                 'language', pp.language
               )
             ) FILTER (WHERE pat.name IS NOT NULL), 
             '[]'
           ) as patterns
         FROM problems p
         LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
         LEFT JOIN patterns pat ON pp.pattern_id = pat.id
         WHERE p.user_id = $1 
           AND p.next_review_date IS NOT NULL
         GROUP BY p.id
         ORDER BY p.next_review_date ASC`,
        [userId]
      );

      return NextResponse.json({ queue: res.rows });
    } catch (err) {
      console.error('Error fetching review queue:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
