const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: StatCard definition and formatNumber introduction
const target1 = `  const StatCard = ({ title, value, subtext, color = "text-text-main", bg = "bg-card" }: any) => (
    <div className={\`\${bg} p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]\`}>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{title}</div>
      <div className="flex flex-col items-center">
        <div className={\`text-4xl font-black \${color}\`}>{value}</div>
        <div className={\`text-sm font-bold mt-1 \${color}\`}>{isAr ? 'درهم' : currency}</div>
      </div>
      <div className="text-[10px] text-text-secondary/60 font-medium mt-4">{subtext}</div>
    </div>
  );`;

const replacement1 = `  const formatNumber = (val: number) => {
    return Math.round(val || 0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");
  };

  const StatCard = ({ title, value, subtext, color = "text-text-main", bg = "bg-card", showCurrency = true }: any) => (
    <div className={\`\${bg} p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]\`}>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{title}</div>
      <div className="flex flex-col items-center">
        <div className={\`text-4xl font-black \${color}\`}>{value}</div>
        {showCurrency && <div className={\`text-sm font-bold mt-1 \${color}\`}>{isAr ? 'درهم' : currency}</div>}
      </div>
      <div className="text-[10px] text-text-secondary/60 font-medium mt-4">{subtext}</div>
    </div>
  );`;

// Replace 2: Top Stats Grid updates
const target2 = `      {/* Top Stats Grid */}
      {visibleCardsCount > 0 && (
        <div className={\`grid \${gridColsClass} gap-6\`}>
          {permissions.financialsDebts && (
            <>
              <StatCard 
                title={isAr ? 'الديون المعلقة' : 'Pending Debts'} 
                value={totalCustomerDebt.toLocaleString()} 
                subtext={isAr ? 'محفظة الديون' : 'Debt Wallet'}
              />
              <StatCard 
                title={isAr ? 'الزبناء بذمتهم دين' : 'Debtor Customers'} 
                value={customers.filter(c => c.debt > 0).length} 
                subtext={isAr ? 'زبناء بذمتهم مبالغ' : 'Customers with Balance'}
                color="text-text-main"
              />
            </>
          )}
          {permissions.financialsProfits && (
            <StatCard 
              title={isAr ? 'الربح المتوقع' : 'Expected Profit'} 
              value={netProfit.toLocaleString()} 
              subtext={isAr ? 'الأرباح المتوقعة' : 'Expected Profits'}
            />
          )}
          {permissions.financialsInventory && (
            <StatCard 
              title={isAr ? 'قيمة المخزون' : 'Inventory Value'} 
              value={inventoryAssetValue.toLocaleString()} 
              subtext={isAr ? 'قيمة المخزون الإجمالية' : 'Total Inventory Value'}
            />
          )}`;

const replacement2 = `      {/* Top Stats Grid */}
      {visibleCardsCount > 0 && (
        <div className={\`grid \${gridColsClass} gap-6\`}>
          {permissions.financialsDebts && (
            <>
              <StatCard 
                title={isAr ? 'الديون المعلقة' : 'Pending Debts'} 
                value={formatNumber(totalCustomerDebt)} 
                subtext={isAr ? 'محفظة الديون' : 'Debt Wallet'}
              />
              <StatCard 
                title={isAr ? 'الزبناء بذمتهم دين' : 'Debtor Customers'} 
                value={formatNumber(customers.filter(c => c.debt > 0).length)} 
                subtext={isAr ? 'زبناء بذمتهم مبالغ' : 'Customers with Balance'}
                color="text-text-main"
                showCurrency={false}
              />
            </>
          )}
          {permissions.financialsProfits && (
            <StatCard 
              title={isAr ? 'الربح المتوقع' : 'Expected Profit'} 
              value={formatNumber(netProfit)} 
              subtext={isAr ? 'الأرباح المتوقعة' : 'Expected Profits'}
            />
          )}
          {permissions.financialsInventory && (
            <StatCard 
              title={isAr ? 'قيمة المخزون' : 'Inventory Value'} 
              value={formatNumber(inventoryAssetValue)} 
              subtext={isAr ? 'قيمة المخزون الإجمالية' : 'Total Inventory Value'}
            />
          )}`;

// Replace 3: Black card totalRevenue.toLocaleString()
const target3 = `                <div className="text-3xl font-black text-white">{totalRevenue.toLocaleString()}</div>`;
const replacement3 = `                <div className="text-3xl font-black text-white">{formatNumber(totalRevenue)}</div>`;

// Replace 4: daily profit to formatNumber
const target4 = `<span className="text-3xl font-black text-emerald-600">{dailyProfit.toLocaleString()}</span>`;
const replacement4 = `<span className="text-3xl font-black text-emerald-600">{formatNumber(dailyProfit)}</span>`;

// Replace 5: weekly profit to formatNumber
const target5 = `<span className="text-3xl font-black text-emerald-600">{weeklyProfit.toLocaleString()}</span>`;
const replacement5 = `<span className="text-3xl font-black text-emerald-600">{formatNumber(weeklyProfit)}</span>`;

// Replace 6: monthly profit to formatNumber
const target6 = `<span className="text-3xl font-black text-emerald-600">{monthlyProfit.toLocaleString()}</span>`;
const replacement6 = `<span className="text-3xl font-black text-emerald-600">{formatNumber(monthlyProfit)}</span>`;

// Replace 7: yearly profit to formatNumber
const target7 = `<span className="text-3xl font-black text-emerald-600">{yearlyProfit.toLocaleString()}</span>`;
const replacement7 = `<span className="text-3xl font-black text-emerald-600">{formatNumber(yearlyProfit)}</span>`;

// Helper normalize newlines for exact matching
function norm(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

function applyReplacement(description, target, replacement) {
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = norm(target);
  const normReplacement = replacement.replace(/\r\n/g, '\n');

  if (normContent.includes(normTarget)) {
    const replaced = normContent.replace(normTarget, normReplacement);
    content = replaced.replace(/\n/g, '\r\n');
    console.log(`Successfully replaced: ${description}`);
    return true;
  } else {
    console.warn(`WARNING: Target not found for: ${description}`);
    return false;
  }
}

let success = true;
success = applyReplacement("StatCard definition & formatNumber", target1, replacement1) && success;
success = applyReplacement("Top Stats Grid updates", target2, replacement2) && success;
success = applyReplacement("Black card totalRevenue", target3, replacement3) && success;
success = applyReplacement("dailyProfit formatting", target4, replacement4) && success;
success = applyReplacement("weeklyProfit formatting", target5, replacement5) && success;
success = applyReplacement("monthlyProfit formatting", target6, replacement6) && success;
success = applyReplacement("yearlyProfit formatting", target7, replacement7) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All financial numbers formatting fixes applied successfully!");
} else {
  console.error("Some replacements failed!");
}
