const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: Add Supplier Form Grid Columns and Due Date Input
const target1 = `<form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierName}</label>
             <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.supplierName} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.phone}</label>
             <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierDebt}</label>
             <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-black text-danger" />
          </div>
          <button className="md:col-span-1 h-fit self-end bg-accent text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
            <Plus className="w-4 h-4" />
            {t.confirm}
          </button>
        </form>`;

const replacement1 = `<form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierName}</label>
             <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.supplierName} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.phone}</label>
             <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierDebt}</label>
             <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-black text-danger" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.dueDate}</label>
             <input type="date" value={supplierDueDate || ''} onChange={e => setSupplierDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <button className="md:col-span-1 h-fit self-end bg-accent text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
            <Plus className="w-4 h-4" />
            {t.confirm}
          </button>
        </form>`;

// Replace 2: SelectedSupplier Modal Header and Body (including edit profile functionality)
const target2 = `<div className="p-8 border-b border-border-subtle flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.supplierDetails}</div>
                   <h3 className="text-3xl font-bold tracking-tight">{selectedSupplier.name}</h3>
                </div>
                <div className="flex items-center gap-4">
                  {canViewDebtAmount && (
                    <button 
                      onClick={() => {
                        generateStatementPDF({
                          entityName: selectedSupplier.name,
                          remainingDebt: selectedSupplier.debt,
                          transactions: supplierHistory,
                          type: 'supplier'
                        }, language, settings);
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-accent hover:bg-accent/5 px-4 py-2 rounded-xl transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      {t.generateStatement}
                    </button>
                  )}
                  <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-bg-base rounded-full"><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-auto">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-6 border-b pb-4">{t.paymentHistory}</h4>
                 <div className="space-y-4">
                   {supplierHistory.map(h => (
                     <div key={h.id} className="flex justify-between items-center p-4 bg-bg-base/30 rounded-xl border border-border-subtle/40">
                       <div>
                         <p className="text-xs font-bold text-text-main">
                           {h.description}
                           {h.payment_method === 'CHECK' && (
                             <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                               <CreditCard className="w-3 h-3" /> {t.check} #{h.check_number} {h.check_owner && \`(\${h.check_owner})\`}
                             </span>
                           )}
                         </p>
                         <p className="text-[10px] text-text-secondary">
                           {new Date(h.date).toLocaleString()}
                           {h.payment_method === 'CHECK' && h.check_due_date && (
                             <span className="ml-2 text-danger">({t.dueDate}: {new Date(h.check_due_date).toLocaleDateString()})</span>
                           )}
                         </p>
                       </div>
                       <p className={cn("font-black", h.type === 'PAYMENT' ? "text-emerald-500" : "text-danger")}>
                         {h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? h.amount.toLocaleString() : '***'}
                       </p>
                     </div>
                   ))}
                 </div>
              </div>`;

const replacement2 = `<div className="p-8 border-b border-border-subtle flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.supplierDetails}</div>
                   {isEditingProfile ? (
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.supplierName}</label>
                        <input className="text-2xl font-bold tracking-tight bg-bg-base border border-border-subtle rounded-lg px-3 py-1 w-full outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                     </div>
                   ) : (
                     <h3 className="text-3xl font-bold tracking-tight">{selectedSupplier.name}</h3>
                   )}
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={cn("p-2 rounded-full transition-colors", isEditingProfile ? "bg-accent/10 text-accent" : "hover:bg-bg-base text-text-secondary")}>
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {canViewDebtAmount && !isEditingProfile && (
                    <button 
                      onClick={() => {
                        generateStatementPDF({
                          entityName: selectedSupplier.name,
                          remainingDebt: selectedSupplier.debt,
                          transactions: supplierHistory,
                          type: 'supplier'
                        }, language, settings);
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-accent hover:bg-accent/5 px-4 py-2 rounded-xl transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      {t.generateStatement}
                    </button>
                  )}
                  <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-bg-base rounded-full"><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-auto">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.phone}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.address}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.email}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.dueDate}</label>
                        <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.due_date || ''} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-border-subtle">
                       <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-6 py-3 bg-bg-base text-text-secondary font-bold rounded-xl hover:bg-border-subtle transition-all uppercase text-[10px] tracking-widest">{language === 'ar' ? "إلغاء" : "Cancel"}</button>
                       <button type="submit" className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all uppercase text-[10px] tracking-widest">{t.saveChanges}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-6 border-b pb-4">{t.paymentHistory}</h4>
                    <div className="space-y-4">
                      {supplierHistory.map(h => (
                        <div key={h.id} className="flex justify-between items-center p-4 bg-bg-base/30 rounded-xl border border-border-subtle/40">
                          <div>
                            <p className="text-xs font-bold text-text-main">
                              {h.description}
                              {h.payment_method === 'CHECK' && (
                                <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                  <CreditCard className="w-3 h-3" /> {t.check} #{h.check_number} {h.check_owner && \`(\${h.check_owner})\`}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-text-secondary">
                              {new Date(h.date).toLocaleString()}
                              {h.payment_method === 'CHECK' && h.check_due_date && (
                                <span className="ml-2 text-danger">({t.dueDate}: {new Date(h.check_due_date).toLocaleDateString()})</span>
                              )}
                            </p>
                          </div>
                          <p className={cn("font-black", h.type === 'PAYMENT' ? "text-emerald-500" : "text-danger")}>
                            {h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? h.amount.toLocaleString() : '***'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>`;

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
      console.log(`Successfully replaced HTML: ${description}`);
      return true;
    }
  }
  console.warn(`WARNING: Target HTML not found for: ${description}`);
  return false;
}

let success = true;
success = applyReplacement("Add Supplier Form Due Date Field", target1, replacement1) && success;
success = applyReplacement("Selected Supplier Details Modal and Edit Form", target2, replacement2) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All HTML supplier updates applied successfully!");
} else {
  console.error("HTML replacements failed!");
}
