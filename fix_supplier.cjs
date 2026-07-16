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
    
    // Find the history entry
    const historyId = '0dece3a6-ca16-49ab-8877-4b3e9d0a1ecb';
    const supplierId = '257512f7-a933-49b9-b217-106eaf892ebd';
    const oldAmount = 88000;
    const newAmount = 74000; // 40 units * 1850
    const diff = oldAmount - newAmount; // 14000
    
    // Update supplier history
    await client.query('UPDATE supplier_history SET amount = $1 WHERE id = $2', [newAmount, historyId]);
    console.log(`Updated supplier history amount from ${oldAmount} to ${newAmount}`);
    
    // Update supplier debt
    await client.query('UPDATE suppliers SET debt = debt - $1 WHERE id = $2', [diff, supplierId]);
    console.log(`Reduced supplier debt by ${diff}`);

    await client.query('COMMIT');
    console.log('Done successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
