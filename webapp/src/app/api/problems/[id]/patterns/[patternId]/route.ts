import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, context: { params: { id: string; patternId: string } }) => {
    try {
      const userId = req.user.id;
      const params = await context.params;
      const problemId = parseInt(params.id, 10);
      const patternId = parseInt(params.patternId, 10);

      // Verify the user owns the problem
      const problemRes = await db.query(
        'SELECT id FROM problems WHERE id = $1 AND user_id = $2',
        [problemId, userId]
      );

      if (problemRes.rows.length === 0) {
        return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
      }

      const body = await req.json();
      const { approach_notes } = body;

      if (typeof approach_notes !== 'string') {
        return NextResponse.json({ error: 'Invalid approach_notes' }, { status: 400 });
      }

      const updateRes = await db.query(
        `UPDATE problem_patterns 
         SET approach_notes = $1, updated_at = NOW() 
         WHERE problem_id = $2 AND pattern_id = $3
         RETURNING *`,
        [approach_notes, problemId, patternId]
      );

      if (updateRes.rows.length === 0) {
        return NextResponse.json({ error: 'Pattern not found for this problem' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Notes updated successfully', data: updateRes.rows[0] });
    } catch (err) {
      console.error('Error updating notes:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export { PATCH as PUT };
