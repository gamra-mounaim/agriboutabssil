const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckListView.tsx', 'utf-8');
content = content.replace('{language === \'ar\' ? \'????? ?????????\' : \'Due Date\'}', '{language === \'ar\' ? \'????? ??????\' : \'Payment Date\'}');
content = content.replace('checkDueDate ? new Date((check as any).checkDueDate).toLocaleDateString() : \'-\'', 'checkDueDate ? new Date((check as any).checkDueDate).toLocaleDateString() : \'-\'');
fs.writeFileSync('src/pages/CheckListView.tsx', content);

let posContent = fs.readFileSync('src/pages/POS.tsx', 'utf-8');
posContent = posContent.replace('????? ????? / ?????????', '????? ?????? (?????????)');
fs.writeFileSync('src/pages/POS.tsx', posContent);
console.log('Done');
