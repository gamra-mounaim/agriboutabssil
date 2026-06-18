import db from './src/server/database.js';

async function migrate() {
  try {
    await db.prepare('ALTER TABLE sales ADD COLUMN check_amount REAL').run();
    console.log("Column check_amount added successfully.");
  } catch (e) {
    console.error("Error (might already exist):", e.message);
  }
  process.exit(0);
}

migrate();
