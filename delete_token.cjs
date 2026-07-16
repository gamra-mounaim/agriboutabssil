require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("DELETE FROM google_auth WHERE id = 'main'");
    console.log(`Deleted ${res.rowCount} rows from google_auth`);
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
