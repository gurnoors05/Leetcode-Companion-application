import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, withOptionalAuth, withValidation, AuthenticatedRequest } from '@/lib/middleware';
import { idParamSchema, updateProblemSchema } from '@/lib/validators';

export const GET = withOptionalAuth(
  withValidation({ params: idParamSchema.params })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user?.id || -1;
      const problemId = context.params.id;

      try {
        const query = `
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
                       'space_complexity', pp.space_complexity,
                       'ai_reasoning', pp.ai_reasoning,
                       'ai_time_complexity', pp.ai_time_complexity,
                       'ai_space_complexity', pp.ai_space_complexity,
                       'ai_verified', pp.ai_verified,
                       'mistake_notes', pp.mistake_notes,
                       'visibility', pp.visibility,
                       'share_token', pp.share_token,
                       'github_synced_url', pp.github_synced_url
                     )
                   ) FILTER (WHERE pt.id IS NOT NULL AND ($2::int = p.user_id OR pp.visibility = 'PUBLIC')), '[]'
                 ) as patterns,
                 ($2::int = p.user_id) as is_owner
          FROM problems p
          LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
          LEFT JOIN patterns pt ON pp.pattern_id = pt.id
          WHERE p.id = $1
          GROUP BY p.id
        `;
        const result = await db.query(query, [problemId, userId]);

        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        const problemData = result.rows[0];

        // If not owner, and there are NO public patterns, 404 to hide private data
        if (!problemData.is_owner && problemData.patterns.length === 0) {
          return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        return NextResponse.json(problemData);
      } catch (err) {
        console.error('Error fetching problem details:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);

export const PUT = withAuth(
  withValidation({ params: updateProblemSchema.params, body: updateProblemSchema.body })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const problemId = context.params.id;
      const updates = context.body;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const setClauses: string[] = [];
      const values: any[] = [problemId, userId]; // $1 and $2
      let paramIdx = 3;

      for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
      setClauses.push(`updated_at = NOW()`);

      try {
        const query = `
          UPDATE problems 
          SET ${setClauses.join(', ')} 
          WHERE id = $1 AND user_id = $2 
          RETURNING *
        `;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
      } catch (err) {
        console.error('Error updating problem:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);

export const DELETE = withAuth(
  withValidation({ params: idParamSchema.params })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const problemId = context.params.id;

      try {
        const result = await db.query(
          'DELETE FROM problems WHERE id = $1 AND user_id = $2 RETURNING id',
          [problemId, userId]
        );

        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Problem deleted successfully' });
      } catch (err) {
        console.error('Error deleting problem:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);
