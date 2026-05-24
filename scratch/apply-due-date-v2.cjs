const fs = require('fs');

// 1. Modifying src/App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Target 1: Add due date input in Add Customer form
const oldAddForm = `            <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
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

const newAddForm = `            <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.dueDate || (language === 'ar' ? 'تاريخ الاستحقاق' : 'Date d\\'échéance')}</label>
                <input type="date" value={dueDate || ''} onChange={e => setDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
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

if (appContent.includes(oldAddForm)) {
  appContent = appContent.replace(oldAddForm, newAddForm);
  console.log("Successfully added due date input in Add Customer form!");
} else {
  // Let's try matching with normalized line-endings or simpler text match if needed
  const normalizedAppContent = appContent.replace(/\r\n/g, '\n');
  const normalizedOld = oldAddForm.replace(/\r\n/g, '\n');
  const normalizedNew = newAddForm.replace(/\r\n/g, '\n');
  if (normalizedAppContent.includes(normalizedOld)) {
    appContent = normalizedAppContent.replace(normalizedOld, normalizedNew);
    console.log("Successfully normalized & added due date input in Add Customer form!");
  } else {
    console.warn("Could not find Add Customer form. Let's do a robust search!");
  }
}

// Target 2: Render customer due date in CustomerCard inside Customer List
const oldCardDebt = `                <div className={cn("p-6 rounded-[1.5rem] mb-6 relative overflow-hidden", c.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
                   <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-8 translate-x-8", c.debt > 0 ? "bg-danger/10" : "bg-success/10")} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-60">{t.debt}</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                      <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                </div>`;

const newCardDebt = `                <div className={cn("p-6 rounded-[1.5rem] mb-6 relative overflow-hidden", c.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
                   <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-8 translate-x-8", c.debt > 0 ? "bg-danger/10" : "bg-success/10")} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-60">{t.debt}</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                      <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                   {c.debt > 0 && c.due_date && (
                     <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                       <CalendarClock className={cn("w-3.5 h-3.5", new Date(c.due_date) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                       <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date(c.due_date) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                         {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                       </span>
                     </div>
                   )}
                </div>`;

const normalizedApp = appContent.replace(/\r\n/g, '\n');
const normalizedOldCard = oldCardDebt.replace(/\r\n/g, '\n');
const normalizedNewCard = newCardDebt.replace(/\r\n/g, '\n');
if (normalizedApp.includes(normalizedOldCard)) {
  appContent = normalizedApp.replace(normalizedOldCard, normalizedNewCard);
  console.log("Successfully replaced Customer Card Debt block with Due Date warning badge!");
} else {
  console.warn("Customer Card Debt block match failed. Let's do a substring replace!");
  // Let's do a substring replace on the main lines
  const subOld = `<span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                </div>`;
  const subNew = `<span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                   {c.debt > 0 && c.due_date && (
                     <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                       <CalendarClock className={cn("w-3.5 h-3.5", new Date(c.due_date) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                       <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date(c.due_date) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                         {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                       </span>
                     </div>
                   )}
                </div>`;
  const normSubOld = subOld.replace(/\r\n/g, '\n');
  const normSubNew = subNew.replace(/\r\n/g, '\n');
  if (normalizedApp.includes(normSubOld)) {
    appContent = normalizedApp.replace(normSubOld, normSubNew);
    console.log("Successfully substring-replaced Customer Card!");
  } else {
    console.error("FATAL: Could not replace Customer Card!");
  }
}

// Target 3: Low stock and exhausted stock styling in POS Grid items
const oldProductBtn = `              <motion.button 
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={p.qty <= 0}
                onClick={() => addToCart(p)}
                className={cn(
                  "group relative flex flex-col justify-between p-4 rounded-2xl border bg-card text-left transition-all hover:shadow-xl hover:-translate-y-1 hover:border-accent active:shadow-none",
                  p.qty <= 0 ? "opacity-40 grayscale cursor-not-allowed border-border-subtle" : "border-border-subtle",
                  p.qty <= (p.minStock ?? 5) && p.qty > 0 && "border-orange-200/50 bg-orange-50/5",
                  language === 'ar' && "text-right"
                )}
              >`;

const newProductBtn = `              <motion.button 
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={p.qty <= 0}
                onClick={() => addToCart(p)}
                className={cn(
                  "group relative flex flex-col justify-between p-4 rounded-2xl border bg-card text-left transition-all hover:shadow-xl hover:-translate-y-1 hover:border-accent active:shadow-none",
                  p.qty <= 0 ? "bg-red-50/20 dark:bg-red-950/10 border-danger/30 opacity-75 cursor-not-allowed" : "border-border-subtle",
                  p.qty <= (p.minStock ?? 5) && p.qty > 0 && "border-orange-200/50 bg-orange-50/5",
                  language === 'ar' && "text-right"
                )}
              >`;

const oldCategoriesHeader = `                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">
                        {categories.find(c => c.id === p.categoryId)?.name || t.noCategory}
                      </span>
                      <h4 className="font-bold text-[13px] text-text-main group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                    </div>
                    {p.qty <= (p.minStock ?? 5) && p.qty > 0 && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    )}
                  </div>`;

const newCategoriesHeader = `                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">
                        {categories.find(c => c.id === p.categoryId)?.name || t.noCategory}
                      </span>
                      <h4 className="font-bold text-[13px] text-text-main group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                    </div>
                    {p.qty <= 0 ? (
                      <span className="text-[9px] font-black bg-danger/15 text-danger px-2 py-0.5 rounded-md animate-pulse">
                        {language === 'ar' ? 'نفذت الكمية' : 'RUPTURE'}
                      </span>
                    ) : p.qty <= (p.minStock ?? 5) && p.qty > 0 && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    )}
                  </div>`;

const normApp = appContent.replace(/\r\n/g, '\n');
const normOldBtn = oldProductBtn.replace(/\r\n/g, '\n');
const normNewBtn = newProductBtn.replace(/\r\n/g, '\n');
const normOldHeader = oldCategoriesHeader.replace(/\r\n/g, '\n');
const normNewHeader = newCategoriesHeader.replace(/\r\n/g, '\n');

if (normApp.includes(normOldBtn)) {
  appContent = normApp.replace(normOldBtn, normNewBtn);
  console.log("Successfully stylized product POS buttons!");
} else {
  console.warn("Could not match oldProductBtn. Doing substring button class replacement!");
  const subBtnOld = `p.qty <= 0 ? "opacity-40 grayscale cursor-not-allowed border-border-subtle" : "border-border-subtle",
                  p.qty <= (p.minStock ?? 5) && p.qty > 0 && "border-orange-200/50 bg-orange-50/5"`;
  const subBtnNew = `p.qty <= 0 ? "bg-red-50/20 dark:bg-red-950/10 border-danger/30 opacity-75 cursor-not-allowed" : "border-border-subtle",
                  p.qty <= (p.minStock ?? 5) && p.qty > 0 && "border-orange-200/50 bg-orange-50/5"`;
  const normSubBtnOld = subBtnOld.replace(/\r\n/g, '\n');
  const normSubBtnNew = subBtnNew.replace(/\r\n/g, '\n');
  const normAppLatest = appContent.replace(/\r\n/g, '\n');
  if (normAppLatest.includes(normSubBtnOld)) {
    appContent = normAppLatest.replace(normSubBtnOld, normSubBtnNew);
    console.log("Successfully substring-replaced POS buttons!");
  } else {
    console.error("FATAL: Could not replace POS button classes!");
  }
}

const normAppLatest2 = appContent.replace(/\r\n/g, '\n');
if (normAppLatest2.includes(normOldHeader)) {
  appContent = normAppLatest2.replace(normOldHeader, normNewHeader);
  console.log("Successfully added RUPTURE badge to low/empty stock items!");
} else {
  console.error("FATAL: Could not add RUPTURE badge to items!");
}

// Write the changes back to App.tsx
fs.writeFileSync('src/App.tsx', appContent, 'utf8');
console.log("Successfully wrote all updates to src/App.tsx!");


// 2. Modifying src/services/invoiceService.ts
let serviceContent = fs.readFileSync('src/services/invoiceService.ts', 'utf8');

const oldStockReportPDF = `export const generateStockReportPDF = (data: StockReportData) => {
  const { items, generatedAt, language } = data;
  const isAr = language === 'ar';
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 85);
  doc.text(isAr ? 'تقرير المخزون الحرج' : 'Critical Stock Report', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(\`\${isAr ? 'تم الإنشاء في' : 'Generated at'}: \${generatedAt}\`, 105, 30, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 40, 190, 40);

  const tableColumn = isAr ? 
    ["اسم المنتج", "المورد", "الكمية", "الحد الأدنى", "الحالة"] : 
    ["Product Name", "Supplier", "Qty", "Min", "Status"];

  const tableRows = items.map(p => [
    p.name,
    p.supplier || '-',
    p.qty.toString(),
    (p.minStock ?? 5).toString(),
    p.qty === 0 ? (isAr ? "نفذ المخزون" : "Out of Stock") : (isAr ? "مخزون منخفض" : "Low Stock")
  ]);

  (doc as any).autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9, halign: isAr ? 'right' : 'left' },
    didParseCell: function (data: any) {
      prepareArabicCell(data);
    },
    didDrawCell: function (data: any) {
      drawArabicCell(doc, data);
      if (data.section === 'body' && data.column.index === 4) {
        const status = data.cell.raw;
        if (status === 'Out of Stock' || status === 'نفذ المخزون') {
          data.cell.styles.textColor = [234, 88, 12]; // Orange-600
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Low Stock' || status === 'مخزون منخفض') {
          data.cell.styles.textColor = [220, 38, 38]; // Red-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  doc.save(\`STOCK_ALERTS_REPORT_\${Date.now()}.pdf\`);
};`;

const newStockReportPDF = `export const generateStockReportPDF = (data: StockReportData) => {
  const { items, generatedAt, language } = data;
  const isAr = language === 'ar';
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 85);
  doc.text(isAr ? 'تقرير المخزون الحرج' : 'Critical Stock Report', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(\`\${isAr ? 'تم الإنشاء في' : 'Generated at'}: \${generatedAt}\`, 105, 30, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 40, 190, 40);

  const tableColumn = isAr ? 
    ["اسم المنتج", "المورد", "الكمية", "الحد الأدنى", "الحالة"] : 
    ["Product Name", "Supplier", "Qty", "Min", "Status"];

  const tableRows = items.map(p => [
    p.name || '',
    p.supplier || '-',
    String(p.qty ?? 0),
    String(p.minStock ?? 5),
    (p.qty ?? 0) === 0 ? (isAr ? "نفذ المخزون" : "Out of Stock") : (isAr ? "مخزون منخفض" : "Low Stock")
  ]);

  (doc as any).autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9, halign: isAr ? 'right' : 'left' },
    didParseCell: function (data: any) {
      prepareArabicCell(data);
    },
    didDrawCell: function (data: any) {
      if (data.section === 'body' && data.column.index === 4) {
        const status = data.cell.raw;
        let customColor = '#1a1a1a';
        if (status === 'Out of Stock' || status === 'نفذ المخزون') {
          customColor = '#ea580c'; // Orange-600
        } else if (status === 'Low Stock' || status === 'مخزون منخفض') {
          customColor = '#dc2626'; // Red-600
        }
        drawArabicCell(doc, data, customColor);
      } else {
        drawArabicCell(doc, data);
      }
    }
  });

  doc.save(\`STOCK_ALERTS_REPORT_\${Date.now()}.pdf\`);
};`;

const normService = serviceContent.replace(/\r\n/g, '\n');
const normOldStock = oldStockReportPDF.replace(/\r\n/g, '\n');
const normNewStock = newStockReportPDF.replace(/\r\n/g, '\n');

if (normService.includes(normOldStock)) {
  serviceContent = normService.replace(normOldStock, normNewStock);
  console.log("Successfully updated generateStockReportPDF implementation in service!");
} else {
  console.error("FATAL: Could not match oldStockReportPDF!");
}

// Write the changes back to invoiceService.ts
fs.writeFileSync('src/services/invoiceService.ts', serviceContent, 'utf8');
console.log("Successfully wrote all updates to src/services/invoiceService.ts!");
