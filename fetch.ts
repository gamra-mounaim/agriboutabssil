import db from './src/server/database';

async function run() {
  try {
    const logs = await db.prepare("SELECT * FROM activity_log WHERE type = 'PRODUCT' AND action = 'update' AND details LIKE '%Qty:%'").all();
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
