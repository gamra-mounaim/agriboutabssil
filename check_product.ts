import db from './src/server/database';

async function run() {
  try {
    const p = await db.prepare("SELECT id, name, cost_price, supplier_id, supplier FROM products WHERE name LIKE '%VANNE A COLLER 50 ROUGE%'").all();
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
