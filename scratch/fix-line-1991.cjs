const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `{formatNumber(permissions.profits && <td className="p-4 text-text-secondary italic">{(p.costPrice || 0))} {t.currency}</td>}`;
const replacement = `{permissions.profits && <td className="p-4 text-text-secondary italic">{formatNumber(p.costPrice || 0)} {t.currency}</td>}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully fixed line 1991 in App.tsx!");
} else {
  console.error("Target not found!");
}
