const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_aeIKni3VbrU9@ep-round-fog-abjgsrd3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const products = await pool.query(`SELECT * FROM products WHERE name ILIKE '%ADAPTATEUR INFERIEUR EN FONTE 3%'`);
    console.log("--- PRODUCTS ---");
    console.table(products.rows);

    const history = await pool.query(`SELECT * FROM supplier_history WHERE description ILIKE '%ADAPTATEUR INFERIEUR EN FONTE 3%'`);
    console.log("--- SUPPLIER HISTORY ---");
    console.table(history.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
