import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, withValidation, AuthenticatedRequest } from '@/lib/middleware';
import { idParamSchema } from '@/lib/validators';

export const GET = withAuth(
  withValidation({ params: idParamSchema.params })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const patternId = context.params.id;

      try {
        // First check if pattern belongs to user
        const patRes = await db.query('SELECT name FROM patterns WHERE id = $1 AND user_id = $2', [patternId, userId]);
        if (patRes.rows.length === 0) {
          return NextResponse.json({ error: 'Pattern not found or unauthorized' }, { status: 404 });
        }

        const query = `
          SELECT p.*,
                 pp.approach_notes, pp.code_snippet, pp.language, 
                 pp.time_complexity, pp.space_complexity, pp.mistake_notes
          FROM problems p
          INNER JOIN problem_patterns pp ON p.id = pp.problem_id
          WHERE p.user_id = $1 AND pp.pattern_id = $2
          ORDER BY p.date_solved DESC NULLS LAST, p.created_at DESC
        `;
        const result = await db.query(query, [userId, patternId]);
        
        return NextResponse.json({
          pattern: { id: patternId, name: patRes.rows[0].name },
          problems: result.rows
        });
      } catch (err) {
        console.error('Error fetching problems for pattern:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);
