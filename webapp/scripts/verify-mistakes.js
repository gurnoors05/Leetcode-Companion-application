const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

async function main() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    console.error("No JWT_ACCESS_SECRET found");
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Let's assume we have a user in the database or we can create a token for user_id = 1
  const resUser = await pool.query('SELECT id FROM users LIMIT 1');
  if (resUser.rows.length === 0) {
    console.error("No users found to test with.");
    process.exit(1);
  }
  const userId = resUser.rows[0].id;

  const token = jwt.sign({ id: userId, email: 'test@example.com' }, secret, { expiresIn: '1h' });

  // 1. Simulate POST payload when Skip is clicked (mistake_category = null)
  const skipPayload = {
    leetcode_number: 1,
    title: 'Two Sum',
    difficulty: 'easy',
    status_msg: 'Wrong Answer',
    code_snippet: 'return []',
    language: 'javascript',
    mistake_category: null
  };
  
  console.log("=== 1. POST Payload (Skip clicked) ===");
  console.log(JSON.stringify(skipPayload, null, 2));

  // Hit the actual local server (assuming it's running on 3000)
  const postRes1 = await fetch('http://localhost:3000/api/submission-attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(skipPayload)
  });
  console.log('POST /api/submission-attempts (Skip) Response:', postRes1.status, await postRes1.json());

  // Let's insert another one with a category
  const categorizedPayload = {
    leetcode_number: 1,
    title: 'Two Sum',
    difficulty: 'easy',
    status_msg: 'Time Limit Exceeded',
    code_snippet: 'while(true) {}',
    language: 'javascript',
    mistake_category: 'Time/Memory limit'
  };
  console.log("\n=== 2. POST Payload (Categorized) ===");
  console.log(JSON.stringify(categorizedPayload, null, 2));
  
  const postRes2 = await fetch('http://localhost:3000/api/submission-attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(categorizedPayload)
  });
  console.log('POST /api/submission-attempts (Categorized) Response:', postRes2.status, await postRes2.json());

  // 2. Fetch GET /api/mistakes
  console.log("\n=== 3. GET /api/mistakes ===");
  const getMistakesRes = await fetch('http://localhost:3000/api/mistakes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const mistakesData = await getMistakesRes.json();
  console.log(JSON.stringify(mistakesData, null, 2));

  // 3. Fetch GET /api/submission-attempts for Attempt History
  console.log("\n=== 4. GET /api/submission-attempts?leetcodeNumber=1 ===");
  const getHistoryRes = await fetch('http://localhost:3000/api/submission-attempts?leetcodeNumber=1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const historyData = await getHistoryRes.json();
  console.log(JSON.stringify(historyData, null, 2));

  pool.end();
}

main();
