import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, withValidation, AuthenticatedRequest } from '@/lib/middleware';
import { patchPatternsSchema } from '@/lib/validators';

export const PATCH = withAuth(
  withValidation({ params: patchPatternsSchema.params, body: patchPatternsSchema.body })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const problemId = context.params.id;
      const { action, pattern } = context.body;

      const client = await db.pool.connect();

      try {
        await client.query('BEGIN');

        // Verify ownership
        const probRes = await client.query('SELECT id FROM problems WHERE id = $1 AND user_id = $2', [problemId, userId]);
        if (probRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Problem not found or unauthorized' }, { status: 404 });
        }

        let patternId = pattern.pattern_id;

        if (action === 'add' || action === 'update') {
          if (!patternId && pattern.pattern_name) {
            const patName = pattern.pattern_name.trim();
            const existingPatRes = await client.query('SELECT id FROM patterns WHERE user_id = $1 AND name = $2', [userId, patName]);
            
            if (existingPatRes.rows.length > 0) {
              patternId = existingPatRes.rows[0].id;
            } else {
              const newPatRes = await client.query('INSERT INTO patterns (user_id, name) VALUES ($1, $2) RETURNING id', [userId, patName]);
              patternId = newPatRes.rows[0].id;
            }
          }

          if (!patternId) {
            throw new Error('Pattern ID or Name must resolve correctly.');
          }

          if (action === 'add') {
            await client.query(
              `INSERT INTO problem_patterns 
               (problem_id, pattern_id, approach_notes, code_snippet, language, time_complexity, space_complexity, mistake_notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (problem_id, pattern_id) DO NOTHING`,
              [
                problemId, patternId, pattern.approach_notes || null, pattern.code_snippet || null, 
                pattern.language || null, pattern.time_complexity || null, pattern.space_complexity || null, 
                pattern.mistake_notes || null
              ]
            );
          } else if (action === 'update') {
            const updates: string[] = [];
            const values: any[] = [problemId, patternId];
            let pIdx = 3;

            ['approach_notes', 'code_snippet', 'language', 'time_complexity', 'space_complexity', 'mistake_notes'].forEach(key => {
              if ((pattern as any)[key] !== undefined) {
                updates.push(`${key} = $${pIdx}`);
                values.push((pattern as any)[key]);
                pIdx++;
              }
            });

            if (updates.length > 0) {
              updates.push(`updated_at = NOW()`);
              await client.query(
                `UPDATE problem_patterns SET ${updates.join(', ')} WHERE problem_id = $1 AND pattern_id = $2`,
                values
              );
            }
          }
        } else if (action === 'remove') {
          if (!patternId) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'pattern_id required to remove a pattern link' }, { status: 400 });
          }
          await client.query('DELETE FROM problem_patterns WHERE problem_id = $1 AND pattern_id = $2', [problemId, patternId]);
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: `Pattern link ${action === 'remove' ? 'removed' : action + 'ed'} successfully` });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error patching pattern link:', err);
        return NextResponse.json({ error: 'Internal server error while patching patterns' }, { status: 500 });
      } finally {
        client.release();
      }
    }
  )
);
