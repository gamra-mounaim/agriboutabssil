import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. Defaulting to local PostgreSQL defaults.");
} else {
  console.log("DATABASE_URL found. Length:", process.env.DATABASE_URL.length);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function convertQuery(sql: string) {
  // If the query already uses $1, $2, etc., don't convert
  if (sql.includes('$1')) return sql;
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

const db = {
  prepare: (sql: string) => {
    const pgSql = convertQuery(sql);
    return {
      all: async (...params: any[]) => {
        const { rows } = await pool.query(pgSql, params);
        return rows;
      },
      get: async (...params: any[]) => {
        const { rows } = await pool.query(pgSql, params);
        return rows[0];
      },
      run: async (...params: any[]) => {
        const result = await pool.query(pgSql, params);
        return result;
      }
    };
  },
  exec: async (sql: string) => {
    await pool.query(sql);
  }
};

export async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'staff',
      email TEXT,
      permissions TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      debt REAL DEFAULT 0,
      due_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      cost_price REAL,
      qty INTEGER,
      min_stock INTEGER DEFAULT 5,
      barcode TEXT,
      category_id TEXT,
      supplier TEXT,
      supplier_id TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT, 
      title TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backup_history (
      id TEXT PRIMARY KEY,
      filename TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      debt REAL DEFAULT 0,
      due_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number INTEGER,
      total REAL,
      subtotal REAL,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      customer_id TEXT,
      customer_name TEXT,
      staff_id TEXT,
      check_number TEXT,
      check_owner TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (staff_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id TEXT,
      product_id TEXT,
      name TEXT,
      price REAL,
      qty INTEGER,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      amount REAL,
      staff_id TEXT,
      payment_method TEXT DEFAULT 'CASH',
      check_number TEXT,
      check_due_date TIMESTAMP,
      check_owner TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id),
      FOREIGN KEY (staff_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT,
      type TEXT, 
      quantity INTEGER,
      reason TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actor TEXT,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customer_history (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      type TEXT,
      amount REAL,
      description TEXT,
      payment_method TEXT DEFAULT 'CASH',
      check_number TEXT,
      check_due_date TIMESTAMP,
      check_owner TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      type TEXT, 
      action TEXT, 
      details TEXT,
      actor_id TEXT,
      actor_name TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      shop_name TEXT,
      shop_address TEXT,
      shop_phone TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supplier_history (
      id TEXT PRIMARY KEY,
      supplier_id TEXT,
      type TEXT,
      amount REAL,
      description TEXT,
      payment_method TEXT DEFAULT 'CASH',
      check_number TEXT,
      check_due_date TIMESTAMP,
      check_owner TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    );

    CREATE TABLE IF NOT EXISTS google_auth (
      id TEXT PRIMARY KEY,
      tokens TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.prepare('ALTER TABLE sales ADD COLUMN invoice_number INTEGER').run();
  } catch (e) {}

  try {
    await db.prepare('ALTER TABLE suppliers ADD COLUMN due_date TEXT').run();
  } catch (e) {}

  // Initialize settings
  const settingsData = await db.prepare('SELECT * FROM settings WHERE id = $1').get('main');
  if (!settingsData) {
    await db.prepare(`
      INSERT INTO settings (id, shop_name, shop_address, shop_phone)
      VALUES ($1, $2, $3, $4)
    `).run('main', 'Mon Magasin', 'Adresse du Magasin', '06XXXXXXXX');
  }

  // Bootstrap admin definitively
  const adminHash = '87a6e581ddbffa6c0760a83a4359078a3f885f6b4124738a364c9bb93393048f'; // SHA-256 for 'yassir2019'
  const admin = await db.prepare('SELECT id FROM users WHERE username = $1').get('gamra');
  
  const adminPerms = JSON.stringify({ 
    stock: true, 
    customers: true, 
    history: true, 
    profits: true, 
    editStock: true,
    supplierDebt: true,
    financials: true,
    financialsSales: true,
    financialsDebts: true,
    financialsProfits: true,
    financialsInventory: true,
    viewSupplierDebtAmount: true
  });

  if (!admin) {
    await db.prepare(`
      INSERT INTO users (id, username, password, role, email, permissions) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `).run(
      'admin', 
      'gamra', 
      adminHash, 
      'admin', 
      'admin@pos.local',
      adminPerms
    );
  } else {
    // Force reset admin password to yassir2019
    await db.prepare('UPDATE users SET password = $1, permissions = $2 WHERE id = $3').run(adminHash, adminPerms, admin.id);
    console.log("Admin password has been reset to yassir2019");
  }

  // await seedData(); // Disabled to ensure database starts completely empty for production
}

async function seedData() {
  const categories = [
    { id: 'cat-peinture', name: 'قسم الصباغة (Peinture)' },
    { id: 'cat-pvc', name: 'قسم قوادس الماء PVC' },
    { id: 'cat-electricite', name: 'قسم الكهرباء' }
  ];

  const products = [
    { id: 'p-paint-1', name: 'Peinture Mate Blanc', price: 150, cost: 120, cat: 'cat-peinture' },
    { id: 'p-paint-2', name: 'Peinture Satinée', price: 250, cost: 200, cat: 'cat-peinture' },
    { id: 'p-paint-3', name: 'Peinture Lavable', price: 200, cost: 160, cat: 'cat-peinture' },
    { id: 'p-paint-4', name: 'Peinture façade extérieure', price: 300, cost: 240, cat: 'cat-peinture' },
    { id: 'p-paint-5', name: 'Enduit de finition', price: 80, cost: 60, cat: 'cat-peinture' },
    { id: 'p-tool-1', name: 'Rouleau peinture', price: 35, cost: 20, cat: 'cat-peinture' },
    { id: 'p-tool-2', name: 'Pinceaux', price: 15, cost: 8, cat: 'cat-peinture' },
    { id: 'p-tool-3', name: 'Rubان adhésif peinture', price: 10, cost: 5, cat: 'cat-peinture' },
    { id: 'p-tool-4', name: 'Bac peinture', price: 25, cost: 15, cat: 'cat-peinture' },
    { id: 'p-tool-5', name: 'Papier de verre', price: 5, cost: 2, cat: 'cat-peinture' },
    { id: 'p-pvc-1', name: 'PVC 20mm', price: 12, cost: 8, cat: 'cat-pvc' },
    { id: 'p-pvc-2', name: 'PVC 32mm', price: 18, cost: 12, cat: 'cat-pvc' },
    { id: 'p-pvc-3', name: 'PVC 40mm', price: 25, cost: 18, cat: 'cat-pvc' },
    { id: 'p-pvc-4', name: 'PVC 63mm', price: 45, cost: 35, cat: 'cat-pvc' },
    { id: 'p-pvc-5', name: 'Coude PVC', price: 8, cost: 4, cat: 'cat-pvc' },
    { id: 'p-pvc-6', name: 'Té PVC', price: 10, cost: 5, cat: 'cat-pvc' },
    { id: 'p-pvc-7', name: 'Vanne PVC', price: 85, cost: 65, cat: 'cat-pvc' },
    { id: 'p-irr-1', name: 'Goutte à goutte', price: 250, cost: 200, cat: 'cat-pvc' },
    { id: 'p-irr-2', name: 'Tuyau agricole noir', price: 400, cost: 320, cat: 'cat-pvc' },
    { id: 'p-irr-3', name: 'Filtre irrigation', price: 120, cost: 90, cat: 'cat-pvc' },
    { id: 'p-irr-4', name: 'Raccord rapide', price: 15, cost: 10, cat: 'cat-pvc' },
    { id: 'p-elec-1', name: 'Fil électrique 1.5mm', price: 120, cost: 90, cat: 'cat-electricite' },
    { id: 'p-elec-2', name: 'Fil électrique 2.5mm', price: 180, cost: 140, cat: 'cat-electricite' },
    { id: 'p-elec-3', name: 'Câble 4mm', price: 350, cost: 280, cat: 'cat-electricite' },
    { id: 'p-elec-4', name: 'Câble souterrain', price: 550, cost: 450, cat: 'cat-electricite' },
    { id: 'p-gear-1', name: 'Disjoncteur', price: 120, cost: 85, cat: 'cat-electricite' },
    { id: 'p-gear-2', name: 'Prise électrique', price: 25, cost: 15, cat: 'cat-electricite' },
    { id: 'p-gear-3', name: 'Interrupteur', price: 20, cost: 12, cat: 'cat-electricite' },
    { id: 'p-gear-4', name: 'Tableau électrique', price: 450, cost: 350, cat: 'cat-electricite' },
    { id: 'p-gear-5', name: 'Lampe LED', price: 15, cost: 8, cat: 'cat-electricite' }
  ];

  for (const cat of categories) {
    await db.prepare('INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING').run(cat.id, cat.name);
  }

  for (const p of products) {
    await db.prepare(`
      INSERT INTO products (id, name, price, cost_price, qty, category_id)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING
    `).run(p.id, p.name, p.price, p.cost, 100, p.cat);
  }
}

export default db;
