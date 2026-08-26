import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth, withValidation, AuthenticatedRequest } from '@/lib/middleware';
import { getProblemsQuerySchema, createProblemSchema } from '@/lib/validators';

export const GET = withAuth(
  withValidation({ query: getProblemsQuerySchema.query })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const { status, difficulty, pattern_id, search, sort, order, page, limit } = context.query;
      const offset = (page - 1) * limit;

      try {
        let queryArgs: any[] = [userId];
        let whereClauses = ['p.user_id = $1'];

        if (status) {
          queryArgs.push(status);
          whereClauses.push(`p.status = $${queryArgs.length}`);
        }
        if (difficulty) {
          queryArgs.push(difficulty);
          whereClauses.push(`p.difficulty = $${queryArgs.length}`);
        }
        if (search) {
          queryArgs.push(`%${search}%`);
          whereClauses.push(`p.title ILIKE $${queryArgs.length}`);
        }

        let patternJoin = '';
        if (pattern_id) {
          queryArgs.push(pattern_id);
          patternJoin = `INNER JOIN problem_patterns pp_filter ON p.id = pp_filter.problem_id AND pp_filter.pattern_id = $${queryArgs.length}`;
        }

        let baseQuery = `
          WITH filtered_problems AS (
            SELECT p.id
            FROM problems p
            ${patternJoin}
            WHERE ${whereClauses.join(' AND ')}
          )
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
                       'next_review_date', pp.next_review_date,
                       'interval_days', pp.interval_days,
                       'ease_factor', pp.ease_factor,
                       'review_mode', pp.review_mode
                     )
                   ) FILTER (WHERE pt.id IS NOT NULL), '[]'
                 ) as patterns
          FROM problems p
          INNER JOIN filtered_problems fp ON p.id = fp.id
          LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
          LEFT JOIN patterns pt ON pp.pattern_id = pt.id
          GROUP BY p.id
          ORDER BY p.${sort === 'date_solved' ? 'date_solved' : 'created_at'} ${order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST
        `;
        
        queryArgs.push(limit);
        baseQuery += ` LIMIT $${queryArgs.length}`;
        queryArgs.push(offset);
        baseQuery += ` OFFSET $${queryArgs.length}`;

        const result = await db.query(baseQuery, queryArgs);

        // Simpler count query
        let safeCountArgs: any[] = [userId];
        let safeCountWhere = ['p.user_id = $1'];
        if (status) { safeCountArgs.push(status); safeCountWhere.push(`p.status = $${safeCountArgs.length}`); }
        if (difficulty) { safeCountArgs.push(difficulty); safeCountWhere.push(`p.difficulty = $${safeCountArgs.length}`); }
        if (search) { safeCountArgs.push(`%${search}%`); safeCountWhere.push(`p.title ILIKE $${safeCountArgs.length}`); }
        
        let countPatternJoin = '';
        if (pattern_id) {
          safeCountArgs.push(pattern_id);
          countPatternJoin = `INNER JOIN problem_patterns pp_filter ON p.id = pp_filter.problem_id AND pp_filter.pattern_id = $${safeCountArgs.length}`;
        }
        
        const countResult = await db.query(`
          SELECT COUNT(DISTINCT p.id) 
          FROM problems p
          ${countPatternJoin}
          WHERE ${safeCountWhere.join(' AND ')}
        `, safeCountArgs);
        
        const total = parseInt(countResult.rows[0].count, 10);

        return NextResponse.json({
          data: result.rows,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (err) {
        console.error('Error fetching problems:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  )
);

export const POST = withAuth(
  withValidation({ body: createProblemSchema.body })(
    async (req: AuthenticatedRequest, context: any) => {
      const userId = req.user.id;
      const { 
        title, leetcode_url, leetcode_number, difficulty, status, date_solved, patterns,
        ai_suggested_patterns, ai_time_complexity, ai_space_complexity, ai_reasoning,
        topic_tags
      } = context.body;

      console.log("\n=== DEBUG STEP 2: EXACT REQUEST BODY RECEIVED IN ROUTE.TS ===");
      console.log(JSON.stringify(context.body, null, 2));
      console.log("=== END DEBUG ===");

      // --- AI Verification Logic ---
      let finalAiData = {
        ai_suggested_patterns: ai_suggested_patterns || null,
        ai_time_complexity: ai_time_complexity || null,
        ai_space_complexity: ai_space_complexity || null,
        ai_reasoning: ai_reasoning || null,
        ai_verified: false
      };

      const codeToHash = patterns?.[0]?.code_snippet;
      if (codeToHash) {
        const crypto = require('crypto');
        const { getAiCache } = require('@/lib/aiCache');
        const { analyzeCodeWithAI } = require('@/lib/ai');
        
        const serverCodeHash = crypto.createHash('sha256').update(codeToHash).digest('hex');
        const cached = getAiCache(serverCodeHash);
        
        if (cached) {
          finalAiData = { ...cached, ai_verified: true };
        } else {
          // Hash mismatch or expired - re-run!
          try {
            const aiResult = await analyzeCodeWithAI(codeToHash, patterns[0].language || 'unknown', title, difficulty);
            finalAiData = {
              ai_suggested_patterns: aiResult.suggestedPatterns.map((p: string) => ({ pattern_name: p })),
              ai_time_complexity: aiResult.timeComplexity,
              ai_space_complexity: aiResult.spaceComplexity,
              ai_reasoning: aiResult.reasoning,
              ai_verified: true
            };
          } catch (e) {
            console.error("AI Fallback failed", e);
          }
        }
      }

      let client;
      try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        // 1. Insert Problem
        const problemInsert = await client.query(
          `INSERT INTO problems (user_id, title, leetcode_url, leetcode_number, difficulty, status, date_solved, topic_tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, title) DO UPDATE
           SET leetcode_url = EXCLUDED.leetcode_url,
               leetcode_number = COALESCE(problems.leetcode_number, EXCLUDED.leetcode_number),
               difficulty = EXCLUDED.difficulty,
               status = EXCLUDED.status,
               topic_tags = EXCLUDED.topic_tags,
               updated_at = NOW()
           RETURNING *`,
          [userId, title, leetcode_url, leetcode_number || null, difficulty, status, date_solved || null, topic_tags || []]
        );
        const newProblem = problemInsert.rows[0];

        // 2. Handle Patterns if provided
        if (patterns && patterns.length > 0) {
          for (const pat of patterns) {
            let patternId = pat.pattern_id;

            // If pattern_id isn't provided, find or create by name
            if (!patternId && pat.pattern_name) {
              const patName = pat.pattern_name.trim();
              const existingPatRes = await client.query(
                'SELECT id FROM patterns WHERE user_id = $1 AND name = $2',
                [userId, patName]
              );

              if (existingPatRes.rows.length > 0) {
                patternId = existingPatRes.rows[0].id;
              } else {
                const newPatRes = await client.query(
                  'INSERT INTO patterns (user_id, name) VALUES ($1, $2) RETURNING id',
                  [userId, patName]
                );
                patternId = newPatRes.rows[0].id;
              }
            }

            if (patternId) {
              await client.query(
                `INSERT INTO problem_patterns 
                 (problem_id, pattern_id, approach_notes, code_snippet, language, time_complexity, space_complexity, mistake_notes,
                  ai_suggested_patterns, ai_time_complexity, ai_space_complexity, ai_reasoning, ai_verified)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (problem_id, pattern_id) DO UPDATE 
                 SET approach_notes = EXCLUDED.approach_notes,
                     code_snippet = EXCLUDED.code_snippet,
                     language = EXCLUDED.language,
                     time_complexity = EXCLUDED.time_complexity,
                     space_complexity = EXCLUDED.space_complexity,
                     mistake_notes = EXCLUDED.mistake_notes,
                     ai_suggested_patterns = EXCLUDED.ai_suggested_patterns,
                     ai_time_complexity = EXCLUDED.ai_time_complexity,
                     ai_space_complexity = EXCLUDED.ai_space_complexity,
                     ai_reasoning = EXCLUDED.ai_reasoning,
                     ai_verified = EXCLUDED.ai_verified,
                     updated_at = NOW()`,
                [
                  newProblem.id,
                  patternId,
                  pat.approach_notes || null,
                  pat.code_snippet || null,
                  pat.language || null,
                  pat.time_complexity || null,
                  pat.space_complexity || null,
                  pat.mistake_notes || null,
                  finalAiData.ai_suggested_patterns ? JSON.stringify(finalAiData.ai_suggested_patterns) : null,
                  finalAiData.ai_time_complexity,
                  finalAiData.ai_space_complexity,
                  finalAiData.ai_reasoning,
                  finalAiData.ai_verified
                ]
              );
            }
          }
        }

        await client.query('COMMIT');
        client.release();

        return NextResponse.json({ message: 'Problem saved successfully' });
      } catch (error: any) {
        if (client) {
          try { await client.query('ROLLBACK'); } catch (e) {}
          client.release();
        }
        console.error('Save Problem Error:', error);
        
        // TEMPORARY FOR VERIFICATION: Return the AI data even if DB fails
        return NextResponse.json({ 
          error: 'Internal server error',
          test_verification: {
            ai_suggested_patterns: finalAiData.ai_suggested_patterns,
            ai_verified: finalAiData.ai_verified
          }
        }, { status: 500 });
      }
    }
  )
);
