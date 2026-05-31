const fs = require('fs');
const path = require('path');

const dir = 'src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const missingIcons = ['Archive', 'ArrowRightLeft', 'Hash', 'User', 'CalendarClock', 'FolderOpen', 'Eye', 'CheckCircle', 'Sparkles', 'UserCog', 'Store', 'ChevronRight', 'ShieldAlert', 'Cloud'];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add missing icons to destructuring
  const destructureStart = 'const { Search, ';
  if (content.includes(destructureStart)) {
    content = content.replace(destructureStart, destructureStart + missingIcons.join(', ') + ', ');
  }

  // Add types
  content = content.replace('Product, Category, Customer, Sale, Supplier, UserProfile, Payment, ActivityLog, CheckDoc, Notification', 'Product, Category, Customer, Sale, SaleItem, Supplier, UserProfile, Payment, ActivityLog, CheckDoc, Notification, TransactionRecord, moroccanBanks');

  // Fix specific file imports
  if (file === 'SettingsManagement.tsx') {
    content = "import StaffManagement from './StaffManagement';\n" + content;
  }
  
  if (file === 'FinancialDashboardView.tsx') {
    content = "import { Logo } from '../components/Logo';\n" + content;
  }

  fs.writeFileSync(filePath, content);
}
console.log('Imports fixed!');
