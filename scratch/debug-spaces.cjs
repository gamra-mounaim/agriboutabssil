const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n').split('\n');
console.log("=== CUSTOMER CARD ===");
for (let i = 3215; i < 3225; i++) {
  console.log(`${i + 1}: [${lines[i]}]`);
}
console.log("\n=== INVOICE PRINT CALL ===");
for (let i = 3435; i < 3448; i++) {
  console.log(`${i + 1}: [${lines[i]}]`);
}
