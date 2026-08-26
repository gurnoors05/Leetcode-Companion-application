import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const GET = async (
  req: Request,
  context: { params: Promise<{ token: string }> }
) => {
  try {
    const params = await context.params;
    const token = params.token;

    const query = `
      SELECT p.id as problem_id, p.title, p.leetcode_url, p.leetcode_number, p.difficulty,
             pt.id as pattern_id, pt.name as pattern_name,
             pp.approach_notes, pp.code_snippet, pp.language, pp.time_complexity, pp.space_complexity,
             pp.ai_reasoning, pp.ai_time_complexity, pp.ai_space_complexity
      FROM problem_patterns pp
      JOIN problems p ON pp.problem_id = p.id
      JOIN patterns pt ON pp.pattern_id = pt.id
      WHERE pp.share_token = $1 AND pp.visibility = 'UNLISTED'
    `;
    const result = await db.query(query, [token]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Approach not found or not shared' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching shared approach:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
