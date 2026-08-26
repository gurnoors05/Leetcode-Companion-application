const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_nMLVNak25SRo@ep-sweet-violet-axg4ujai.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'problems'");
}).then(res => {
  console.log(res.rows);
}).catch(console.error).finally(() => client.end());
