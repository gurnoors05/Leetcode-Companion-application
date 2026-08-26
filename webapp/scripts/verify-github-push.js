const { Client } = require('pg');
require('dotenv').config();

async function testPush() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Give the user a default repo directly for this test
    const repoName = 'leetcode-companion-solutions-test';
    
    // We fetch the JWT secret from env
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_ACCESS_SECRET;

    // Get user id 23 (singhgurnoor283@gmail.com)
    const userRes = await client.query('SELECT id, github_username, github_access_token FROM users WHERE email = $1', ['singhgurnoor283@gmail.com']);
    const user = userRes.rows[0];

    // Give user a repo in DB
    const finalRepoFullName = `${user.github_username}/${repoName}`;
    await client.query('UPDATE users SET github_sync_repo = $1 WHERE id = $2', [finalRepoFullName, user.id]);

    // Create or get mock problem
    let probId;
    try {
      const probRes = await client.query(
        `INSERT INTO problems (user_id, leetcode_number, title, leetcode_url, difficulty) 
         VALUES ($1, 9999, 'Test GitHub Push Problem', 'https://leetcode.com/problems/test-push', 'easy') RETURNING id`,
        [user.id]
      );
      probId = probRes.rows[0].id;
    } catch (e) {
      const probRes = await client.query(`SELECT id FROM problems WHERE user_id = $1 AND title = 'Test GitHub Push Problem'`, [user.id]);
      probId = probRes.rows[0].id;
    }

    let patId;
    try {
      const patRes = await client.query(
        `INSERT INTO patterns (user_id, name) VALUES ($1, 'Mock Pattern For GitHub') RETURNING id`,
        [user.id]
      );
      patId = patRes.rows[0].id;
      await client.query(
        `INSERT INTO problem_patterns (problem_id, pattern_id, code_snippet, approach_notes)
         VALUES ($1, $2, 'console.log("Hello GitHub!");', 'Initial note for test.')`,
        [probId, patId]
      );
    } catch (e) {
      const patRes = await client.query(`SELECT id FROM patterns WHERE user_id = $1 AND name = 'Mock Pattern For GitHub'`, [user.id]);
      patId = patRes.rows[0].id;
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: 'singhgurnoor283@gmail.com', username: user.github_username }, secret, { expiresIn: '1h' });

    console.log("=== 1. Testing Repo Setup ===");
    // We already updated the DB, but let's actually create the repo on GitHub via the API endpoint
    const createRes = await fetch('http://localhost:3000/api/github/setup-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `jwt_token=${token}` },
      body: JSON.stringify({ repoName, isNew: true })
    });
    const responseText = await createRes.text();
    console.log("Setup Repo Response Text:", responseText);

    console.log("\n=== 2. Testing First Push ===");
    const pushRes = await fetch(`http://localhost:3000/api/problems/${probId}/patterns/${patId}/push-to-github`, {
      method: 'POST',
      headers: { 'Cookie': `jwt_token=${token}` }
    });
    const pushData = await pushRes.json();
    console.log("Push 1 Response:", pushData);

    console.log("\n=== 3. Testing Update Push ===");
    // Update notes
    await client.query(
      `UPDATE problem_patterns SET approach_notes = 'Updated note for test!' WHERE problem_id = $1 AND pattern_id = $2`,
      [probId, patId]
    );
    
    const pushRes2 = await fetch(`http://localhost:3000/api/problems/${probId}/patterns/${patId}/push-to-github`, {
      method: 'POST',
      headers: { 'Cookie': `jwt_token=${token}` }
    });
    const pushData2 = await pushRes2.json();
    console.log("Push 2 Response:", pushData2);

  } finally {
    await client.end();
  }
}

testPush().catch(console.error);
