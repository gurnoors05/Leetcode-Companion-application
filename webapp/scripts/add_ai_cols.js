const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_nMLVNak25SRo@ep-sweet-violet-axg4ujai.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(() => {
  return client.query(`
    ALTER TABLE problem_patterns 
    ADD COLUMN IF NOT EXISTS ai_reasoning text,
    ADD COLUMN IF NOT EXISTS ai_time_complexity varchar(255),
    ADD COLUMN IF NOT EXISTS ai_space_complexity varchar(255),
    ADD COLUMN IF NOT EXISTS ai_verified boolean DEFAULT false;
  `);
}).then(res => {
  console.log('AI COLUMNS ADDED');
}).catch(console.error).finally(() => client.end());
