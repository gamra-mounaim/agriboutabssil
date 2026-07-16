import db from "./src/server/database.js";
import { v4 as uuidv4 } from 'uuid';

async function fixStock() {
  console.log("Starting stock fix...");
  
  const products = (await db.prepare('SELECT id, name, qty, created_at, cost_price FROM products').all()) as any[];
  const saleItems = (await db.prepare('SELECT product_id, qty FROM sale_items').all()) as any[];
  const stockMovements = (await db.prepare("SELECT product_id, type, quantity FROM stock_movements WHERE type != 'sale'").all()) as any[];
  
  const productsToFix = [
    "VEICHI 2.2 K W",
    "MONCHO IGAL 32",
    "INVET 22KW",
    "POMPE IMMERGEE 0.75 KW "
  ];
  
  for (const product of products) {
    if (!productsToFix.includes(product.name)) continue;
    
    let historyDeltas = 0;
    
    const pSales = saleItems.filter(s => s.product_id === product.id);
    for (const s of pSales) {
      historyDeltas -= s.qty;
    }
    
    const pMovements = stockMovements.filter(m => m.product_id === product.id);
    for (const mov of pMovements) {
      const t = mov.type.toLowerCase();
      if (t === 'out') {
        historyDeltas -= mov.quantity;
      } else if (t === 'in' || t === 'update') {
        historyDeltas += mov.quantity;
      }
    }
    
    // The required initial quantity to make the math perfect
    const requiredInitialQty = product.qty - historyDeltas;
    
    console.log(`Fixing ${product.name}... Required Initial Qty: ${requiredInitialQty}`);
    
    // Insert the 'create' event
    await db.prepare(`
      INSERT INTO stock_movements (id, product_id, product_name, type, quantity, reason, timestamp, actor, cost_price)
      VALUES (?, ?, ?, 'create', ?, 'Création initiale (Fix)', ?, 'System', ?)
    `).run(
      uuidv4(), 
      product.id, 
      product.name, 
      requiredInitialQty, 
      product.created_at || new Date().toISOString(), 
      product.cost_price || 0
    );
    
    console.log(`✅ Fixed ${product.name}`);
  }
  
  console.log("Fix complete.");
  process.exit(0);
}

fixStock().catch(console.error);
