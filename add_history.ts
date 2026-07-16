import db from './src/server/database';
import { v4 as uuidv4 } from 'uuid';

async function execute() {
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

          if (product && product.supplier_id) {
            const cost = product.cost_price || 0;
            const totalCost = cost * addedQty;
            
            // Insert supplier history ONLY (since debt is already updated)
            await db.prepare(`
              INSERT INTO supplier_history (id, supplier_id, type, amount, description)
              VALUES (?, ?, 'CHARGE', ?, ?)
            `).run(uuidv4(), product.supplier_id, totalCost, `Stock Refill: ${product.name} (${addedQty} units @ ${cost} DH) [Correction]`);

            console.log(`Added supplier history for: ${product.name} | Amount: ${totalCost} | Supplier: ${product.supplier}`);
          }
        }
      }
    }
    console.log("Supplier history updated!");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

execute();
