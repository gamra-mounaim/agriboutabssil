const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find sale
    const { rows: sales } = await client.query('SELECT * FROM sales WHERE invoice_number = 193');
    if (sales.length === 0) {
      console.log('Sale 193 not found');
      return;
    }
    const sale = sales[0];
    console.log('Found Sale:', sale);
    
    // Find items
    const { rows: items } = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
    console.log('Found Items:', items);
    
    // Return stock
    for (const item of items) {
      await client.query('UPDATE products SET qty = qty + $1 WHERE id = $2', [item.qty, item.product_id]);
      console.log(`Restored ${item.qty} to product ${item.product_id} (${item.name})`);
    }
    
    // Delete stock movements
    const shortId = sale.id.slice(0, 8);
    const { rowCount: smCount } = await client.query(`DELETE FROM stock_movements WHERE reason LIKE $1`, [`Sale #${shortId}%`]);
    console.log(`Deleted ${smCount} stock movements`);
    
    // Delete customer history if debt or check
    if (sale.customer_id) {
      // Find if there is customer history for this
      // Usually description contains invoice number
      const { rowCount: chCount } = await client.query(`DELETE FROM customer_history WHERE customer_id = $1 AND description LIKE $2`, [sale.customer_id, `%#193%`]);
      console.log(`Deleted ${chCount} customer history records`);
      
      // If payment was debt, revert debt
      if (sale.payment_method === 'debt') {
        await client.query('UPDATE customers SET debt = debt - $1 WHERE id = $2', [sale.total, sale.customer_id]);
        console.log(`Reduced debt by ${sale.total}`);
      }
    }
    
    // Delete sale items
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [sale.id]);
    
    // Delete sale
    await client.query('DELETE FROM sales WHERE id = $1', [sale.id]);
    
    console.log('Successfully deleted sale 193 and restored everything.');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
