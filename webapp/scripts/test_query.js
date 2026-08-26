const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_nMLVNak25SRo@ep-sweet-violet-axg4ujai.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(async () => {
  try {
    await client.query(`ALTER TABLE problem_patterns ADD COLUMN IF NOT EXISTS interval_days integer DEFAULT 0;`);
    await client.query(`ALTER TABLE problem_patterns ADD COLUMN IF NOT EXISTS ease_factor numeric(5,2) DEFAULT 2.5;`);
    await client.query(`ALTER TABLE problem_patterns ADD COLUMN IF NOT EXISTS review_mode varchar(20) DEFAULT 'learning';`);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    client.end();
  }
});
