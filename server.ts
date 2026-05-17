import express from "express";
import fs from "fs";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import twilio from "twilio";
import db, { initDb } from "./src/server/database";
import { v4 as uuidv4 } from 'uuid';
import crypto from "node:crypto";
import { google } from "googleapis";

const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Initialize SQLite database
// initDb is now called inside startServer for better error handling

async function startServer() {
  console.log("Starting server process...");
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Listen early to pass Render health check
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });

  try {
    console.log("Initializing DB...");
    await initDb();
    console.log("PostgreSQL Database initialized.");
  } catch (dbError) {
    console.error("CRITICAL: Database initialization failed:", dbError);
  }

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/test", async (req, res) => {
    res.json({ status: "ok", message: "API is reachable" });
  });

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // --- Utilities ---
  const logActivity = async (type: string, action: string, details: string, actorId: string = 'system', actorName: string = 'System') => {
    try {
      await db.prepare(`
        INSERT INTO activity_log (id, type, action, details, actor_id, actor_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), type, action, details, actorId, actorName);
    } catch (e) {
      console.error("Activity logging failed:", e);
    }
  };

  const createNotification = async (type: string, title: string, message: string) => {
    try {
      await db.prepare(`
        INSERT INTO notifications (id, type, title, message)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), type, title, message);
    } catch (e) {
      console.error("Notification failed:", e);
    }
  };

  const toCamel = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    const newObj: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
      newObj[camelKey] = toCamel(obj[key]);
    }
    return newObj;
  };

  // --- Auth API ---
  app.post("/api/auth/login", async (req, res) => {
    const { username, password: rawPassword } = req.body;
    if (!username || !rawPassword) {
      return res.status(400).json({ status: "error", message: "Username and password required" });
    }

    const usernameLower = username.trim().toLowerCase();
    const hashedPassword = hashPassword(rawPassword.trim());
    
    // Check if the user is the hardcoded admin or in DB
    const ADMIN_HASH = '03ac674216f3e15c1d7b18221dd69da636011406d9345c20c85023902146452f';
    const isHardcodedAdmin = (usernameLower === 'admin') && (hashedPassword === ADMIN_HASH || rawPassword.trim() === '1234');

    try {
      const user = (await db.prepare('SELECT * FROM users WHERE username = $1 OR lower(username) = $2').get(username, usernameLower)) as any;

      if (user) {
        // Parse permissions if they are stored as a string
        if (typeof user.permissions === 'string') {
          try {
            user.permissions = JSON.parse(user.permissions);
          } catch (e) {
            console.error("Failed to parse user permissions:", e);
            user.permissions = {};
          }
        }

        if (user.password === hashedPassword || user.password === rawPassword.trim()) {
          const { password: _p, ...userWithoutPassword } = user;
          logActivity('STAFF', 'login', `User logged in: ${userWithoutPassword.username}`, userWithoutPassword.id, userWithoutPassword.username);
          return res.json({ status: "success", user: userWithoutPassword });
        }
      }

      if (isHardcodedAdmin) {
        logActivity('STAFF', 'login', `Admin login: admin`, 'admin', 'admin');
        return res.json({ 
          status: "success", 
          user: { 
            id: 'admin', 
            username: 'admin', 
            role: 'admin', 
            permissions: { stock: true, customers: true, history: true, profits: true, editStock: true } 
          } 
        });
      }

      res.status(401).json({ status: "error", message: "Invalid username or password" });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ status: "error", message: "Database error: " + error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password: rawPassword, role, permissions } = req.body;
    const usernameLower = username.trim().toLowerCase();
    const hashedPassword = hashPassword(rawPassword.trim());
    
    try {
      const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(usernameLower);
      if (existing) {
        return res.status(400).json({ status: "error", message: "Username already exists" });
      }

      await db.prepare(`
        INSERT INTO users (id, username, password, role, permissions)
        VALUES (?, ?, ?, ?, ?)
      `).run(usernameLower, usernameLower, hashedPassword, role, JSON.stringify(permissions));
      
      logActivity('STAFF', 'create', `Created new user: ${usernameLower} (${role})`, 'system', 'System');
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Users API ---
  app.get("/api/users", async (req, res) => {
    const users = await db.prepare('SELECT id, username, role, permissions, created_at FROM users').all();
    const formattedUsers = users.map((u: any) => ({
      ...toCamel(u),
      permissions: u.permissions ? JSON.parse(u.permissions) : {}
    }));
    res.json(formattedUsers);
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { role, permissions, password } = req.body;
    try {
      if (password && password.trim()) {
        const hashedPassword = hashPassword(password.trim());
        await db.prepare(`
          UPDATE users 
          SET role = ?, permissions = ?, password = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(role, JSON.stringify(permissions), hashedPassword, id);
      } else {
        await db.prepare(`
          UPDATE users 
          SET role = ?, permissions = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(role, JSON.stringify(permissions), id);
      }
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.prepare('DELETE FROM users WHERE id = ?').run(id);
      logActivity('STAFF', 'delete', `Deleted user account: ${id}`, 'system', 'System');
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Products API ---
  app.get("/api/products", async (req, res) => {
    try {
      const products = await db.prepare('SELECT p.*, c.name as categoryName FROM products p LEFT JOIN categories c ON p.category_id = c.id').all();
      res.json(toCamel(products));
    } catch (err: any) {
      console.error("Error in GET /api/products:", err);
      res.status(500).json({ status: "error", message: "Failed to fetch products from database", details: err.message });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await db.prepare('SELECT * FROM categories').all();
      res.json(toCamel(categories));
    } catch (err: any) {
      console.error("Error in GET /api/categories:", err);
      res.status(500).json({ status: "error", message: "Failed to fetch categories" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const notes = await db.prepare('SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 50').all();
      res.json(toCamel(notes));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    const { id } = req.params;
    try {
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // --- Auto-backup logic ---
  const performAutoBackup = async () => {
    try {
      const tables = [
        'users', 'categories', 'products', 'customers', 
        'sales', 'sale_items', 'payments', 'stock_movements', 
        'customer_history', 'activity_log', 'suppliers', 'supplier_history',
        'settings'
      ];
      const data: any = {};
      for (const table of tables) {
        data[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      }
      data.version = "1.0";
      data.date = new Date().toISOString();

      if (!fs.existsSync('./backups')) fs.mkdirSync('./backups');
      const filename = `auto_backup_${new Date().toISOString().split('T')[0]}.json`;
      const backupContent = JSON.stringify(data, null, 2);
      fs.writeFileSync(`./backups/${filename}`, backupContent);
      
      await db.prepare('INSERT INTO backup_history (id, filename) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename').run('latest', filename);
      console.log(`Auto-backup completed: ${filename}`);

      // Try to send email backup if SMTP is configured
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const backupEmail = process.env.BACKUP_EMAIL || "gamragb@gmail.com";

      if (smtpUser && smtpPass && backupEmail) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
          tls: {
            rejectUnauthorized: false
          }
        });

        const mailOptions = {
          from: smtpUser,
          to: backupEmail,
          subject: `[AGRI BOUTABSSIL] Auto-Backup - ${new Date().toLocaleDateString()}`,
          text: `Please find attached the automatic backup of your system for ${new Date().toLocaleString()}.\n\nEnvironment: ${process.env.NODE_ENV || 'production'}`,
          attachments: [
            {
              filename: filename,
              content: backupContent
            }
          ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email backup sent successfully to ${backupEmail}`);
        return { success: true, emailSent: true };
      } else {
        const msg = !smtpUser || !smtpPass ? "SMTP credentials missing" : "Backup email not configured";
        console.log(`Email backup skipped: ${msg}`);
        return { success: true, emailSent: false, reason: msg };
      }
    } catch (err: any) {
      console.error("Auto-backup failed:", err);
      // Improve error message for SMTP authentication failures
      if (err.message.includes('535') || err.message.toLowerCase().includes('invalid login') || err.message.toLowerCase().includes('authentication failed')) {
        throw new Error("SMTP_AUTH_FAILED: If using Gmail, please use an 'App Password' from your Google Account settings.");
      }
      throw err;
    }
  };

  // --- Google Drive Auto-backup logic (Every 5 hours) ---
  const performDriveAutoBackup = async () => {
    try {
      const authData = (await db.prepare('SELECT tokens FROM google_auth WHERE id = ?').get('main')) as any;
      if (!authData) {
        console.log("Auto-backup to Google Drive skipped: Google account not linked.");
        return;
      }

      console.log("Attempting automatic Google Drive backup...");
      const tokens = JSON.parse(authData.tokens);
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/api/auth/google/callback`
      );
      oauth2Client.setCredentials(tokens);

      // Refresh token if needed and save it
      oauth2Client.on('tokens', async (newTokens) => {
        try {
          const row = (await db.prepare('SELECT tokens FROM google_auth WHERE id = ?').get('main')) as any;
          if (row) {
            const currentTokens = JSON.parse(row.tokens);
            const merged = { ...currentTokens, ...newTokens };
            await db.prepare('UPDATE google_auth SET tokens = ? WHERE id = ?').run(JSON.stringify(merged), 'main');
            console.log("Google Drive access token refreshed and saved during auto-backup.");
          }
        } catch (tokenErr) {
          console.error("Failed to save refreshed Google tokens during auto-backup:", tokenErr);
        }
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const tables = [
        'users', 'categories', 'products', 'customers', 
        'sales', 'sale_items', 'payments', 'stock_movements', 
        'customer_history', 'activity_log', 'suppliers', 'supplier_history',
        'settings'
      ];
      const data: any = {};
      for (const table of tables) {
        data[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      }
      const backupContent = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
      const fileName = `POS_AutoBackup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      const fileMetadata = {
        name: fileName,
        parents: [],
      };
      
      const media = {
        mimeType: 'application/json',
        body: backupContent,
      };

      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      console.log(`Auto-backup to Google Drive completed successfully: ${fileName}`);
    } catch (e: any) {
      console.error("Auto-backup to Google Drive failed:", e);
    }
  };

  // Run on startup (with delay) and every 12 hours
  setTimeout(async () => {
    console.log("Running initial auto-backup...");
    try {
      await performAutoBackup();
    } catch (err) {
      console.error("Initial auto-backup failed:", err);
    }
  }, 5000); // Wait 5 seconds after startup to avoid blocking initial requests

  // Run initial Google Drive backup 15 seconds after startup if connected
  setTimeout(async () => {
    await performDriveAutoBackup();
  }, 15000);

  // Email auto-backup interval (12 hours)
  setInterval(async () => {
    try {
      await performAutoBackup();
    } catch (err) {
      console.error("Scheduled auto-backup failed:", err);
    }
  }, 12 * 60 * 60 * 1000);

  // Google Drive auto-backup interval (5 hours)
  setInterval(async () => {
    await performDriveAutoBackup();
  }, 5 * 60 * 60 * 1000);

  app.post("/api/backup/email/send", async (req, res) => {
    try {
      const result = await performAutoBackup();
      if (result.emailSent) {
        res.json({ status: "success", message: "Email backup sent successfully." });
      } else {
        res.status(400).json({ status: "error", message: result.reason || "Email not sent" });
      }
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/backup/latest", async (req, res) => {
    try {
      const latest = (await db.prepare('SELECT * FROM backup_history WHERE id = ?').get('latest')) as any;
      res.json(latest || null);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch latest backup" });
    }
  });

  app.get("/api/backup", async (req, res) => {
    try {
      const data = {
        products: await db.prepare('SELECT * FROM products').all(),
        categories: await db.prepare('SELECT * FROM categories').all(),
        customers: await db.prepare('SELECT * FROM customers').all(),
        suppliers: await db.prepare('SELECT * FROM suppliers').all(),
        sales: await db.prepare('SELECT * FROM sales').all(),
        saleItems: await db.prepare('SELECT * FROM sale_items').all(),
        payments: await db.prepare('SELECT * FROM payments').all(),
        supplierHistory: await db.prepare('SELECT * FROM supplier_history').all(),
        activityLog: await db.prepare('SELECT * FROM activity_log').all(),
        settings: await db.prepare('SELECT * FROM settings').all(),
        version: "1.0",
        date: new Date().toISOString()
      };
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Backup failed" });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, price, costPrice, qty, minStock, barcode, categoryId, supplier, supplierId } = req.body;
    const id = uuidv4();
    try {
      await db.prepare(`
        INSERT INTO products (id, name, price, cost_price, qty, min_stock, barcode, category_id, supplier, supplier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, price, costPrice, qty, minStock, barcode, categoryId, supplier, supplierId);
      
      // Update supplier debt if qty > 0 and supplierId provided
      if (qty > 0 && supplierId && costPrice > 0) {
        const costAmount = (costPrice || 0) * qty;
        await db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(costAmount, supplierId);
        await db.prepare(`
          INSERT INTO supplier_history (id, supplier_id, type, amount, description)
          VALUES (?, ?, 'CHARGE', ?, ?)
        `).run(uuidv4(), supplierId, costAmount, `Initial stock: ${name} (${qty} units)`);
      }

      logActivity('PRODUCT', 'create', `Added product: ${name} (Qty: ${qty})`, 'system', 'System');
      res.json({ status: "success", id });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, costPrice, qty, minStock, barcode, categoryId, supplier, supplierId } = req.body;
    try {
      await db.prepare(`
        UPDATE products 
        SET name = ?, price = ?, cost_price = ?, qty = ?, min_stock = ?, barcode = ?, category_id = ?, supplier = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, price, costPrice, qty, minStock, barcode, categoryId, supplier, supplierId, id);
      
      logActivity('PRODUCT', 'update', `Updated product: ${name}`, 'system', 'System');
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/products/:id/adjust", async (req, res) => {
    const { id } = req.params;
    const { type, quantity, reason, actor, supplierId } = req.body;
    const movementId = uuidv4();

    const transaction = async () => {
      const product = (await db.prepare('SELECT name, qty, cost_price, min_stock FROM products WHERE id = ?').get(id)) as any;
      if (!product) throw new Error("Product not found");

      const newQty = type === 'in' ? product.qty + quantity : product.qty - quantity;
      
      await db.prepare('UPDATE products SET qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, id);
      
      await db.prepare(`
        INSERT INTO stock_movements (id, product_id, product_name, type, quantity, reason, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(movementId, id, product.name, type, quantity, reason, actor);

      // Check for low stock alert
      if (newQty <= (product.min_stock || 5)) {
        createNotification('STOCK', 'تنبيه مخزون منخفض / Low Stock Alert', 
          `${product.name}: Current quantity is ${newQty}`);
      }

      // If stock in and supplier provided, update supplier debt
      if (type === 'in' && supplierId) {
        const costAmount = (product.cost_price || 0) * quantity;
        if (costAmount > 0) {
          await db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(costAmount, supplierId);
          
          await db.prepare(`
            INSERT INTO supplier_history (id, supplier_id, type, amount, description)
            VALUES (?, ?, 'CHARGE', ?, ?)
          `).run(uuidv4(), supplierId, costAmount, `Stock Refill: ${product.name} (${quantity} units)`);
        }
      }

      logActivity('STOCK', 'update', `Stock ${type}: ${product.name} (${quantity} units)${supplierId ? ' via Supplier' : ''}`, actor || 'system', actor || 'System');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Categories API ---
  app.get("/api/categories", async (req, res) => {
    const categories = await db.prepare('SELECT * FROM categories').all();
    res.json(toCamel(categories));
  });

  app.post("/api/categories", async (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    try {
      await db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, name);
      logActivity('CATEGORY', 'create', `Created category: ${name}`, 'system', 'System');
      res.json({ status: "success", id });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Customers API ---
  app.get("/api/customers", async (req, res) => {
    const customers = await db.prepare('SELECT * FROM customers').all();
    res.json(toCamel(customers));
  });

  app.post("/api/customers", async (req, res) => {
    const { name, email, phone, address, debt, due_date } = req.body;
    const id = uuidv4();
    try {
      await db.prepare('INSERT INTO customers (id, name, email, phone, address, debt, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, email || '', phone || '', address || '', debt || 0, due_date || null);
      logActivity('CUSTOMER', 'create', `Added customer: ${name} (Initial Debt: ${debt || 0})`, 'system', 'System');
      res.json({ status: "success", id });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/customers/:id/payment", async (req, res) => {
    const { id } = req.params;
    const { amount, payment_method, check_number, check_due_date, check_owner } = req.body;
    const paymentId = uuidv4();
    
    const transaction = async () => {
      const customer = (await db.prepare('SELECT name FROM customers WHERE id = ?').get(id)) as any;
      await db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, id);
      await db.prepare(`
        INSERT INTO customer_history (id, customer_id, type, amount, description, payment_method, check_number, check_due_date, check_owner)
        VALUES (?, ?, 'PAYMENT', ?, 'Payment Received', ?, ?, ?, ?)
      `).run(paymentId, id, amount, payment_method || 'CASH', check_number || null, check_due_date || null, check_owner || null);
      
      await db.prepare(`
        INSERT INTO payments (id, customer_id, amount, date, payment_method, check_number, check_due_date, check_owner)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      `).run(paymentId, id, amount, payment_method || 'CASH', check_number || null, check_due_date || null, check_owner || null);

      logActivity('PAYMENT', 'create', `Payment of ${amount} from ${customer?.name || 'Customer'} (${payment_method || 'CASH'})`, 'system', 'System');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/customers/:id/charge", async (req, res) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const chargeId = uuidv4();
    
    const transaction = async () => {
      await db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(amount, id);
      await db.prepare(`
        INSERT INTO customer_history (id, customer_id, type, amount, description)
        VALUES (?, ?, 'DEBT', ?, ?)
      `).run(chargeId, id, amount, description || 'Manual Charge');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/customers/:id/return", async (req, res) => {
    const { id } = req.params;
    const { productId, qty, price, action, description } = req.body;
    const returnId = uuidv4();
    const movementId = uuidv4();
    
    const transaction = async () => {
      let customerName = "Client de passage / زبون عابر";
      
      if (id !== 'walking') {
        const customer = (await db.prepare('SELECT name FROM customers WHERE id = ?').get(id)) as any;
        if (!customer) throw new Error("Customer not found");
        customerName = customer.name;
      }
      
      const product = (await db.prepare('SELECT name FROM products WHERE id = ?').get(productId)) as any;
      if (!product) throw new Error("Product not found");

      const totalValue = qty * price;

      // 1. Put products back into stock
      await db.prepare('UPDATE products SET qty = qty + ? WHERE id = ?').run(qty, productId);

      // 2. Log stock movement
      await db.prepare(`
        INSERT INTO stock_movements (id, product_id, product_name, type, quantity, reason, timestamp, actor)
        VALUES (?, ?, ?, 'IN', ?, ?, CURRENT_TIMESTAMP, 'System')
      `).run(movementId, productId, product.name, qty, `Customer Return: ${customerName}`);

      // 3. Update Customer Debt if action is 'debt' (only if not a walking customer)
      if (action === 'debt' && id !== 'walking') {
        await db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(totalValue, id);
        
        // Log in customer history as a reduction of debt (type PAYMENT)
        await db.prepare(`
          INSERT INTO customer_history (id, customer_id, type, amount, description, payment_method)
          VALUES (?, ?, 'PAYMENT', ?, ?, 'CASH')
        `).run(returnId, id, totalValue, `Retour: ${qty} x ${product.name} (${description || 'Non spécifié'})`);
      } else if (id !== 'walking') {
        // If cash refund for a registered customer, debt remains the same, log with 0 value to show record of transaction
        await db.prepare(`
          INSERT INTO customer_history (id, customer_id, type, amount, description, payment_method)
          VALUES (?, ?, 'PAYMENT', 0, ?, 'CASH')
        `).run(returnId, id, `Retour Cash: ${qty} x ${product.name} (Remboursé ${totalValue} DH)`);
      }

      logActivity('RETURN', 'create', `Return of ${qty}x ${product.name} from ${customerName} (Value: ${totalValue})`, 'system', 'System');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/customers/:id/history", async (req, res) => {
    const { id } = req.params;
    try {
      const history = await db.prepare(`
        SELECT 
          id, 
          type, 
          amount, 
          description, 
          date,
          payment_method,
          check_number,
          check_due_date,
          check_owner,
          NULL as invoice_number
        FROM customer_history 
        WHERE customer_id = ?
        
        UNION ALL
        
        SELECT 
          id, 
          'SALE' as type, 
          total as amount, 
          'Sale #' || invoice_number as description, 
          date,
          payment_method,
          check_number,
          NULL as check_due_date,
          check_owner,
          invoice_number
        FROM sales 
        WHERE customer_id = ?
        
        ORDER BY date DESC
      `).all(id, id);
      res.json(toCamel(history));
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await db.prepare('SELECT p.*, c.name as customerName FROM payments p LEFT JOIN customers c ON p.customer_id = c.id ORDER BY p.date DESC').all();
      res.json(toCamel(payments));
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, debt, due_date } = req.body;
    try {
      await db.prepare(`
        UPDATE customers 
        SET name = ?, email = ?, phone = ?, address = ?, debt = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, email, phone, address, debt, due_date || null, id);
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Suppliers API ---
  app.get("/api/suppliers", async (req, res) => {
    const suppliers = await db.prepare('SELECT * FROM suppliers').all();
    res.json(toCamel(suppliers));
  });

  app.post("/api/suppliers", async (req, res) => {
    const { name, email, phone, address, debt } = req.body;
    const id = uuidv4();
    try {
      await db.prepare('INSERT INTO suppliers (id, name, email, phone, address, debt) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, email || '', phone || '', address || '', debt || 0);
      logActivity('SUPPLIER', 'create', `Added supplier: ${name} (Initial Debt: ${debt || 0})`, 'system', 'System');
      res.json({ status: "success", id });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, debt } = req.body;
    try {
      await db.prepare(`
        UPDATE suppliers 
        SET name = ?, email = ?, phone = ?, address = ?, debt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, email, phone, address, debt, id);
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/suppliers/:id/payment", async (req, res) => {
    const { id } = req.params;
    const { amount, payment_method, check_number, check_due_date, check_owner } = req.body;
    const historyId = uuidv4();
    
    const transaction = async () => {
      const supplier = (await db.prepare('SELECT name FROM suppliers WHERE id = ?').get(id)) as any;
      await db.prepare('UPDATE suppliers SET debt = debt - ? WHERE id = ?').run(amount, id);
      await db.prepare(`
        INSERT INTO supplier_history (id, supplier_id, type, amount, description, payment_method, check_number, check_due_date, check_owner)
        VALUES (?, ?, 'PAYMENT', ?, 'Payment to Supplier', ?, ?, ?, ?)
      `).run(historyId, id, amount, payment_method || 'CASH', check_number || null, check_due_date || null, check_owner || null);
      
      logActivity('SUPPLIER_PAYMENT', 'create', `Paid ${amount} to ${supplier?.name || 'Supplier'} (${payment_method || 'CASH'})`, 'system', 'System');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/suppliers/:id/charge", async (req, res) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const historyId = uuidv4();
    
    const transaction = async () => {
      await db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(amount, id);
      await db.prepare(`
        INSERT INTO supplier_history (id, supplier_id, type, amount, description)
        VALUES (?, ?, 'CHARGE', ?, ?)
      `).run(historyId, id, amount, description || 'New Credit Purchase');
    };

    try {
      await transaction();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/suppliers/:id/history", async (req, res) => {
    const history = await db.prepare('SELECT * FROM supplier_history WHERE supplier_id = ? ORDER BY date DESC').all(req.params.id);
    res.json(toCamel(history));
  });

  // --- Sales API ---
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await db.prepare('SELECT * FROM sales ORDER BY date DESC').all() as any[];
      const salesWithItems = await Promise.all(sales.map(async sale => {
        const items = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
        return {
          ...sale,
          items: toCamel(items)
        };
      }));
      res.json(toCamel(salesWithItems));
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.get("/api/sales/:id/items", async (req, res) => {
    const { id } = req.params;
    try {
      const items = await db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
      res.json(toCamel(items));
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/checks", async (req, res) => {
    try {
      const checks = await db.prepare(`
        SELECT 
          s.id, 
          s.total as total, 
          s.check_number, 
          s.check_owner, 
          s.date, 
          'sale' as type,
          COALESCE(s.customer_name, c.name) as party_name,
          'customer' as party_role
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE LOWER(s.payment_method) = 'check'
        
        UNION ALL
        
        SELECT 
          p.id, 
          p.amount as total, 
          p.check_number, 
          p.check_owner, 
          p.date, 
          'payment' as type,
          c.name as party_name,
          'customer' as party_role
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE LOWER(p.payment_method) = 'check'

        UNION ALL

        SELECT
          sh.id,
          sh.amount as total,
          sh.check_number,
          sh.check_owner,
          sh.date,
          'supplier_payment' as type,
          sup.name as party_name,
          'supplier' as party_role
        FROM supplier_history sh
        LEFT JOIN suppliers sup ON sh.supplier_id = sup.id
        WHERE LOWER(sh.payment_method) = 'check'
        
        ORDER BY date DESC
      `).all();
      res.json(toCamel(checks));
    } catch (error) {
      console.error("Fetch checks error:", error);
      res.status(500).json({ error: "Failed to fetch checks" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    const { total, subtotal, discount, paymentMethod, customerId, customerName, staffId, items, checkNumber, checkOwner } = req.body;
    const saleId = uuidv4();

    const transaction = async () => {
      // 0. Get next invoice number
      const nextInvoice = ((await db.prepare('SELECT COALESCE(MAX(invoice_number), 0) + 1 as next FROM sales').get()) as any).next;

      // 1. Create Sale Record
      await db.prepare(`
        INSERT INTO sales (id, invoice_number, total, subtotal, discount, payment_method, customer_id, customer_name, staff_id, check_number, check_owner)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, nextInvoice, total, subtotal, discount, paymentMethod, customerId, customerName, staffId, checkNumber, checkOwner);

      // 2. Create Items & Update Stock
      for (const item of items) {
        await db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, name, price, qty)
          VALUES (?, ?, ?, ?, ?)
        `).run(saleId, item.productId, item.name, item.price, item.qty);

        await db.prepare('UPDATE products SET qty = qty - ? WHERE id = ?').run(item.qty, item.productId);

        // Record stock movement for sale
        await db.prepare(`
          INSERT INTO stock_movements (id, product_id, product_name, type, quantity, reason, actor)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), item.productId, item.name, 'sale', item.qty, `Sale #${saleId.slice(0, 8)}`, staffId);

        // Check for low stock alert
        const updatedProduct = (await db.prepare('SELECT name, qty, min_stock FROM products WHERE id = ?').get(item.productId)) as any;
        if (updatedProduct && updatedProduct.qty <= (updatedProduct.min_stock || 5)) {
          createNotification('STOCK', 'تنبيه مخزون منخفض / Low Stock Alert', 
            `${updatedProduct.name}: Current quantity is ${updatedProduct.qty}`);
        }
      }

      // 3. Update Customer Debt if payment is 'debt'
      if (paymentMethod === 'debt' && customerId) {
        await db.prepare('UPDATE customers SET debt = debt + ? WHERE id = ?').run(total, customerId);
      }

      logActivity('SALE', 'create', `New sale #${saleId.slice(0, 8)} - Total: ${total}`, staffId, 'Staff');
    };

    try {
      await transaction();
      // Get the created serial number to return it
      const serial = ((await db.prepare('SELECT invoice_number FROM sales WHERE id = ?').get(saleId)) as any).invoice_number;
      res.json({ status: "success", id: saleId, invoiceNumber: serial });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Stats API ---
  app.get("/api/stats", async (req, res) => {
    const totalSales = ((await db.prepare('SELECT SUM(total) as total FROM sales').get()) as any).total || 0;
    const transactions = ((await db.prepare('SELECT COUNT(*) as count FROM sales').get()) as any).count || 0;
    const totalStock = ((await db.prepare('SELECT SUM(qty) as total FROM products').get()) as any).total || 0;
    const inventoryValue = ((await db.prepare('SELECT SUM(cost_price * qty) as total FROM products').get()) as any).total || 0;
    const expectedProfit = ((await db.prepare('SELECT SUM((price - cost_price) * qty) as total FROM products').get()) as any).total || 0;
    const activeSuppliers = ((await db.prepare('SELECT COUNT(DISTINCT supplier) as count FROM products WHERE supplier IS NOT NULL').get()) as any).count || 0;
    const outstandingDebt = ((await db.prepare('SELECT SUM(debt) as total FROM customers').get()) as any).total || 0;
    const supplierDebt = ((await db.prepare('SELECT SUM(debt) as total FROM suppliers').get()) as any).total || 0;
 
    res.json(toCamel({
      totalSales,
      transactions,
      totalStock,
      inventoryValue,
      expectedProfit,
      activeSuppliers,
      outstandingDebt,
      supplierDebt
    }));
  });

  // --- Communications API (Preserved) ---
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, filename, fileBase64 } = req.body;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) return res.status(500).json({ status: "error", message: "SMTP credentials not configured." });

    try {
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
      const mailOptions = {
        from: user, to, subject, text: body,
        attachments: filename && fileBase64 ? [{ filename, content: fileBase64, encoding: 'base64' }] : []
      };
      await transporter.sendMail(mailOptions);
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/send-whatsapp", async (req, res) => {
    const { to, body, mediaUrl } = req.body;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!sid || !token || !from) return res.status(500).json({ status: "error", message: "Twilio credentials not configured." });

    try {
      const client = twilio(sid, token);
      await client.messages.create({ from, to: `whatsapp:${to}`, body, mediaUrl: mediaUrl ? [mediaUrl] : undefined });
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/activity", async (req, res) => {
    try {
      const logs = await db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100').all();
      res.json(toCamel(logs));
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // --- Settings API ---
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await db.prepare('SELECT * FROM settings WHERE id = ?').get('main');
      res.json(toCamel(settings || {}));
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    const { shopName, shopAddress, shopPhone } = req.body;
    try {
      await db.prepare(`
        UPDATE settings 
        SET shop_name = ?, shop_address = ?, shop_phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(shopName, shopAddress, shopPhone, 'main');
      
      logActivity('SETTINGS', 'update', `Shop settings updated: ${shopName}`, 'admin', 'Admin');
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- Backup & Recovery API ---
  app.get("/api/auth/google/url", async (req, res) => {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/api/auth/google/callback`
      );

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'profile',
          'email'
        ],
        prompt: 'consent'
      });
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/api/auth/google/callback`
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in DB
      await db.prepare('DELETE FROM google_auth WHERE id = ?').run('main');
      await db.prepare('INSERT INTO google_auth (id, tokens) VALUES (?, ?)').run('main', JSON.stringify(tokens));

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f0f4f8;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h2 style="color: #10b981;">Connetion Réussie !</h2>
              <p>Votre compte Google Drive est maintenant lié. Vous pouvez fermer cette fenêtre.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                  setTimeout(() => window.close(), 2000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (e: any) {
      res.status(500).send("Auth failed: " + e.message);
    }
  });

  app.get("/api/backup/drive/status", async (req, res) => {
    try {
      const auth = (await db.prepare('SELECT tokens FROM google_auth WHERE id = ?').get('main')) as any;
      res.json({ connected: !!auth });
    } catch (e: any) {
      res.json({ connected: false });
    }
  });

  app.post("/api/backup/drive/upload", async (req, res) => {
    try {
      const authData = (await db.prepare('SELECT tokens FROM google_auth WHERE id = ?').get('main')) as any;
      if (!authData) return res.status(401).json({ status: "error", message: "Google Drive non connecté" });

      const tokens = JSON.parse(authData.tokens);
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/api/auth/google/callback`
      );
      oauth2Client.setCredentials(tokens);

      // Refresh token if needed
      oauth2Client.on('tokens', async (newTokens) => {
        const row = (await db.prepare('SELECT tokens FROM google_auth WHERE id = ?').get('main')) as any;
        const currentTokens = JSON.parse(row.tokens);
        const merged = { ...currentTokens, ...newTokens };
        await db.prepare('UPDATE google_auth SET tokens = ? WHERE id = ?').run(JSON.stringify(merged), 'main');
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Gather data (similar to export backup)
      const tables = [
        'users', 'categories', 'products', 'customers', 
        'sales', 'sale_items', 'payments', 'stock_movements', 
        'customer_history', 'activity_log', 'suppliers', 'supplier_history',
        'settings'
      ];
      const data: any = {};
      for (const table of tables) {
        data[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      }
      const backupContent = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);

      const fileName = `POS_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      const fileMetadata = {
        name: fileName,
        parents: [], // Root directory if empty
      };
      
      const media = {
        mimeType: 'application/json',
        body: backupContent,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      logActivity('SYSTEM', 'backup', `Database backed up to Google Drive: ${fileName}`, 'system', 'System');
      res.json({ status: "success", fileId: response.data.id });
    } catch (e: any) {
      console.error("Drive upload failed:", e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.get("/api/backup/export", async (req, res) => {
    try {
      const tables = [
        'users', 'categories', 'products', 'customers', 
        'sales', 'sale_items', 'payments', 'stock_movements', 
        'customer_history', 'activity_log', 'suppliers', 'supplier_history',
        'settings'
      ];
      const data: any = {};
      for (const table of tables) {
        data[table] = await db.prepare(`SELECT * FROM ${table}`).all();
      }
      res.json({ status: "success", data, timestamp: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.post("/api/backup/import", async (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ status: "error", message: "No data provided" });

    const transaction = async () => {
      // Deleting in order to avoid FK issues
      const tables = [
        'sale_items', 
        'stock_movements', 
        'customer_history', 
        'supplier_history', 
        'payments', 
        'sales', 
        'products', 
        'categories', 
        'customers', 
        'suppliers', 
        'activity_log', 
        'users',
        'settings'
      ];
      
      // Clean up existing data
      for (const table of tables) {
        await db.prepare(`DELETE FROM ${table}`).run();
      }

      // Re-insert data in reverse order (parents first)
      const insertOrder = [...tables].reverse();
      for (const table of insertOrder) {
        const rows = data[table] || [];
        if (rows.length === 0) continue;

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const stmt = await db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
        
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          await stmt.run(...values);
        }
      }
    };

    try {
      await transaction();
      // Re-initialize DB to ensure defaults exist if they were missing in the backup
      await initDb();
      logActivity('SYSTEM', 'import', 'Database restored from backup', 'system', 'System');
      res.json({ status: "success", message: "Backup restored successfully" });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Fallback for API routes
  app.all("/api/*", (req, res) => {
    console.log(`404 API: ${req.method} ${req.url}`);
    res.status(404).json({ status: "error", message: `API route not found: ${req.method} ${req.url}` });
  });

  // --- Vite Middleware / Static Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Express Error:", err);
    res.status(500).json({ status: "error", message: err.message || "Internal Server Error" });
  });
}

startServer().catch(err => {
  console.error("Critical server startup failure:", err);
  process.exit(1);
});
