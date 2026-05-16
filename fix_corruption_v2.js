import fs from 'fs';
const filePath = './src/App.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
const badLineIndex = lines.findIndex((l, i) => l.includes("LE' ?") && !l.includes("{item.type === 'SALE'"));
if (badLineIndex !== -1) {
  console.log(`Found true corruption at line ${badLineIndex + 1}: ${lines[badLineIndex]}`);
  console.log(`Removing bad block starting 5 lines above: ${lines[badLineIndex-5]}`);
  lines.splice(badLineIndex - 5, 8);
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log("Applied fix by relative line range.");
} else {
  console.log("Marker not found.");
}
