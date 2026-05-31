const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

// Replace the first GET /api/products
const oldProducts = `  app.get("/api/products", async (req, res) => {
    try {
      const products = await db.prepare('SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category_id = c.id').all();
      res.json(toCamel(products));
    } catch (err: any) {
      console.error("Error in GET /api/products:", err);
      res.status(500).json({ status: "error", message: "Failed to fetch products from database", details: err.message });
    }
  });`;

const newProducts = `  app.get("/api/products", async (req, res) => {
    if (!req.query.page) {
      const products = await db.prepare('SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name ASC').all();
      return res.json(toCamel(products));
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search ? \`%\${req.query.search}%\` : null;
    
    let query = 'SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category_id = c.id';
    let countQuery = 'SELECT COUNT(*) as count FROM products';
    let params: any[] = [];
    
    if (search) {
      query += ' WHERE p.name LIKE ? OR p.barcode LIKE ?';
      countQuery += ' WHERE name LIKE ? OR barcode LIKE ?';
      params.push(search, search);
    }
    
    query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
    
    try {
      const total = (await db.prepare(countQuery).get(...params) as any).count;
      const products = await db.prepare(query).all(...params, limit, (page - 1) * limit);
      res.json({ data: toCamel(products), total, page, limit });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });`;

server = server.replace(oldProducts, newProducts);

// Delete the duplicate GET /api/categories (around line 742)
const duplicateCategories = `  app.get("/api/categories", async (req, res) => {
    const categories = await db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(toCamel(categories));
  });`;
server = server.replace(duplicateCategories, '');

// Delete the duplicate GET /api/products (around line 769)
const duplicateProducts = `  app.get("/api/products", async (req, res) => {
    if (!req.query.page) {
      const products = await db.prepare('SELECT * FROM products ORDER BY name ASC').all();
      return res.json(toCamel(products));
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search ? \`%\${req.query.search}%\` : null;
    
    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) as count FROM products';
    let params: any[] = [];
    
    if (search) {
      query += ' WHERE name LIKE ? OR barcode LIKE ?';
      countQuery += ' WHERE name LIKE ? OR barcode LIKE ?';
      params.push(search, search);
    }
    
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    
    const total = (await db.prepare(countQuery).get(...params) as any).count;
    const products = await db.prepare(query).all(...params, limit, (page - 1) * limit);
    
    res.json({ data: toCamel(products), total, page, limit });
  });`;

server = server.replace(duplicateProducts, '');

fs.writeFileSync('server.ts', server);
console.log("Refactoring complete");
