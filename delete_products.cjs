const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  const ids = ['cc946660-970a-45bb-9906-f55a37aa515d', 'a299ee5b-f0b3-47f0-9b38-c91bf5c9580a'];
  const names = ['POMPE SOLAIRE VIGO 4DC 1500W', 'POPME SOLAIR VIGO ADC 1100 W']; // Based on the search results, there's a typo in the second one
  
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const name = names[i];
    const nameTrimmed = name.trim();
    
    try {
      await pool.query('BEGIN');
      
      console.log(`Deleting traces for product ${id}...`);
      
      let res;
      // sale_items
      try {
        res = await pool.query('DELETE FROM sale_items WHERE product_id = $1', [id]);
        console.log(`- sale_items: ${res.rowCount} rows`);
      } catch (e) {
        console.log(`- sale_items error: ${e.message}`);
      }
      
      // stock_movements
      try {
        res = await pool.query('DELETE FROM stock_movements WHERE product_id = $1', [id]);
        console.log(`- stock_movements: ${res.rowCount} rows`);
      } catch (e) {
        console.log(`- stock_movements error: ${e.message}`);
      }
      
      // supplier_history
      try {
        res = await pool.query('DELETE FROM supplier_history WHERE description ILIKE $1 OR description ILIKE $2', [`%${id}%`, `%${nameTrimmed}%`]);
        console.log(`- supplier_history: ${res.rowCount} rows`);
      } catch (e) {
        console.log(`- supplier_history error: ${e.message}`);
      }
      
      // activity_log
      try {
        res = await pool.query('DELETE FROM activity_log WHERE details ILIKE $1 OR details ILIKE $2', [`%${id}%`, `%${nameTrimmed}%`]);
        console.log(`- activity_log: ${res.rowCount} rows`);
      } catch (e) {
        console.log(`- activity_log error: ${e.message}`);
      }

      // products
      try {
        res = await pool.query('DELETE FROM products WHERE id = $1', [id]);
        console.log(`- products: ${res.rowCount} rows`);
      } catch (e) {
        console.log(`- products error: ${e.message}`);
      }
      
      await pool.query('COMMIT');
      console.log(`Finished deleting traces for product ${id}.\n`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`Error deleting product ${id}:`, err);
    }
  }
  
  pool.end();
}

run();
