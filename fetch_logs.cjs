require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM activity_logs WHERE type = 'PRODUCT' AND action = 'update' AND details LIKE '%Qty:%'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

run().catch(console.error);
