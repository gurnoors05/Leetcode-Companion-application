const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validate } = require('../middleware/validate');
const { idParamSchema } = require('../validators/problemValidators');

// GET /api/patterns
// List all patterns for the user, with problem counts
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const query = `
      SELECT pt.id, pt.name, COUNT(pp.problem_id)::int as problem_count
      FROM patterns pt
      LEFT JOIN problem_patterns pp ON pt.id = pp.pattern_id
      WHERE pt.user_id = $1
      GROUP BY pt.id
      ORDER BY problem_count DESC, pt.name ASC
    `;
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching patterns:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patterns/:id/problems
// List all problems tagged with this pattern
router.get('/:id/problems', validate(idParamSchema), async (req, res) => {
  const userId = req.user.id;
  const patternId = req.params.id;

  try {
    // First check if pattern belongs to user
    const patRes = await db.query('SELECT name FROM patterns WHERE id = $1 AND user_id = $2', [patternId, userId]);
    if (patRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pattern not found or unauthorized' });
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
    
    res.json({
      pattern: { id: patternId, name: patRes.rows[0].name },
      problems: result.rows
    });
  } catch (err) {
    console.error('Error fetching problems for pattern:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
