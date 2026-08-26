const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validate } = require('../middleware/validate');
const {
  createProblemSchema,
  updateProblemSchema,
  patchPatternsSchema,
  getProblemsQuerySchema,
  idParamSchema,
} = require('../validators/problemValidators');

// Background AI function
const triggerBackgroundAI = async (problemId, patternId, codeSnippet, title, difficulty, token) => {
  try {
    const aiRes = await fetch('http://127.0.0.1:3000/api/ai/analyze-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ code: codeSnippet, title, difficulty })
    });
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      await db.query(`
        UPDATE problem_patterns 
        SET ai_time_complexity = $1, ai_space_complexity = $2, ai_reasoning = $3, updated_at = NOW()
        WHERE problem_id = $4 AND pattern_id = $5
      `, [aiData.ai_time_complexity, aiData.ai_space_complexity, aiData.ai_reasoning, problemId, patternId]);
      console.log(\`Background AI completed for Problem \${problemId} Pattern \${patternId}\`);
    } else {
      console.error('Background AI request failed:', await aiRes.text());
    }
  } catch (e) {
    console.error('Background AI error:', e);
  }
};

// GET /api/problems
router.get('/', validate(getProblemsQuerySchema), async (req, res) => {
  const userId = req.user.id;
  const { status, difficulty, pattern_id, search, sort, order } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  try {
    let queryArgs = [userId];
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
                   'space_complexity', pp.space_complexity
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

    console.log('DEBUG baseQuery:', baseQuery);
    console.log('DEBUG queryArgs:', queryArgs);

    const result = await db.query(baseQuery, queryArgs);

    // Simpler count query
    let safeCountArgs = [userId];
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

    res.json({
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/problems/multi-approach
// MUST be registered before /:id to prevent being swallowed!
router.get('/multi-approach', async (req, res) => {
  const userId = req.user.id;
  try {
    const query = `
      WITH multi_pattern_problems AS (
        SELECT problem_id
        FROM problem_patterns
        GROUP BY problem_id
        HAVING COUNT(pattern_id) >= 2
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
                   'space_complexity', pp.space_complexity
                 )
               ) FILTER (WHERE pt.id IS NOT NULL), '[]'
             ) as patterns
      FROM problems p
      INNER JOIN multi_pattern_problems mp ON p.id = mp.problem_id
      LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
      LEFT JOIN patterns pt ON pp.pattern_id = pt.id
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `;
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching multi-approach problems:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/problems/:id
router.get('/:id', validate(idParamSchema), async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.id;

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
                   'mistake_notes', pp.mistake_notes
                 )
               ) FILTER (WHERE pt.id IS NOT NULL), '[]'
             ) as patterns
      FROM problems p
      LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
      LEFT JOIN patterns pt ON pp.pattern_id = pt.id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id
    `;
    const result = await db.query(query, [problemId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching problem details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/problems (with Transaction)
router.post('/', validate(createProblemSchema), async (req, res) => {
  const userId = req.user.id;
  const { title, leetcode_url, leetcode_number, difficulty, status, date_solved, patterns } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert Problem
    const problemInsert = await client.query(
      `INSERT INTO problems (user_id, title, leetcode_url, leetcode_number, difficulty, status, date_solved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, leetcode_url, leetcode_number || null, difficulty, status, date_solved || null]
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
             (problem_id, pattern_id, approach_notes, code_snippet, language, time_complexity, space_complexity, mistake_notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (problem_id, pattern_id) DO UPDATE 
             SET approach_notes = EXCLUDED.approach_notes,
                 code_snippet = EXCLUDED.code_snippet,
                 language = EXCLUDED.language,
                 time_complexity = EXCLUDED.time_complexity,
                 space_complexity = EXCLUDED.space_complexity,
                 mistake_notes = EXCLUDED.mistake_notes,
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
            ]
          );

          if (!pat.time_complexity && pat.code_snippet) {
            triggerBackgroundAI(newProblem.id, patternId, pat.code_snippet, title, difficulty, req.headers.authorization);
          }
        }
      }
    }

    await client.query('COMMIT');
    
    // Return full hydrated object
    const finalProblemQuery = await client.query(`
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
                   'space_complexity', pp.space_complexity
                 )
               ) FILTER (WHERE pt.id IS NOT NULL), '[]'
             ) as patterns
      FROM problems p
      LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
      LEFT JOIN patterns pt ON pp.pattern_id = pt.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [newProblem.id]);

    res.status(201).json(finalProblemQuery.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating problem:', err);
    res.status(500).json({ error: 'Internal server error while creating problem' });
  } finally {
    client.release();
  }
});

// PUT /api/problems/:id
router.put('/:id', validate(updateProblemSchema), async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.id;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClauses = [];
  const values = [problemId, userId]; // $1 and $2
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
      return res.status(404).json({ error: 'Problem not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating problem:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/problems/:id/patterns
router.patch('/:id/patterns', validate(patchPatternsSchema), async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.id;
  const { action, pattern } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verify ownership and get problem details for AI
    const probRes = await client.query('SELECT id, title, difficulty FROM problems WHERE id = $1 AND user_id = $2', [problemId, userId]);
    if (probRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Problem not found or unauthorized' });
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
        const updates = [];
        const values = [problemId, patternId];
        let pIdx = 3;

        ['approach_notes', 'code_snippet', 'language', 'time_complexity', 'space_complexity', 'mistake_notes'].forEach(key => {
          if (pattern[key] !== undefined) {
            updates.push(`${key} = $${pIdx}`);
            values.push(pattern[key]);
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
        
        // Background AI trigger
        if (!pattern.time_complexity && pattern.code_snippet) {
           triggerBackgroundAI(problemId, patternId, pattern.code_snippet, probRes.rows[0].title, probRes.rows[0].difficulty, req.headers.authorization).catch(console.error);
        }
      }
    } else if (action === 'remove') {
      if (!patternId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'pattern_id required to remove a pattern link' });
      }
      await client.query('DELETE FROM problem_patterns WHERE problem_id = $1 AND pattern_id = $2', [problemId, patternId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Pattern link ${action === 'remove' ? 'removed' : action + 'ed'} successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error patching pattern link:', err);
    res.status(500).json({ error: 'Internal server error while patching patterns' });
  } finally {
    client.release();
  }
});

// DELETE /api/problems/:id
router.delete('/:id', validate(idParamSchema), async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.id;

  try {
    const result = await db.query(
      'DELETE FROM problems WHERE id = $1 AND user_id = $2 RETURNING id',
      [problemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found or unauthorized' });
    }

    // ON DELETE CASCADE automatically removes problem_patterns rows
    res.json({ success: true, message: 'Problem deleted successfully' });
  } catch (err) {
    console.error('Error deleting problem:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
