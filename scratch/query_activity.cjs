const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_aeIKni3VbrU9@ep-round-fog-abjgsrd3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const activity = await pool.query(`SELECT * FROM activity_log WHERE details ILIKE '%ADAPTATEUR INFERIEUR EN FONTE 3%' ORDER BY timestamp ASC`);
    console.log("--- ACTIVITY LOG ---");
    console.table(activity.rows);

    const movements = await pool.query(`SELECT * FROM stock_movements WHERE product_name ILIKE '%ADAPTATEUR INFERIEUR EN FONTE 3%' ORDER BY timestamp ASC`);
    console.log("--- STOCK MOVEMENTS ---");
    console.table(movements.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
