const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_aeIKni3VbrU9@ep-round-fog-abjgsrd3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  await client.connect();
  try {
    const customerRes = await client.query(`SELECT * FROM customers WHERE name ILIKE '%ALAL BOASSRIA%'`);
    const customer = customerRes.rows[0];
    if (!customer) {
      console.log("Customer not found!");
      return;
    }
    console.log("CUSTOMER:", customer);

    const salesRes = await client.query(`SELECT * FROM sales WHERE customer_id = $1`, [customer.id]);
    console.log("SALES:", salesRes.rows);

    for (const sale of salesRes.rows) {
      const itemsRes = await client.query(`SELECT * FROM sale_items WHERE sale_id = $1`, [sale.id]);
      console.log(`SALE ITEMS FOR ${sale.invoice_number}:`, itemsRes.rows);
      
      let calculatedTotal = 0;
      for (const item of itemsRes.rows) {
        calculatedTotal += item.qty * item.price;
      }
      console.log(`CALCULATED TOTAL FOR SALE ${sale.invoice_number}:`, calculatedTotal);
    }

    const historyRes = await client.query(`SELECT * FROM customer_history WHERE customer_id = $1`, [customer.id]);
    console.log("HISTORY:", historyRes.rows);

    const paymentsRes = await client.query(`SELECT * FROM payments WHERE customer_id = $1`, [customer.id]);
    console.log("PAYMENTS:", paymentsRes.rows);

  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    await client.end();
  }
}
run();
