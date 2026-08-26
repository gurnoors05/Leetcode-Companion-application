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
           p.difficulty, 
           pat.id as pattern_id, 
           pat.name as pattern_name
         FROM problems p
         JOIN problem_patterns pp ON p.id = pp.problem_id
         JOIN patterns pat ON pp.pattern_id = pat.id
         WHERE p.user_id = $1`,
        [userId]
      );

      const patternsMap = new Map();
      const problemsMap = new Map();
      const links: { source: string; target: string }[] = [];

      res.rows.forEach(row => {
        const patKey = `pat_${row.pattern_id}`;
        const probKey = `prob_${row.problem_id}`;

        if (!patternsMap.has(patKey)) {
          patternsMap.set(patKey, { id: patKey, db_id: row.pattern_id, name: row.pattern_name, type: 'pattern' });
        }
        if (!problemsMap.has(probKey)) {
          problemsMap.set(probKey, { id: probKey, db_id: row.problem_id, title: row.title, difficulty: row.difficulty, type: 'problem' });
        }

        links.push({
          source: patKey,
          target: probKey
        });
      });

      return NextResponse.json({ 
        patterns: Array.from(patternsMap.values()),
        problems: Array.from(problemsMap.values()),
        links 
      });
    } catch (err) {
      console.error('Error fetching graph data:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
