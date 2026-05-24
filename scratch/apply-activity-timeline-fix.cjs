const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'return { date: a.timestamp, amount: 0, description: `[${a.type}] ${a.details} (by ${a.actor_name})` };';
const replacement = 'return { date: a.timestamp, amount: 0, description: `[${a.type}] ${a.details} (by ${a.actorName || \'System\'})` };';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully fixed subView timeline conversion!");
} else {
  console.error("Target not found!");
}
