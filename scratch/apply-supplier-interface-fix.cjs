const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  debt: number;
}`;

const replacement = `interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  debt: number;
  due_date?: string;
}`;

const normContent = content.replace(/\r\n/g, '\n');
const cleanTarget = target.replace(/\r\n/g, '\n').trim();
const originalIndex = normContent.indexOf(cleanTarget);
if (originalIndex !== -1) {
  const replaced = normContent.substring(0, originalIndex) + replacement + normContent.substring(originalIndex + cleanTarget.length);
  fs.writeFileSync(path, replaced.replace(/\n/g, '\r\n'), 'utf8');
  console.log("Successfully fixed Supplier interface in App.tsx!");
} else {
  console.error("Supplier interface target not found in App.tsx!");
}
