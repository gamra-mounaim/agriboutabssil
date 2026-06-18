const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

try {
  const sale = db.prepare('SELECT id, total, check_amount, customer_id, customer_name, payment_method FROM sales WHERE customer_name LIKE "%ALAL BOASSRIA%"').get();
  console.log("SALE:", sale);
  const history = db.prepare('SELECT * FROM customer_history WHERE customer_id = ?').all(sale.customer_id);
  console.log("HISTORY:", history);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(sale.customer_id);
  console.log("CUSTOMER:", customer);
} catch (e) {
  console.error("ERROR:", e.message);
}
