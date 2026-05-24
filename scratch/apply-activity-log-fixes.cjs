const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: ActivityLog interface definition
const target1 = `interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
}`;

const replacement1 = `interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actorId: string;
  actorName: string;
  timestamp: string;
}`;

// Replace 2: matchesSearch filter logic
const target2 = `    const matchesSearch = a.details.toLowerCase().includes(searchHistory.toLowerCase()) || 
                         a.actor_name.toLowerCase().includes(searchHistory.toLowerCase());`;

const replacement2 = `    const matchesSearch = a.details.toLowerCase().includes(searchHistory.toLowerCase()) || 
                         (a.actorName || '').toLowerCase().includes(searchHistory.toLowerCase());`;

// Replace 3: subView timeline conversion
const target3 = `    if (subView === 'activity') {
      const a = item as ActivityLog;
      return { date: a.timestamp, amount: 0, description: \`[\${a.type}] \${a.details} (by \${a.actor_name})\` };
    }`;

const replacement3 = `    if (subView === 'activity') {
      const a = item as ActivityLog;
      return { date: a.timestamp, amount: 0, description: \`[\${a.type}] \${a.details} (by \${a.actorName || 'System'})\` };
    }`;

// Replace 4: actor name rendering in UI
const target4 = `                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-base border border-border-subtle rounded text-[9px] font-black text-text-secondary uppercase tracking-tighter">
                      <UserCog className="w-2.5 h-2.5" />
                      {a.actor_name}
                    </div>`;

const replacement4 = `                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-base border border-border-subtle rounded text-[9px] font-black text-text-secondary uppercase tracking-tighter">
                      <UserCog className="w-2.5 h-2.5" />
                      {a.actorName || 'System'}
                    </div>`;

// Helper normalize newlines for exact matching
function norm(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

function applyReplacement(description, target, replacement) {
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = norm(target);
  const normReplacement = replacement.replace(/\r\n/g, '\n');

  if (normContent.includes(normTarget)) {
    const replaced = normContent.replace(normTarget, normReplacement);
    content = replaced.replace(/\n/g, '\r\n');
    console.log(`Successfully replaced: ${description}`);
    return true;
  } else {
    console.warn(`WARNING: Target not found for: ${description}`);
    return false;
  }
}

let success = true;
success = applyReplacement("ActivityLog Interface Definition", target1, replacement1) && success;
success = applyReplacement("matchesSearch filter logic", target2, replacement2) && success;
success = applyReplacement("subView timeline conversion", target3, replacement3) && success;
success = applyReplacement("actor name rendering in UI", target4, replacement4) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All Activity Log camelCase fixes applied successfully!");
} else {
  console.error("Some replacements failed!");
}
