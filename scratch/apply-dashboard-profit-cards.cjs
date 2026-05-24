const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `  const totalRevenue = stats?.totalSales || 0;
  const netProfit = stats?.netProfit || 0;
  const totalCustomerDebt = stats?.outstandingDebt || 0;`;

const replacement1 = `  const totalRevenue = stats?.totalSales || 0;
  const netProfit = stats?.expectedProfit || 0;
  const totalCustomerDebt = stats?.outstandingDebt || 0;
  const dailyProfit = stats?.dailyProfit || 0;
  const weeklyProfit = stats?.weeklyProfit || 0;
  const monthlyProfit = stats?.monthlyProfit || 0;
  const yearlyProfit = stats?.yearlyProfit || 0;`;

const target2 = `          {permissions.financialsSales && (
            /* Black Card */
            <div className="bg-black p-6 rounded-[2.5rem] flex flex-col items-center text-center justify-between min-h-[180px] shadow-xl shadow-black/10">
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">AGRI BOUTABSSIL</div>
              <div className="flex flex-col items-center">
                 <Logo className="w-12 h-12 mb-2 p-1" />
                <div className="text-3xl font-black text-white">{totalRevenue.toLocaleString()}</div>
                <div className="text-sm font-bold mt-1 text-white">{t.currency}</div>
              </div>
              <div className="text-[10px] text-white/50 font-medium mt-4">{isAr ? 'إجمالي المبيعات' : 'Total Revenue'}</div>
            </div>
          )}
        </div>
      )}`;

const replacement2 = `          {permissions.financialsSales && (
            /* Black Card */
            <div className="bg-black p-6 rounded-[2.5rem] flex flex-col items-center text-center justify-between min-h-[180px] shadow-xl shadow-black/10">
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">AGRI BOUTABSSIL</div>
              <div className="flex flex-col items-center">
                 <Logo className="w-12 h-12 mb-2 p-1" />
                <div className="text-3xl font-black text-white">{totalRevenue.toLocaleString()}</div>
                <div className="text-sm font-bold mt-1 text-white">{t.currency}</div>
              </div>
              <div className="text-[10px] text-white/50 font-medium mt-4">{isAr ? 'إجمالي المبيعات' : 'Total Revenue'}</div>
            </div>
          )}
        </div>
      )}

      {permissions.financialsProfits && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className={cn("text-xs font-black uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-2", isAr && "text-right")}>
            {isAr ? 'الأرباح المحققة للمبيعات' : 'REALIZED SALES PROFITS'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{isAr ? 'أرباح اليوم' : 'Today\\\'s Profit'}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{dailyProfit.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{isAr ? 'درهم' : currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{isAr ? 'أرباح الأسبوع' : 'Weekly Profit'}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{weeklyProfit.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{isAr ? 'درهم' : currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{isAr ? 'أرباح الشهر' : 'Monthly Profit'}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{monthlyProfit.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{isAr ? 'درهم' : currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{isAr ? 'أرباح العام' : 'Yearly Profit'}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Sparkles className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{yearlyProfit.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{isAr ? 'درهم' : currency}</span>
              </div>
            </div>
          </div>
        </div>
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
      console.log(`Successfully replaced profit cards: ${description}`);
      return true;
    }
  }
  console.warn(`WARNING: Target profit cards not found for: ${description}`);
  return false;
}

let success = true;
success = applyReplacement("Profit Dashboard stats definitions", target1, replacement1) && success;
success = applyReplacement("Profit Dashboard Cards Grid", target2, replacement2) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All Profit Dashboard Cards applied successfully!");
} else {
  console.error("Profit Dashboard Cards replacements failed!");
}
