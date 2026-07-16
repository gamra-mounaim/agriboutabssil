import db from "./src/server/database.js";

async function runAudit() {
  console.log("Starting stock audit...");
  
  const products = (await db.prepare('SELECT id, name, qty FROM products').all()) as any[];
  const saleItems = (await db.prepare('SELECT product_id, qty FROM sale_items').all()) as any[];
  const stockMovements = (await db.prepare("SELECT product_id, type, quantity FROM stock_movements WHERE type != 'sale'").all()) as any[];
  const creations = (await db.prepare("SELECT details, timestamp FROM activity_log WHERE type = 'PRODUCT' AND action = 'create'").all()) as any[];
  
  if (!products) {
    console.error("Products is undefined");
    return;
  }
  
  let discrepancies = [];
  
  for (const product of products) {
    let historyDeltas = 0;
    let hasCreate = false;
    
    // Process sales for this product
    const pSales = saleItems.filter(s => s.product_id === product.id);
    for (const s of pSales) {
      historyDeltas -= s.qty; // Sale decreases stock
    }
    
    // Process stock movements for this product
    const pMovements = stockMovements.filter(m => m.product_id === product.id);
    for (const mov of pMovements) {
      const t = mov.type.toLowerCase();
      if (t === 'create') hasCreate = true;
      
      if (t === 'out') {
        historyDeltas -= mov.quantity;
      } else if (t === 'in' || t === 'create' || t === 'update') {
        historyDeltas += mov.quantity;
      }
    }
    
    let initialQty = 0;
    if (!hasCreate) {
      const normalizeName = (str: string) => str.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
      const prodNorm = normalizeName(product.name);
      const matchedAct = creations.find(act => {
        const detailsNorm = normalizeName(act.details);
        return detailsNorm.includes(prodNorm) || prodNorm.includes(detailsNorm);
      });
      
      if (matchedAct) {
        const qtyMatch = matchedAct.details.match(/(?:Qté\s*:\s*|Qty\s*:\s*|Quantité\s*:\s*|quantité\s*:\s*|qté\s*:\s*)(\d+)/i);
        if (qtyMatch) {
          initialQty = parseInt(qtyMatch[1], 10);
        } else {
          initialQty = Math.max(0, product.qty - historyDeltas);
        }
      } else {
        initialQty = Math.max(0, product.qty - historyDeltas);
      }
      
      const expectedCurrentQty = initialQty + historyDeltas;
      if (expectedCurrentQty !== product.qty) {
        discrepancies.push({
          product: product.name,
          currentQty: product.qty,
          expectedQty: expectedCurrentQty,
          difference: product.qty - expectedCurrentQty,
          hasCreateEvent: false,
          initialQtyParsed: initialQty,
          sumDeltas: historyDeltas
        });
      }
    } else {
      if (historyDeltas !== product.qty) {
        discrepancies.push({
          product: product.name,
          currentQty: product.qty,
          expectedQty: historyDeltas,
          difference: product.qty - historyDeltas,
          hasCreateEvent: true,
          initialQtyParsed: 'N/A',
          sumDeltas: historyDeltas
        });
      }
    }
  }
  
  console.log(JSON.stringify({
    totalProducts: products.length,
    discrepanciesCount: discrepancies.length,
    discrepancies
  }, null, 2));
  
  process.exit(0);
}

runAudit().catch(console.error);
