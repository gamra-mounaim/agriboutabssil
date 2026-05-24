const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = "{new Date(c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}";
const replacementStr = "{new Date(c.dueDate || c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}";

if (content.includes(targetStr)) {
  const updatedContent = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log("SUCCESS: Replaced the localized date due date formatting in App.tsx!");
} else {
  console.error("ERROR: Could not find target localized date formatting string in App.tsx.");
}
