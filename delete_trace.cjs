const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    const res = await pool.query("DELETE FROM supplier_history WHERE id = '66c04697-2b65-4368-a442-46e53868bd3c'");
    console.log(`Deleted ${res.rowCount} rows`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
