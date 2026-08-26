const { Client } = require('pg');
require('dotenv').config();

async function debugPush() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_ACCESS_SECRET;

    // Get user id 23 (singhgurnoor283@gmail.com)
    const userRes = await client.query('SELECT id, github_username, github_access_token FROM users WHERE email = $1', ['singhgurnoor283@gmail.com']);
    const user = userRes.rows[0];

    // Get the problem "Trapping Rain Water"
    const probRes = await client.query(`SELECT id, title FROM problems WHERE title = 'Trapping Rain Water'`);
    if (probRes.rows.length === 0) {
       console.log("Trapping Rain Water not found");
       return;
    }
    const probId = probRes.rows[0].id;

    // Get its pattern details
    const patRes = await client.query(`SELECT pattern_id FROM problem_patterns WHERE problem_id = $1 LIMIT 1`, [probId]);
    if (patRes.rows.length === 0) {
       console.log("No pattern for Trapping Rain Water");
       return;
    }
    const patId = patRes.rows[0].pattern_id;

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: 'singhgurnoor283@gmail.com', username: user.github_username }, secret, { expiresIn: '1h' });

    console.log(`Pushing problem ${probId} pattern ${patId}...`);
    
    const pushRes = await fetch(`http://localhost:3000/api/problems/${probId}/patterns/${patId}/push-to-github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `jwt_token=${token}` },
      body: JSON.stringify({ customFolderName: 'two-pointers' })
    });
    
    console.log("Status:", pushRes.status);
    console.log("Response:", await pushRes.text());
  } finally {
    await client.end();
  }
}

debugPush().catch(console.error);
