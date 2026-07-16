import db from './src/server/database';

async function run() {
  try {
    const siim = await db.prepare("SELECT id FROM suppliers WHERE name = 'SIIM'").get() as any;
    if (siim) {
      await db.prepare("UPDATE products SET supplier_id = ?, supplier = 'SIIM' WHERE supplier = 'SIM'").run(siim.id);
      console.log("Updated products with supplier 'SIM' to 'SIIM' and assigned supplier_id.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
