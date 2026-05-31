const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

const statsApiOld = `  app.get("/api/stats", async (req, res) => {
    const totalSales = ((await db.prepare('SELECT SUM(total) as total FROM sales').get()) as any).total || 0;
    const transactions = ((await db.prepare('SELECT COUNT(*) as count FROM sales').get()) as any).count || 0;
    const totalStock = ((await db.prepare('SELECT SUM(qty) as total FROM products').get()) as any).total || 0;
    const inventoryValue = ((await db.prepare('SELECT SUM(cost_price * qty) as total FROM products').get()) as any).total || 0;
    const expectedProfit = ((await db.prepare('SELECT SUM((price - cost_price) * qty) as total FROM products').get()) as any).total || 0;
    const activeSuppliers = ((await db.prepare('SELECT COUNT(DISTINCT supplier) as count FROM products WHERE supplier IS NOT NULL').get()) as any).count || 0;
    const outstandingDebt = ((await db.prepare('SELECT SUM(debt) as total FROM customers').get()) as any).total || 0;
    const supplierDebt = ((await db.prepare('SELECT SUM(debt) as total FROM suppliers').get()) as any).total || 0;

    const dailyProfitQuery = \`
      SELECT COALESCE(SUM((si.price - COALESCE(p.cost_price, si.price)) * si.qty), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.date >= CURRENT_DATE
    \`;
    const weeklyProfitQuery = \`
      SELECT COALESCE(SUM((si.price - COALESCE(p.cost_price, si.price)) * si.qty), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.date >= DATE_TRUNC('week', CURRENT_DATE)
    \`;
    const monthlyProfitQuery = \`
      SELECT COALESCE(SUM((si.price - COALESCE(p.cost_price, si.price)) * si.qty), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.date >= DATE_TRUNC('month', CURRENT_DATE)
    \`;
    const yearlyProfitQuery = \`
      SELECT COALESCE(SUM((si.price - COALESCE(p.cost_price, si.price)) * si.qty), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
    \`;

    const dailyProfit = ((await db.prepare(dailyProfitQuery).get()) as any).profit || 0;
    const weeklyProfit = ((await db.prepare(weeklyProfitQuery).get()) as any).profit || 0;
    const monthlyProfit = ((await db.prepare(monthlyProfitQuery).get()) as any).profit || 0;
    const yearlyProfit = ((await db.prepare(yearlyProfitQuery).get()) as any).profit || 0;
 
    res.json(toCamel({
      totalSales,
      transactions,
      totalStock,
      inventoryValue,
      expectedProfit,
      activeSuppliers,
      outstandingDebt,
      supplierDebt,
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
      yearlyProfit
    }));
  });`;

const statsApiNew = `  app.get("/api/stats", async (req, res) => {
    const totalSales = ((await db.prepare('SELECT SUM(total) as total FROM sales').get()) as any).total || 0;
    const transactions = ((await db.prepare('SELECT COUNT(*) as count FROM sales').get()) as any).count || 0;
    const totalStock = ((await db.prepare('SELECT SUM(qty) as total FROM products').get()) as any).total || 0;
    const inventoryValue = ((await db.prepare('SELECT SUM(cost_price * qty) as total FROM products').get()) as any).total || 0;
    const expectedProfit = ((await db.prepare('SELECT SUM((price - cost_price) * qty) as total FROM products').get()) as any).total || 0;
    const activeSuppliers = ((await db.prepare('SELECT COUNT(DISTINCT supplier) as count FROM products WHERE supplier IS NOT NULL').get()) as any).count || 0;
    const outstandingDebt = ((await db.prepare('SELECT SUM(debt) as total FROM customers').get()) as any).total || 0;
    const supplierDebt = ((await db.prepare('SELECT SUM(debt) as total FROM suppliers').get()) as any).total || 0;

    // Last 7 days sales trend
    const last7DaysData = await db.prepare(\`
      SELECT date(date) as date, SUM(total) as amount
      FROM sales
      WHERE date >= date('now', '-6 days')
      GROUP BY date(date)
      ORDER BY date(date) ASC
    \`).all();
    
    // Create an array with all 7 days (even if amount is 0)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = last7DaysData.find((row: any) => row.date === dateStr);
      last7Days.push({
        date: \`\${d.getDate()}/\${d.getMonth() + 1}\`,
        amount: found ? found.amount : 0
      });
    }

    // Top Selling Products
    const topProductsList = await db.prepare(\`
      SELECT p.id, p.name, SUM(si.qty) as qty, MAX(p.price) as price
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY qty DESC
      LIMIT 5
    \`).all();

    res.json(toCamel({
      totalSales,
      transactions,
      totalStock,
      inventoryValue,
      expectedProfit,
      activeSuppliers,
      outstandingDebt,
      supplierDebt,
      last7Days,
      topProductsList
    }));
  });`;

if (server.includes(statsApiOld)) {
  server = server.replace(statsApiOld, statsApiNew);
  fs.writeFileSync('server.ts', server);
  console.log("Replaced stats API");
} else {
  console.log("Could not find stats API old block. Writing to temp file to check differences...");
  fs.writeFileSync('server_old.txt', statsApiOld);
}
