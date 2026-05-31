const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace state hooks with Zustand hooks
const stateVarsToRemove = [
  'const [products, setProducts] = useState<Product[]>([]);',
  'const [categories, setCategories] = useState<Category[]>([]);',
  'const [customers, setCustomers] = useState<Customer[]>([]);',
  'const [suppliers, setSuppliers] = useState<Supplier[]>([]);',
  'const [sales, setSales] = useState<Sale[]>([]);',
  'const [checks, setChecks] = useState<CheckDoc[]>([]);',
  'const [payments, setPayments] = useState<Payment[]>([]);',
  'const [activities, setActivities] = useState<ActivityLog[]>([]);',
  'const [notifications, setNotifications] = useState<Notification[]>([]);',
  'const [appUsers, setAppUsers] = useState<UserProfile[]>([]);',
  'const [settings, setSettings] = useState<any>(null);',
  'const [message, setMessage] = useState<{ text: string, type: \'success\' | \'error\' } | null>(null);',
  'const [stats, setStats] = useState<any>(null);',
  'const [latestBackup, setLatestBackup] = useState<any>(null);'
];

for (const line of stateVarsToRemove) {
  app = app.replace(line, '');
}

// Add useStore hooks
const useStoreHooks = `
  const { products, categories, customers, suppliers, sales, checks, payments, activities, notifications, appUsers, settings, message, stats, latestBackup, setMessage, fetchData: refreshData, markNotificationRead: markAsRead } = useStore();
`;
app = app.replace('const [view, setView] = useState<View>(\'pos\');', `const [view, setView] = useState<View>('pos');${useStoreHooks}`);

// Remove refreshData definition because it's from Zustand now
const refreshDataStart = 'const refreshData = useCallback(async () => {';
const refreshDataEnd = '  }, []);';
const idxStart = app.indexOf(refreshDataStart);
if (idxStart !== -1) {
  // Find the next '}, []);'
  const idxEnd = app.indexOf(refreshDataEnd, idxStart);
  if (idxEnd !== -1) {
    app = app.substring(0, idxStart) + app.substring(idxEnd + refreshDataEnd.length);
  }
}

// Remove markAsRead definition because it's from Zustand now
const markAsReadStart = 'const markAsRead = async (id: string) => {';
const markAsReadEnd = '  };';
const idxMarkStart = app.indexOf(markAsReadStart);
if (idxMarkStart !== -1) {
  const idxMarkEnd = app.indexOf(markAsReadEnd, idxMarkStart);
  if (idxMarkEnd !== -1) {
    app = app.substring(0, idxMarkStart) + app.substring(idxMarkEnd + markAsReadEnd.length);
  }
}

// Update routing elements
app = app.replace(/<Inventory [^>]+>/g, '<Inventory permissions={userPermissions} />');
app = app.replace(/<POS [^>]+>/g, '<POS />');
app = app.replace(/<CustomerList [^>]+>/g, '<CustomerList />');
app = app.replace(/<SupplierList [^>]+>/g, '<SupplierList permissions={userPermissions} />');
app = app.replace(/<HistoryView [^>]+>/g, '<HistoryView permissions={userPermissions} currentUserRole={currentUserRole} />');
app = app.replace(/<FinancialDashboardView [^>]+>/g, '<FinancialDashboardView permissions={userPermissions} currency={t.currency} />');
app = app.replace(/<CheckListView [^>]+>/g, '<CheckListView />');
app = app.replace(/<SettingsManagement [^>]+>/g, '<SettingsManagement />');

// Remove import of Notification since it's used only inside Zustand store now?
// Actually we can keep it or remove it. It's fine.

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx refactored!');
