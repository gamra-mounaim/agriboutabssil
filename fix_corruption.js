import fs from 'fs';

const filePath = './src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted block starts around line 3308
// We want to remove the garbage between the button closure and the items map closure.

// Searching for the specific corrupted pattern
const corruptedPattern = /<\/button>\s+<\/div>\s+}\s+} catch \(e\) \{\s+console\.error\("Print error:", e\);\s+}\s+} else \{\s+LE' \? \(language === 'ar' \? 'فاتورة' : 'SALE'\) : item\.type\}\s+<\/div>\s+/;

if (corruptedPattern.test(content)) {
  console.log("Found corrupted pattern. Replacing...");
  content = content.replace(corruptedPattern, '</button>\n                             </div>\n');
  fs.writeFileSync(filePath, content);
  console.log("Fix applied successfully.");
} else {
  console.log("Could not find the exact corrupted pattern. Trying a more flexible approach...");
  // Alternative: match from the first '</div>' after the button to the next button or map closure.
  // Actually, I'll just look for that weird 'LE' ?' line as a marker.
  const lines = content.split('\n');
  const badLineIndex = lines.findIndex(l => l.includes("LE' ? (language === 'ar' ? 'فاتورة' : 'SALE') : item.type}"));
  if (badLineIndex !== -1) {
    console.log(`Found marker at line ${badLineIndex + 1}. Removing surrounding garbage...`);
    // Remove lines from the extra </div> (badLineIndex - 5) to the extra </div> (badLineIndex + 1)
    // Looking at my view_file, 3308 is </div>, 3313 is LE', 3314 is </div>, 3315 is empty.
    // So 3308 to 3315 are the bad lines (0-indexed: 3307 to 3314).
    lines.splice(badLineIndex - 5, 8);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log("Fix applied via line index.");
  } else {
    console.log("Could not find marker. Fix aborted.");
  }
}
