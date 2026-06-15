const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckListView.tsx', 'utf-8');
const bannerRegex = /\{checksDueSoon\.length > 0 && \([\s\S]*?\}\)\}/;
content = content.replace(bannerRegex, '');
fs.writeFileSync('src/pages/CheckListView.tsx', content);
