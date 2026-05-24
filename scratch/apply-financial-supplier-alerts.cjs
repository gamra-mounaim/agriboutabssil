const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `  // Upcoming Debts Logic from DashboardStats
  const upcomingDebts = (customers || []).filter(c => {
    if (!c.due_date || c.debt <= 0) return false;
    const dueDate = new Date(c.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());`;

const replacement1 = `  // Upcoming Debts Logic from DashboardStats
  const upcomingDebts = (customers || []).filter(c => {
    if (!c.due_date || c.debt <= 0) return false;
    const dueDate = new Date(c.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const upcomingSupplierDebts = (suppliers || []).filter(s => {
    if (!s.due_date || s.debt <= 0) return false;
    const dueDate = new Date(s.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());`;

const target2 = `      {permissions.financialsDebts && upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingDebts.map(c => \`\${c.name} (\${c.due_date})\`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}`;

const replacement2 = `      {permissions.financialsDebts && upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingDebts.map(c => \`\${c.name} (\${c.due_date})\`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}

      {permissions.supplierDebt && upcomingSupplierDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-amber-600 overflow-hidden relative shadow-sm"
        >
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {isAr ? 'مواعيد استحقاق ديون الموردين القريبة' : 'Upcoming Supplier Debt Due Dates'}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingSupplierDebts.map(s => \`\${s.name} (\${s.due_date})\`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}`;

// Helper normalize newlines for exact matching
function norm(str) {
  return str.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function applyReplacement(description, target, replacement) {
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = norm(target);
  const normReplacement = replacement.replace(/\r\n/g, '\n');

  // Simple token matching
  const contentTokens = normContent.replace(/\s+/g, ' ');
  const targetIndex = contentTokens.indexOf(normTarget);
  if (targetIndex !== -1) {
    // Find matching position in original content
    const cleanTarget = target.replace(/\r\n/g, '\n').trim();
    const originalIndex = normContent.indexOf(cleanTarget);
    if (originalIndex !== -1) {
      const replaced = normContent.substring(0, originalIndex) + normReplacement + normContent.substring(originalIndex + cleanTarget.length);
      content = replaced.replace(/\n/g, '\r\n');
      console.log(`Successfully replaced Financial Alerts: ${description}`);
      return true;
    }
  }
  console.warn(`WARNING: Target Financial Alerts not found for: ${description}`);
  return false;
}

let success = true;
success = applyReplacement("Supplier Upcoming Debts Logic Definition", target1, replacement1) && success;
success = applyReplacement("Supplier Upcoming Debts Alert Banner UI", target2, replacement2) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All Financial Alerts supplier updates applied successfully!");
} else {
  console.error("Financial Alerts replacements failed!");
}
