require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE sales ADD COLUMN check_amount REAL');
    console.log("Column check_amount added successfully!");
  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    await client.end();
  }
}
run();
