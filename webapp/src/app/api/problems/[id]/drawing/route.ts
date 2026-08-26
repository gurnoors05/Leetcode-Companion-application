import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const GET = withAuth(
  async (req: AuthenticatedRequest, context: { params: { id: string } }) => {
    try {
      const userId = req.user.id;
      const params = await context.params;
      const problemId = parseInt(params.id, 10);

      // Verify the user owns the problem
      const problemRes = await db.query(
        'SELECT id FROM problems WHERE id = $1 AND user_id = $2',
        [problemId, userId]
      );

      if (problemRes.rows.length === 0) {
        return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
      }

      const drawingRes = await db.query(
        'SELECT canvas_data FROM problem_drawings WHERE user_id = $1 AND problem_id = $2',
        [userId, problemId]
      );

      if (drawingRes.rows.length === 0) {
        return NextResponse.json({ data: null });
      }

      return NextResponse.json({ data: drawingRes.rows[0].canvas_data });
    } catch (err) {
      console.error('Error fetching drawing:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const PUT = withAuth(
  async (req: AuthenticatedRequest, context: { params: { id: string } }) => {
    try {
      const userId = req.user.id;
      const params = await context.params;
      const problemId = parseInt(params.id, 10);

      // Verify the user owns the problem
      const problemRes = await db.query(
        'SELECT id FROM problems WHERE id = $1 AND user_id = $2',
        [problemId, userId]
      );

      if (problemRes.rows.length === 0) {
        return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
      }

      const body = await req.json();
      const { canvas_data } = body;

      if (!canvas_data) {
        return NextResponse.json({ error: 'canvas_data is required' }, { status: 400 });
      }

      const upsertRes = await db.query(
        `INSERT INTO problem_drawings (user_id, problem_id, canvas_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, problem_id) DO UPDATE 
         SET canvas_data = EXCLUDED.canvas_data, updated_at = NOW()
         RETURNING *`,
        [userId, problemId, JSON.stringify(canvas_data)]
      );

      return NextResponse.json({ message: 'Drawing saved successfully', data: upsertRes.rows[0].canvas_data });
    } catch (err) {
      console.error('Error saving drawing:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
