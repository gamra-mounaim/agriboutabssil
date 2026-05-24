const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `            <div className={cn("grid gap-4", permissions.profits ? "grid-cols-4" : "grid-cols-3")}>
              {permissions.profits && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.costPrice}</label>
                  <input 
                    type="number" step="0.01" placeholder={t.costPrice} 
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                    value={costPrice || ''} onChange={e => setCostPrice(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.price}</label>
                <input 
                  type="number" step="0.01" placeholder={t.price} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                  value={price || ''} onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.qty}</label>
                <input 
                  type="number" placeholder={t.qty} 
                  disabled={!permissions.editStock}
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none disabled:opacity-50" 
                  value={qty || ''} onChange={e => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{language === 'ar' ? "تنبيه" : "Alert"}</label>
                <input 
                  type="number" placeholder={language === 'ar' ? "تنبيه" : "Alert"} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                  value={minStock || ''} onChange={e => setMinStock(e.target.value)}
                />
              </div>
            </div>`;

const replacement = `            <div className={cn("grid gap-4", permissions.profits ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}>
              {permissions.profits && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.costPrice}</label>
                  <input 
                    type="number" step="0.01" placeholder={t.costPrice} 
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                    value={costPrice || ''} onChange={e => setCostPrice(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.price}</label>
                <input 
                  type="number" step="0.01" placeholder={t.price} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                  value={price || ''} onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.qty}</label>
                <input 
                  type="number" placeholder={t.qty} 
                  disabled={!permissions.editStock}
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none disabled:opacity-50" 
                  value={qty || ''} onChange={e => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{language === 'ar' ? "تنبيه" : "Alert"}</label>
                <input 
                  type="number" placeholder={language === 'ar' ? "تنبيه" : "Alert"} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                  value={minStock || ''} onChange={e => setMinStock(e.target.value)}
                />
              </div>
            </div>`;

const cleanTarget = target.replace(/\r\n/g, '\n');
const normContent = content.replace(/\r\n/g, '\n');

if (normContent.includes(cleanTarget)) {
  const replaced = normContent.replace(cleanTarget, replacement);
  fs.writeFileSync(path, replaced.replace(/\n/g, '\r\n'), 'utf8');
  console.log("Successfully fixed Add Product layout input boxes in App.tsx!");
} else {
  console.error("Add Product layout target not found in App.tsx!");
}
