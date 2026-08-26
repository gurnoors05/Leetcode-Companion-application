import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest, withValidation } from '@/lib/middleware';
import { z } from 'zod';

const scheduleSchema = {
  body: z.object({
    date: z.string().nullable(), // YYYY-MM-DD or null to clear
  }),
  params: z.object({
    id: z.coerce.number(),
  }),
};

export const PATCH = withAuth(
  withValidation(scheduleSchema)(
    async (req: AuthenticatedRequest, { params, body }: { params: { id: number }; body: { date: string | null } }) => {
      try {
        const userId = req.user.id;
        const problemId = params.id;
        const { date } = body;

        // Verify problem belongs to user
        const authRes = await db.query('SELECT id FROM problems WHERE id = $1 AND user_id = $2', [problemId, userId]);
        if (authRes.rows.length === 0) {
          return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
        }

        const updateRes = await db.query(
          `UPDATE problems 
           SET next_review_date = $1,
               updated_at = NOW() 
           WHERE id = $2
           RETURNING *`,
          [date, problemId]
        );

        return NextResponse.json({ success: true, problem: updateRes.rows[0] });
      } catch (err) {
        console.error('Error updating review schedule:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);
