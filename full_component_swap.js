import fs from 'fs';

const filePath = './src/App.tsx';
const repairedPath = './CustomerList_repaired.txt';

let content = fs.readFileSync(filePath, 'utf8');
const repairedComponent = fs.readFileSync(repairedPath, 'utf8');

// Use a regex for the start line
const startRegex = /\/\/ --- View: Customer List ---\s*function CustomerList/;
const startMatch = content.match(startRegex);

if (!startMatch) {
    console.log("Could not find start of CustomerList via comments.");
    process.exit(1);
}

const startIndex = startMatch.index;

// Find the end: we know it's before function Checks or Inventory
const nextComponentStart = /function (Checks|Inventory|StatsDashboard)\s*\(/;
let endMatch = content.slice(startIndex + 100).match(nextComponentStart);

if (!endMatch) {
    console.log("Could not find end/next component.");
    process.exit(1);
}

const endIndex = startIndex + 100 + endMatch.index;

console.log(`Replacing CustomerList from index ${startIndex} to ${endIndex}`);

content = content.substring(0, startIndex) + repairedComponent + "\n\n" + content.substring(endIndex);
fs.writeFileSync(filePath, content);
console.log("Full component replacement successful.");
