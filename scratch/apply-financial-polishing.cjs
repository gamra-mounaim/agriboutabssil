const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add formatNumber globally above export default function App()
const globalFormatNumber = `export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");
};

export default function App() {`;

content = content.replace('export default function App() {', globalFormatNumber);

// 2. Remove the local formatNumber inside the App component
const localFormatNumberPattern = `    const formatNumber = (val: number) => {
    return Math.round(val || 0).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");
  };`;

content = content.replace(localFormatNumberPattern, '');

// fallback replacement for local formatNumber in case spaces differ:
content = content.replace(/const formatNumber = \(val: number\) => \{[\s\S]*?\};/g, '');

// 3. Change default language to French 'fr'
content = content.replace(
  `const [language, setLanguage] = useState<Language>((localStorage.getItem('lang') as Language) || 'ar');`,
  `const [language, setLanguage] = useState<Language>((localStorage.getItem('lang') as Language) || 'fr');`
);

// 4. Update the Sidebar Language Selector to make it extremely clear and high-contrast
const oldLanguageSelector = `<div className="px-4 py-2 border-t border-border-subtle">
          <div className="flex gap-1 justify-center">
            {(['en', 'fr', 'ar'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors",
                  language === lang ? "bg-accent text-white" : "text-text-secondary hover:bg-bg-base"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>`;

const newLanguageSelector = `<div className="mx-4 my-2 p-3 bg-bg-base/80 border-2 border-accent/30 rounded-2xl shadow-inner text-center">
          <div className="text-[9px] font-black uppercase text-accent tracking-[0.25em] mb-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            {language === 'ar' ? 'لغة الموقع / LANGUE' : 'LANGUE DU SITE'}
          </div>
          <div className="flex gap-1.5 justify-center">
            {(['en', 'fr', 'ar'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  localStorage.setItem('lang', lang);
                }}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black rounded-xl uppercase transition-all duration-300 transform active:scale-95 shadow-sm",
                  language === lang 
                    ? "bg-accent text-white border border-accent scale-105 shadow-md shadow-accent/25" 
                    : "bg-card text-text-secondary border border-border-subtle hover:text-text-main hover:border-text-secondary/30"
                )}
              >
                {lang === 'ar' ? 'العربية' : lang === 'fr' ? 'FR' : 'EN'}
              </button>
            ))}
          </div>
        </div>`;

content = content.replace(oldLanguageSelector, newLanguageSelector);

// Let's do a fallback replacement in case whitespace doesn't match perfectly
if (!content.includes('LANGUE DU SITE')) {
  console.log("Old language selector replacement fallback triggered!");
  // Match any variation of the old language selector
  const sidebarRegex = /<div className="px-4 py-2 border-t border-border-subtle">[\s\S]*?\(\['en', 'fr', 'ar'\] as Language\[]\)\.map\(lang => \([\s\S]*?<\/div>[\s\S]*?<\/div>/;
  content = content.replace(sidebarRegex, newLanguageSelector);
}

// 5. Add due_date to the Add Customer form
const oldCustomerForm = `<form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.customerName}</label>
                <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.customerName} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.phone}</label>
                <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.address}</label>
                <input value={address || ''} onChange={e => setAddress(e.target.value)} placeholder={t.address} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.initialDebt}</label>
                <div className="relative">
                  <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-black text-danger focus:border-accent outline-none shadow-sm transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary/50">{t.currency}</div>
                </div>
              </div>
              <button className="h-fit self-end bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
                {t.confirm}
              </button>
            </form>`;

const newCustomerForm = `<form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.customerName}</label>
                <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.customerName} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.phone}</label>
                <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.address}</label>
                <input value={address || ''} onChange={e => setAddress(e.target.value)} placeholder={t.address} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.initialDebt}</label>
                <div className="relative">
                  <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-black text-danger focus:border-accent outline-none shadow-sm transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary/50">{t.currency}</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.dueDate}</label>
                <input type="date" value={dueDate || ''} onChange={e => setDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <button className="h-fit self-end bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
                {t.confirm}
              </button>
            </form>`;

content = content.replace(oldCustomerForm, newCustomerForm);

// 6. Add due_date to Customer profile edit form
const oldProfileEditForm = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.phone}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.address}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                    </div>`;

const newProfileEditForm = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.phone}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.address}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.dueDate}</label>
                        <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent font-bold" value={editForm.due_date || ''} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                      </div>
                    </div>`;

content = content.replace(oldProfileEditForm, newProfileEditForm);

// 7. Update Customer details modal profile section to display Due Date
const oldDetailsGrid = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Phone className="w-3 h-3 text-accent" /> {t.phone}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.phone || '---'}</div>
                      </div>
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-accent" /> {t.address}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.address || '---'}</div>
                      </div>
                    </div>`;

const newDetailsGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Phone className="w-3 h-3 text-accent" /> {t.phone}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.phone || '---'}</div>
                      </div>
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-accent" /> {t.address}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.address || '---'}</div>
                      </div>
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <CalendarClock className="w-3 h-3 text-accent" /> {t.dueDate}
                        </div>
                        <div className="text-sm font-bold text-text-main">
                          {selectedCustomer.due_date ? new Date(selectedCustomer.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '---'}
                        </div>
                      </div>
                    </div>`;

content = content.replace(oldDetailsGrid, newDetailsGrid);

// 8. Replace .toFixed(2) in App.tsx with formatNumber()
// We'll replace them globally with clean regex expressions to preserve the content inside!
const toFixedRegex = /\{([^}]+?)\.toFixed\(2\)\}/g;
content = content.replace(toFixedRegex, (match, expression) => {
  return `{formatNumber(${expression.trim()})}`;
});

// 9. Replace the .toLocaleString() calls on money values
content = content.replace(`value={\`\${totalSalesLifetime.toLocaleString(undefined, { maximumFractionDigits: 0 })} \${t.currency}\`}`, `value={\`\${formatNumber(totalSalesLifetime)} \${t.currency}\`}`);
content = content.replace(`value={\`\${totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} \${t.currency}\`}`, `value={\`\${formatNumber(totalInventoryValue)} \${t.currency}\`}`);
content = content.replace(`value={\`\${totalExpectedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} \${t.currency}\`}`, `value={\`\${formatNumber(totalExpectedProfit)} \${t.currency}\`}`);
content = content.replace(`value={customersWithDebtCount.toLocaleString()}`, `value={formatNumber(customersWithDebtCount)}`);
content = content.replace(`value={\`\${totalDebtValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} \${t.currency}\`}`, `value={\`\${formatNumber(totalDebtValue)} \${t.currency}\`}`);
content = content.replace(`value={\`\${totalSupplierDebtValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} \${t.currency}\`}`, `value={\`\${formatNumber(totalSupplierDebtValue)} \${t.currency}\`}`);
content = content.replace(`<div className="text-5xl font-black text-text-main my-8">{totalSupplierDebt.toLocaleString()}</div>`, `<div className="text-5xl font-black text-text-main my-8">{formatNumber(totalSupplierDebt)}</div>`);
content = content.replace(`{canViewDebtAmount ? s.debt.toLocaleString() : '***'}`, `{canViewDebtAmount ? formatNumber(s.debt) : '***'}`);
content = content.replace(`{h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? h.amount.toLocaleString() : '***'}`, `{h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? formatNumber(h.amount) : '***'}`);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully completed formatting replacements and added Customer Due Date feature end-to-end!");
