import db from './src/server/database';

async function run() {
  try {
    const p = await db.prepare("SELECT * FROM suppliers WHERE name = 'SIIM' OR name LIKE '%SIIM%'").all();
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
