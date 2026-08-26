const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env' }); // Load env relative to backend directory

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    // Truncate existing users (cascades down)
    await pool.query('TRUNCATE TABLE users CASCADE');

    console.log('Creating test users...');
    
    // User 1
    const user1Res = await pool.query(
      `INSERT INTO users (github_id, github_username, email, github_access_token)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      ['test-github-1', 'testuser1', 'test1@example.com', 'dummy_token']
    );
    const user1 = user1Res.rows[0];

    // User 2 (for cross-user tests)
    const user2Res = await pool.query(
      `INSERT INTO users (github_id, github_username, email, github_access_token)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      ['test-github-2', 'testuser2', 'test2@example.com', 'dummy_token']
    );
    const user2 = user2Res.rows[0];

    // Generate JWTs
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    
    const user1Jwt = jwt.sign(
      { id: user1.id, username: user1.github_username }, 
      jwtSecret, 
      { expiresIn: '15m', algorithm: 'HS256' }
    );
    
    const user2Jwt = jwt.sign(
      { id: user2.id, username: user2.github_username }, 
      jwtSecret, 
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    // Generate an expired JWT for user1 using option (a): sign directly with past exp
    // jsonwebtoken doesn't allow setting negative expiresIn string, so we construct payload directly
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredJwt = jwt.sign(
      { id: user1.id, username: user1.github_username, exp: pastTimestamp },
      jwtSecret,
      { algorithm: 'HS256' }
    );

    console.log('\n--- SEED SUCCESS ---');
    console.log('USER 1 ID:', user1.id);
    console.log('USER 1 JWT:', user1Jwt);
    console.log('\nUSER 2 ID:', user2.id);
    console.log('USER 2 JWT:', user2Jwt);
    console.log('\nEXPIRED JWT (User 1):', expiredJwt);
    console.log('--------------------\n');

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
