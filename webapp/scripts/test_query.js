const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_nMLVNak25SRo@ep-sweet-violet-axg4ujai.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(async () => {
  try {
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'problem_patterns' ORDER BY ordinal_position`);
    console.log('COLUMNS:', res.rows.map(r => r.column_name));

    await client.query(`ALTER TABLE problem_patterns ADD COLUMN IF NOT EXISTS github_synced_url text;`);
    await client.query(`ALTER TABLE problem_patterns ADD COLUMN IF NOT EXISTS mistake_notes text;`);
    console.log('ADDED missing columns');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    client.end();
  }
});
