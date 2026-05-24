const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n').split('\n');
for (let i = 3210; i < 3230; i++) {
  console.log(`${i + 1}: [${lines[i]}]`);
}
