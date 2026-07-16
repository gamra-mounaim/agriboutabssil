const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    // Check oldest product creation
    const res1 = await client.query('SELECT MIN(created_at) as first_product FROM products;');
    // Check oldest activity log
    const res2 = await client.query('SELECT MIN(timestamp) as first_activity FROM activity_logs;');
    
    console.log("First Product:", res1.rows[0].first_product);
    console.log("First Activity:", res2.rows[0].first_activity);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
