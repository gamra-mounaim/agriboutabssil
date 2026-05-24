import fs from 'fs';
import path from 'path';

const searchFile = (filePath, query) => {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(query.toLowerCase())) {
      results.push({ lineNumber: index + 1, content: line.trim() });
    }
  });
  
  console.log(`Found ${results.length} matches for "${query}" in ${filePath}:`);
  results.slice(0, 50).forEach(r => console.log(`${r.lineNumber}: ${r.content}`));
};

const file = process.argv[2];
const query = process.argv[3];

if (file && query) {
  searchFile(file, query);
} else {
  console.log("Usage: node search.js <file> <query>");
}
