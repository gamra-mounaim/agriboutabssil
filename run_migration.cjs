const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_aeIKni3VbrU9@ep-round-fog-abjgsrd3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require',
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
