const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');
const target = "{h.type === 'PAYMENT' ? '-' : '+'}{h.amount.toLocaleString()}";
const replacement = "{h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? h.amount.toLocaleString() : '***'}";
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully replaced!");
} else {
  console.log("Target not found!");
}
