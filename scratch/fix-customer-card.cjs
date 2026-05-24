const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of the customer list map block
const targetKey = 'filteredCustomers.map(c =>';
const startIndex = content.indexOf(targetKey);

if (startIndex === -1) {
  console.error("ERROR: Could not find filteredCustomers.map in App.tsx");
  process.exit(1);
}

// Find the end of this block (we can just take a 2000 character window containing the card layout)
const windowSize = 2500;
const before = content.slice(0, startIndex);
let window = content.slice(startIndex, startIndex + windowSize);
const after = content.slice(startIndex + windowSize);

// In this window, replace c.due_date with (c.dueDate || c.due_date)
const originalWindow = window;
window = window.replace(/c\.due_date/g, '(c.dueDate || c.due_date)');

if (originalWindow !== window) {
  fs.writeFileSync(filePath, before + window + after, 'utf8');
  console.log("SUCCESS: Replaced c.due_date inside filteredCustomers.map window!");
} else {
  console.error("ERROR: No c.due_date found inside filteredCustomers.map window!");
}
