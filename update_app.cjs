const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Import GlobalAlerts
if (!content.includes('GlobalAlerts')) {
  content = content.replace(
    'import { Logo } from \'./components/Logo\';', 
    'import { Logo } from \'./components/Logo\';\nimport { GlobalAlerts } from \'./components/GlobalAlerts\';'
  );
}

// Add <GlobalAlerts /> above AnimatePresence in renderContent
const target = '<div className="flex-1 overflow-auto px-12 py-4">';
if (content.includes(target) && !content.includes('<GlobalAlerts />')) {
  content = content.replace(
    target, 
    target + '\n          <GlobalAlerts />'
  );
}

fs.writeFileSync('src/App.tsx', content);
