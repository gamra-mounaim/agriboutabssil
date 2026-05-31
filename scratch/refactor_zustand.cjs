const fs = require('fs');
const path = require('path');

const signatures = {
  'DashboardStats': 'export default function DashboardStats({ products, categories, customers, sales, language, stats, permissions }: { products: Product[], categories: Category[], customers: Customer[], sales: Sale[], language: Language, stats: any, permissions: any })',
  'Inventory': "export default function Inventory({ products, categories, suppliers, setMessage, language, onRefresh, permissions }: { products: Product[], categories: Category[], suppliers: Supplier[], setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, permissions: any })",
  'POS': "export default function POS({ products, categories, customers, user, settings, setMessage, language, onRefresh }: { products: Product[], categories: Category[], customers: Customer[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void })",
  'CustomerList': "export default function CustomerList({ customers, user, settings, setMessage, language, onRefresh, payments, sales, products }: { customers: Customer[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, payments: any[], sales: Sale[], products: Product[] })",
  'SupplierList': "export default function SupplierList({ suppliers, checks, user, settings, setMessage, language, onRefresh, permissions }: { suppliers: Supplier[], checks: CheckDoc[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, permissions?: any })",
  'HistoryView': "export default function HistoryView({ sales, payments, activities, customers, appUsers, settings, language, onRefresh, permissions, currentUserRole }: { sales: Sale[], payments: Payment[], activities: ActivityLog[], customers: Customer[], appUsers: UserProfile[], settings: any, language: Language, onRefresh: () => void, permissions: any, currentUserRole?: string })",
  'FinancialDashboardView': "export default function FinancialDashboardView({ stats, sales, payments, customers, suppliers, language, currency, products, settings, permissions }: { stats: any, sales: any[], payments: any[], customers: any[], suppliers: any[], language: Language, currency: string, products: any[], settings: any, permissions: any })",
  'CheckListView': "export default function CheckListView({ checks, language, settings }: { checks: CheckDoc[], language: Language, settings: any })",
  'SettingsManagement': "export default function SettingsManagement({ users, settings, setMessage, currentUser, language, onRefresh }: { users: UserProfile[], settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, currentUser: any, language: Language, onRefresh: () => void })",
  'StaffManagement': "export default function StaffManagement({ users, currentUser, language, onRefresh, setMessage }: { users: UserProfile[], currentUser: any, language: Language, onRefresh: () => void, setMessage: (m: { text: string, type: 'success' | 'error' }) => void })"
};

const pagesDir = 'src/pages';

for (const [componentName, oldSignature] of Object.entries(signatures)) {
  const filePath = path.join(pagesDir, `${componentName}.tsx`);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Inject store imports
  if (!content.includes('useStore')) {
    content = content.replace("import { Language, translations } from '../translations';", "import { Language, translations } from '../translations';\nimport { useStore, useAuthStore } from '../store/useStore';");
  }

  const propsString = oldSignature.substring(oldSignature.indexOf('{') + 1, oldSignature.indexOf('}'));
  
  const hasPermissions = propsString.includes('permissions');
  const hasCurrentUserRole = propsString.includes('currentUserRole');
  const hasCurrency = propsString.includes('currency');
  
  let newProps = [];
  if (hasPermissions) newProps.push('permissions: any');
  if (hasCurrentUserRole) newProps.push('currentUserRole?: string');
  if (hasCurrency) newProps.push('currency?: string');
  
  const newSignature = `export default function ${componentName}(${newProps.length > 0 ? `{ ${newProps.map(p => p.split(':')[0].trim().replace('?', '')).join(', ')} }: { ${newProps.join(', ')} }` : ''})`;
  
  const storeProps = ['products', 'categories', 'customers', 'suppliers', 'sales', 'checks', 'payments', 'activities', 'stats', 'appUsers', 'settings', 'latestBackup'];
  const authProps = ['language', 'user', 'currentUser'];
  
  let usedStoreProps = storeProps.filter(p => propsString.includes(p));
  let usedAuthProps = authProps.filter(p => propsString.includes(p));
  
  let hooks = '';
  if (usedStoreProps.length > 0 || propsString.includes('onRefresh') || propsString.includes('setMessage') || propsString.includes('users')) {
    const pulls = [...usedStoreProps];
    if (propsString.includes('onRefresh')) pulls.push('fetchData: onRefresh');
    if (propsString.includes('setMessage')) pulls.push('setMessage');
    if (propsString.includes('users')) pulls.push('appUsers: users');
    hooks += `  const { ${pulls.join(', ')} } = useStore();\n`;
  }
  
  if (usedAuthProps.length > 0) {
    if (propsString.includes('currentUser')) {
      hooks += `  const { language, user: currentUser } = useAuthStore();\n`;
    } else {
      hooks += `  const { language, user } = useAuthStore();\n`;
    }
  } else if (propsString.includes('language')) {
    hooks += `  const { language } = useAuthStore();\n`;
  }
  
  // Here is the fix: include ' {' in the replacement target and result!
  content = content.replace(oldSignature + ' {', newSignature + ' {\n' + hooks);
  fs.writeFileSync(filePath, content);
}
console.log('Pages refactored successfully!');
