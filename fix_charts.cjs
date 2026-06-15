const fs = require('fs');
const files = [
  'src/pages/DashboardStats.tsx',
  'src/pages/FinancialDashboardView.tsx',
  'src/pages/CustomerList.tsx',
  'src/pages/HistoryView.tsx',
  'src/pages/POS.tsx',
  'src/pages/SettingsManagement.tsx',
  'src/pages/StaffManagement.tsx'
];

files.forEach(f => {
  try {
    let text = fs.readFileSync(f, 'utf-8');
    text = text.replaceAll(
      '<ResponsiveContainer width="100%" height="100%">',
      '<ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>'
    );
    text = text.replaceAll(
      '<ResponsiveContainer width="100%" height={300}>',
      '<ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={1}>'
    );
    fs.writeFileSync(f, text);
    console.log('Fixed', f);
  } catch (e) {
    console.error('Failed to fix', f, e);
  }
});
