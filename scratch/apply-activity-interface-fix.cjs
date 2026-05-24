const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace actor_id: string; with actorId: string;
// and actor_name: string; with actorName: string;
// specifically inside the ActivityLog block

const target = `interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
}`;

const replacement = `interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actorId: string;
  actorName: string;
  timestamp: string;
}`;

// Let's do a replace using standard string replacement without worrying about CRLF
const cleanTarget = target.replace(/\r\n/g, '\n');
const normContent = content.replace(/\r\n/g, '\n');

if (normContent.includes(cleanTarget)) {
  const replaced = normContent.replace(cleanTarget, replacement);
  fs.writeFileSync(path, replaced.replace(/\n/g, '\r\n'), 'utf8');
  console.log("Successfully fixed ActivityLog interface!");
} else {
  // Let's do it line-by-line if the block is not found
  console.log("Block not found, trying fallback...");
  let updated = content;
  updated = updated.replace('actor_id: string;\r\n  actor_name: string;', 'actorId: string;\r\n  actorName: string;');
  updated = updated.replace('actor_id: string;\n  actor_name: string;', 'actorId: string;\n  actorName: string;');
  if (updated !== content) {
    fs.writeFileSync(path, updated, 'utf8');
    console.log("Successfully fixed ActivityLog interface using fallback!");
  } else {
    console.error("Failed to fix ActivityLog interface!");
  }
}
