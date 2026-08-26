import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const PATCH = withAuth(
  async (req: AuthenticatedRequest, context: { params: Promise<{ id: string; patternId: string }> }) => {
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
      const { visibility } = body;

      if (!['PRIVATE', 'UNLISTED', 'PUBLIC'].includes(visibility)) {
        return NextResponse.json({ error: 'Invalid visibility level' }, { status: 400 });
      }

      // Get current visibility and share_token
      const patternRes = await db.query(
        'SELECT visibility, share_token FROM problem_patterns WHERE problem_id = $1 AND pattern_id = $2',
        [problemId, patternId]
      );

      if (patternRes.rows.length === 0) {
        return NextResponse.json({ error: 'Pattern not found for this problem' }, { status: 404 });
      }

      let { share_token } = patternRes.rows[0];

      // If switching to UNLISTED and no token exists, generate one
      if (visibility === 'UNLISTED' && !share_token) {
        share_token = crypto.randomBytes(16).toString('hex');
      }

      const updateRes = await db.query(
        `UPDATE problem_patterns 
         SET visibility = $1, share_token = $2, updated_at = NOW() 
         WHERE problem_id = $3 AND pattern_id = $4
         RETURNING visibility, share_token`,
        [visibility, share_token, problemId, patternId]
      );

      return NextResponse.json({ 
        message: 'Visibility updated successfully', 
        data: updateRes.rows[0] 
      });
    } catch (err) {
      console.error('Error updating visibility:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
