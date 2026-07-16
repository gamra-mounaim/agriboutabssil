const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const nodemailer = require('nodemailer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function convertQuery(sql) {
  if (sql.includes('$1')) return sql;
  let i = 1;
  return sql.replace(/('[^']*')|\?/g, (match, quoted) => {
    if (quoted) return quoted;
    return `$${i++}`;
  });
}

const db = {
  prepare: (sql) => {
    const pgSql = convertQuery(sql);
    return {
      all: async (...params) => {
        const { rows } = await pool.query(pgSql, params);
        return rows;
      },
      get: async (...params) => {
        const { rows } = await pool.query(pgSql, params);
        return rows[0];
      },
      run: async (...params) => {
        const result = await pool.query(pgSql, params);
        return result;
      }
    };
  }
};

const performAutoBackup = async () => {
    try {
      const tables = [
        'users', 'categories', 'products', 'customers', 
        'sales', 'sale_items', 'payments', 'stock_movements', 
        'customer_history', 'activity_log', 'suppliers', 'supplier_history',
        'settings'
      ];
      const data = {};
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

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const backupEmail = process.env.BACKUP_EMAIL || "gamragb@gmail.com";

      if (smtpUser && smtpPass && backupEmail) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const mailOptions = {
          from: smtpUser,
          to: backupEmail,
          subject: `[AGRI BOUTABSSIL] Auto-Backup - ${new Date().toLocaleDateString()}`,
          text: `Please find attached the automatic backup.`,
          attachments: [
            {
              filename: filename,
              content: backupContent
            }
          ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email backup sent successfully to ${backupEmail}`);
      }
    } catch (err) {
      console.error("Auto-backup failed:", err);
    }
  };

performAutoBackup().then(() => {
  console.log("Done");
  process.exit(0);
});
