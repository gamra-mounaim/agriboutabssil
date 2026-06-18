const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_aeIKni3VbrU9@ep-round-fog-abjgsrd3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  await client.connect();
  try {
    await client.query('BEGIN');
    
    const customerId = '7f8b2760-6278-46fc-b72d-08ba177d5e62';
    const saleId = 'f6f1b3f5-ed6f-4151-9d64-e6d7208470f7';

    // Delete all other sales for this customer
    await client.query('DELETE FROM sales WHERE customer_id = $1 AND id != $2', [customerId, saleId]);

    // Delete all customer history
    await client.query('DELETE FROM customer_history WHERE customer_id = $1', [customerId]);

    // Delete all payments
    await client.query('DELETE FROM payments WHERE customer_id = $1', [customerId]);

    // Update the sale
    // The total value of the items is 81750. He paid 40000 by check.
    await client.query('UPDATE sales SET total = 81750, subtotal = 81750, check_amount = 40000 WHERE id = $1', [saleId]);

    // Update customer debt
    const debt = 81750 - 40000; // 41750
    await client.query('UPDATE customers SET debt = $1 WHERE id = $2', [debt, customerId]);

    // Insert a single history record to represent the debt so it shows in Total Accumulé
    await client.query(`
      INSERT INTO customer_history (id, customer_id, type, amount, description, date)
      VALUES ($1, $2, 'DEBT', $3, 'Reste de la facture #25 (Non payé par chèque)', CURRENT_TIMESTAMP)
    `, ['uuid-' + Date.now(), customerId, debt]);

    await client.query('COMMIT');
    console.log("Database cleanup successful!");
  } catch (e) {
    await client.query('ROLLBACK');
    console.log("Error:", e.message);
  } finally {
    await client.end();
  }
}
run();
