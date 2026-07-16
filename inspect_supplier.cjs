const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Check product
    const { rows: products } = await client.query(`SELECT * FROM products WHERE name LIKE '%ONDULEUR MUST 3200 W%'`);
    console.log('Products:', products);

    // Check supplier history
    const { rows: history } = await client.query(`SELECT * FROM supplier_history WHERE description LIKE '%ONDULEUR MUST 3200 W%'`);
    console.log('Supplier History:', history);

  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
