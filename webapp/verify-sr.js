const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: 'postgresql://username:password@localhost:5432/leetcode_companion'
});

async function run() {
  let problemId, patternId, userId, token;
  try {
    // 1. Setup user and problem
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    userId = userRes.rows[0].id;

    token = jwt.sign(
      { id: userId },
      'your_jwt_access_secret_here',
      { expiresIn: '1h' }
    );

    const probRes = await pool.query(
      "INSERT INTO problems (user_id, title, leetcode_url, difficulty) VALUES ($1, 'Test SR Prob', 'http://test', 'easy') RETURNING id",
      [userId]
    );
    problemId = probRes.rows[0].id;

    const patRes = await pool.query(
      "INSERT INTO patterns (user_id, name) VALUES ($1, 'Test SR Pattern') RETURNING id",
      [userId]
    );
    patternId = patRes.rows[0].id;

    await pool.query(
      "INSERT INTO problem_patterns (problem_id, pattern_id, interval_days, ease_factor, review_mode) VALUES ($1, $2, 1, 2.5, 'algorithm')",
      [problemId, patternId]
    );

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log("--- STARTING VERIFICATION ---");
    
    // Step 1: Fresh Approach -> Good
    let res = await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rating: 'good' })
    });
    let data = await res.json();
    console.log("\n[Step 1] Rate Fresh Approach as 'Good'");
    console.log(`interval_days: ${data.data.interval_days} (Expected 3)`);
    console.log(`ease_factor: ${data.data.ease_factor}`);
    console.log(`next_review_date: ${data.data.next_review_date}`);

    // Step 2: Rate Same Approach -> Again
    res = await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rating: 'again' })
    });
    data = await res.json();
    console.log("\n[Step 2] Rate Same Approach as 'Again'");
    console.log(`interval_days: ${data.data.interval_days}`);
    console.log(`ease_factor: ${data.data.ease_factor}`);
    console.log(`next_review_date: ${data.data.next_review_date}`);

    // Step 3: Switch to Manual Mode
    res = await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review-schedule`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mode: 'manual', date: '2026-09-01' })
    });
    data = await res.json();
    console.log("\n[Step 3] Switch to Manual Mode");
    console.log(`review_mode: ${data.data.review_mode}`);
    console.log(`next_review_date: ${data.data.next_review_date}`);

    // Verify it doesn't appear in queue (since it's in future)
    res = await fetch('http://localhost:3000/api/review/queue', { headers });
    let queueData = await res.json();
    const inQueueFuture = queueData.queue.some(q => q.problem_id === problemId && q.pattern_id === patternId);
    console.log(`Appears in queue? ${inQueueFuture} (Expected false)`);

    // Switch to manual date in past
    await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review-schedule`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mode: 'manual', date: '2020-01-01' })
    });
    res = await fetch('http://localhost:3000/api/review/queue', { headers });
    queueData = await res.json();
    const inQueuePast = queueData.queue.some(q => q.problem_id === problemId && q.pattern_id === patternId);
    console.log(`Appears in queue after setting past date? ${inQueuePast} (Expected true)`);

    // Step 4: Resume Algorithm Mode
    res = await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review-schedule`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mode: 'algorithm' })
    });
    data = await res.json();
    console.log("\n[Step 4] Resume Algorithm Mode");
    console.log(`review_mode: ${data.data.review_mode}`);
    console.log(`interval_days: ${data.data.interval_days}`);
    console.log(`next_review_date: ${data.data.next_review_date}`);

    // Step 5: Reject POST rating in Manual Mode
    await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review-schedule`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mode: 'manual', date: '2026-09-01' })
    });
    res = await fetch(`http://localhost:3000/api/problems/${problemId}/patterns/${patternId}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rating: 'good' })
    });
    data = await res.json();
    console.log("\n[Step 5] Attempt to POST rating in Manual Mode");
    console.log(`Response error: ${data.error}`);

  } catch (e) {
    console.error(e);
  } finally {
    if (problemId) {
      await pool.query('DELETE FROM problems WHERE id = $1', [problemId]);
    }
    if (patternId) {
      await pool.query('DELETE FROM patterns WHERE id = $1', [patternId]);
    }
    await pool.end();
  }
}

run();
