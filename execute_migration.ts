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
            
            // 1. Add debt to supplier
            await db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(totalCost, product.supplier_id);
            
            // 2. Insert stock movement
            await db.prepare(`
              INSERT INTO stock_movements (id, product_id, product_name, type, quantity, reason, actor, cost_price)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), product.id, product.name, 'in', addedQty, 'Correction - Entrée non enregistrée (Edit Produit)', 'system', cost);

            console.log(`Processed: ${product.name} | Added Qty: ${addedQty} | Debt Added: ${totalCost} to ${product.supplier}`);
          }
        }
      }
    }
    console.log("Migration Complete!");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

execute();
