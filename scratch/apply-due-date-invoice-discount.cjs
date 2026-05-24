const fs = require('fs');

// Part 1: Update src/services/invoiceService.ts to support Discount and Subtotal
const invoiceServicePath = 'src/services/invoiceService.ts';
let invoiceServiceContent = fs.readFileSync(invoiceServicePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add formatNumber helper at top of invoiceService.ts
const formatNumberImport = `import { jsPDF } from 'jspdf';`;
const formatNumberHelper = `import { jsPDF } from 'jspdf';

export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");
};`;

if (!invoiceServiceContent.includes('export const formatNumber')) {
  invoiceServiceContent = invoiceServiceContent.replace(formatNumberImport, formatNumberHelper);
}

// 2. Add discount and subtotal to InvoiceData interface
const oldInvoiceDataInterface = `interface InvoiceData {
  saleId: string;
  invoiceNumber?: number;
  date: string;
  items: InvoiceItem[];
  total: number;
  clientName?: string;
  staffName?: string;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'CREDIT' | 'PARTIAL';
  notes?: string;
  checkNumber?: string;
  checkOwner?: string;
}`;

const newInvoiceDataInterface = `interface InvoiceData {
  saleId: string;
  invoiceNumber?: number;
  date: string;
  items: InvoiceItem[];
  total: number;
  subtotal?: number;
  discount?: number;
  clientName?: string;
  staffName?: string;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'CREDIT' | 'PARTIAL';
  notes?: string;
  checkNumber?: string;
  checkOwner?: string;
}`;

invoiceServiceContent = invoiceServiceContent.replace(oldInvoiceDataInterface, newInvoiceDataInterface);

// 3. Format unit price and subtotal price in autoTable inside generateInvoicePDF
const oldAutoTableBody = `    body: data.items.map(item => [
      item.name,
      item.qty.toString(),
      \`\${item.price.toFixed(2)} DH\`,
      \`\${(item.qty * item.price).toFixed(2)} DH\`
    ]),`;

const newAutoTableBody = `    body: data.items.map(item => [
      item.name,
      item.qty.toString(),
      \`\${formatNumber(item.price)} DH\`,
      \`\${formatNumber(item.qty * item.price)} DH\`
    ]),`;

invoiceServiceContent = invoiceServiceContent.replace(oldAutoTableBody, newAutoTableBody);

// 4. Update the Totals area in generateInvoicePDF to render Discount & Subtotal if discount exists
const oldTotalsArea = `  // Totals Area
  const boxW = 80;
  const boxX = pageWidth - margin - boxW;
  doc.setDrawColor(241, 245, 249);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(boxX, finalY, boxW, 35, 2, 2, 'FD');
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL NET À PAYER (TTC):', boxX + 5, finalY + 12);
  
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Darker black
  doc.setFont('helvetica', 'bold');
  doc.text(\`\${data.total.toFixed(2)} DH\`, pageWidth - margin - 5, finalY + 22, { align: 'right' });`;

const newTotalsArea = `  // Totals Area
  const boxW = 80;
  const boxX = pageWidth - margin - boxW;
  doc.setDrawColor(241, 245, 249);
  doc.setFillColor(252, 252, 252);

  const discountVal = data.discount || 0;
  const subtotalVal = data.subtotal || (data.total + discountVal);

  if (discountVal > 0) {
    doc.roundedRect(boxX, finalY, boxW, 45, 2, 2, 'FD');
    
    // Subtotal Row
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL BRUT (TTC):', boxX + 5, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(\`\${formatNumber(subtotalVal)} DH\`, pageWidth - margin - 5, finalY + 10, { align: 'right' });

    // Discount Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('REMISE (TAKHFID):', boxX + 5, finalY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red color for discount
    doc.text(\`-\${formatNumber(discountVal)} DH\`, pageWidth - margin - 5, finalY + 18, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(boxX + 5, finalY + 23, pageWidth - margin - 5, finalY + 23);

    // Total Net Row
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('NET À PAYER (TTC):', boxX + 5, finalY + 30);
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(\`\${formatNumber(data.total)} DH\`, pageWidth - margin - 5, finalY + 40, { align: 'right' });
  } else {
    doc.roundedRect(boxX, finalY, boxW, 35, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL NET À PAYER (TTC):', boxX + 5, finalY + 12);
    
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Darker black
    doc.setFont('helvetica', 'bold');
    doc.text(\`\${formatNumber(data.total)} DH\`, pageWidth - margin - 5, finalY + 22, { align: 'right' });
  }`;

invoiceServiceContent = invoiceServiceContent.replace(oldTotalsArea, newTotalsArea);
fs.writeFileSync(invoiceServicePath, invoiceServiceContent, 'utf8');
console.log("Successfully updated invoiceService.ts with discount rendering!");


// Part 2: Update src/App.tsx with normalized lines
const appPath = 'src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Pass discount and subtotal in checkout
appContent = appContent.replace(
  'const lastSaleData = {',
  'const lastSaleData = {\n          subtotal: subtotal,\n          discount: discountVal,'
);

// 2. Pass discount and subtotal in Call 1
appContent = appContent.replace(
  `clientName: selectedCustomer?.name
                                            }, language, settings);`,
  `clientName: selectedCustomer?.name,
                                              subtotal: sale.subtotal,
                                              discount: sale.discount
                                            }, language, settings);`
);

// 3. Pass discount and subtotal in Call 2
appContent = appContent.replace(
  `                      total: selectedSaleToShow.total,
                      clientName: selectedCustomer?.name
                    }, language, settings);`,
  `                      total: selectedSaleToShow.total,
                      subtotal: selectedSaleToShow.subtotal,
                      discount: selectedSaleToShow.discount,
                      clientName: selectedCustomer?.name
                    }, language, settings);`
);

// 4. Pass discount and subtotal in Call 3
appContent = appContent.replace(
  `      total: sale.total,
      clientName: customer?.name,
      staffName: staff?.email,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);`,
  `      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      clientName: customer?.name,
      staffName: staff?.email,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);`
);

// 5. Inject Due Date on the Customer Card overview
appContent = appContent.replace(
  `                    <div className="flex items-baseline gap-1 relative z-10">
                       <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                       <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                    </div>
                 </div>`,
  `                    <div className="flex items-baseline gap-1 relative z-10">
                       <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                       <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                    </div>
                 </div>

                 {c.debt > 0 && c.due_date && (
                   <div className="mt-4 flex items-center justify-between text-xs font-bold text-text-secondary bg-bg-base px-4 py-2.5 rounded-xl border border-border-subtle shadow-sm animate-in fade-in slide-in-from-top-1">
                     <span className="opacity-60 flex items-center gap-1.5">
                       <CalendarClock className="w-3.5 h-3.5 text-accent animate-pulse" />
                       {language === 'ar' ? 'تاريخ الاستحقاق:' : "Date d'Échéance :"}
                     </span>
                     <span className={cn(
                       "font-black font-mono",
                       new Date(c.due_date) < new Date() ? "text-danger animate-bounce" : "text-text-main"
                     )}>
                       {new Date(c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                     </span>
                   </div>
                 )}`
);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log("Successfully normalized and updated App.tsx!");
