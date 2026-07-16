import db from './src/server/database';

async function updateLogs() {
  try {
    const logs = await db.prepare("SELECT * FROM activity_log WHERE type = 'PRODUCT' AND action = 'update' AND details LIKE '%Qty:%'").all() as any[];
    
    for (const log of logs) {
      const match = log.details.match(/Updated product: (.*?)\s*\|.*Qty: (\d+)->(\d+)/);
      if (match) {
        const originalNameFromLog = log.details.substring("Updated product: ".length, log.details.indexOf(" | Changes:"));
        const oldQty = parseInt(match[2]);
        const newQty = parseInt(match[3]);
        const addedQty = newQty - oldQty;

        if (addedQty > 0) {
          let product = await db.prepare('SELECT id, name, cost_price, supplier_id, supplier FROM products WHERE name = ?').get(originalNameFromLog) as any;
          if (!product) {
              product = await db.prepare('SELECT id, name, cost_price, supplier_id, supplier FROM products WHERE name LIKE ?').get(originalNameFromLog.trim() + '%') as any;
          }

          const hasSupplier = product && product.supplier_id;
          const newDetails = `Stock in: ${product.name} (${addedQty} unités)${hasSupplier ? ' via Supplier' : ''}`;
          
          await db.prepare("UPDATE activity_log SET type = 'STOCK', details = ? WHERE id = ?").run(newDetails, log.id);
          console.log(`Updated log: ${log.id} to ${newDetails}`);
        }
      }
    }
    console.log("Activity logs updated!");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

updateLogs();
