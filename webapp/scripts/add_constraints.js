const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_nMLVNak25SRo@ep-sweet-violet-axg4ujai.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(async () => {
  try {
    await client.query(`ALTER TABLE problems ADD CONSTRAINT problems_user_id_title_key UNIQUE (user_id, title);`);
    console.log('Added unique constraint to problems');
  } catch (e) {
    console.error('Error on problems constraint:', e.message);
  }
  
  try {
    await client.query(`ALTER TABLE problem_patterns ADD CONSTRAINT problem_patterns_problem_id_pattern_id_key UNIQUE (problem_id, pattern_id);`);
    console.log('Added unique constraint to problem_patterns');
  } catch (e) {
    console.error('Error on problem_patterns constraint:', e.message);
  }
}).finally(() => client.end());
