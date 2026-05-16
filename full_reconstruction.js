import fs from 'fs';
const filePath = './src/App.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const anchor = "FINANCIAL HISTORY";
const mapStartString = "{(customerHistory || []).map((item) => (";
const mapStartIndex = content.indexOf(mapStartString, content.indexOf(anchor));

if (mapStartIndex === -1) {
    console.log("Could not find start of map.");
    process.exit(1);
}

// Find the corresponding end of map
// It's follows by </div> and then )}
// In the current mess, it's roughly lines 3308 to 3315.
// But the real map should end at the final ))}.

// A more robust way: find the first ))}\n                    </div>\n                  )}
const mapEndString = "))}";
// Since the code is currently broken, we need to find the furthest sensible point.
// I'll find the one followed by </div> and }
let mapEndIndex = content.indexOf("))}", mapStartIndex) + 3;

// Let's assume the map ends after the last instance of 'Printer' in this section.
const lastPrinterIndex = content.lastIndexOf("Printer", mapStartIndex + 2000);
mapEndIndex = content.indexOf("))}", lastPrinterIndex) + 3;

console.log(`Replacing map from ${mapStartIndex} to ${mapEndIndex}`);

const newMapCode = `(customerHistory || []).map((item) => (
                         <div key={item.id} className="group bg-bg-base/40 p-5 rounded-2xl flex justify-between items-center text-sm border border-border-subtle/40 hover:bg-white hover:border-accent/20 transition-all shadow-sm">
                           <div className={cn("flex flex-col gap-0.5", language === 'ar' && "text-right")}>
                             <div className="text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-60 flex items-center gap-2">
                               {item.type === 'SALE' ? (
                                 <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-[9px]">FACTURE</span>
                               ) : null}
                               {item.description}
                               {item.payment_method === 'CHECK' && (
                                 <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                   <CreditCard className="w-3 h-3" /> {t.check} #{item.check_number} {item.check_owner && \`(\${item.check_owner})\`}
                                 </span>
                               )}
                             </div>
                             <div className={cn("text-lg font-black tracking-tighter", item.type === 'PAYMENT' ? "text-success" : "text-danger")}>
                                {item.type === 'PAYMENT' ? '+' : '-'}{item.amount.toFixed(2)} {t.currency}
                             </div>
                             <div className="text-[10px] font-bold text-text-secondary/70 mt-1 flex items-center gap-1.5">
                               <CalendarClock className="w-3 h-3" />
                               {new Date(item.date).toLocaleString()}
                               {item.payment_method === 'CHECK' && item.check_due_date && (
                                 <span className="ml-2 text-danger">({t.dueDate}: {new Date(item.check_due_date).toLocaleDateString()})</span>
                               )}
                             </div>
                           </div>
                            <div className="flex flex-col items-end gap-2">
                               <div className={cn(
                                 "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border-2",
                                 item.type === 'PAYMENT' ? "bg-green-50 text-success border-green-100/50" : 
                                 item.type === 'SALE' ? "bg-blue-50 text-accent border-blue-100/50" :
                                 "bg-red-50 text-danger border-red-100/50"
                               )}>
                                 {item.type === 'SALE' ? (language === 'ar' ? 'فاتورة' : 'SALE') : item.type}
                               </div>
                               <button 
                                 onClick={async () => {
                                   if (item.type === 'SALE') {
                                     try {
                                       const sale = sales.find((s: any) => s.id === item.id);
                                       if (sale) {
                                         generateInvoicePDF({
                                           saleId: sale.id,
                                           invoiceNumber: sale.invoiceNumber,
                                           date: sale.date,
                                           items: (sale.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                                           total: sale.total,
                                           language,
                                           clientName: selectedCustomer?.name
                                         }, language, settings);
                                       } else {
                                          const allSales = await api.getSales();
                                          const foundSale = allSales.find((s: any) => s.id === item.id);
                                          if (foundSale) {
                                            generateInvoicePDF({
                                              saleId: foundSale.id,
                                              invoiceNumber: foundSale.invoiceNumber,
                                              date: foundSale.date,
                                              items: (foundSale.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                                              total: foundSale.total,
                                              language,
                                              clientName: selectedCustomer?.name
                                            }, language, settings);
                                          }
                                       }
                                     } catch (e) {
                                       console.error("Print error:", e);
                                     }
                                   } else {
                                     generateTransactionReceiptPDF({
                                       customerName: (selectedCustomer as Customer).name,
                                       type: item.type,
                                       amount: item.amount,
                                       date: item.date,
                                       description: item.description,
                                       saleId: item.id
                                     }, language, settings);
                                   }
                                 }}
                                 className="p-2 bg-white border border-border-subtle rounded-lg hover:border-accent group/print transition-colors"
                               >
                                 <Printer className="w-3.5 h-3.5 text-text-secondary group-hover/print:text-accent" />
                               </button>
                             </div>
                          </div>
                        ))}`;

const newContent = content.substring(0, mapStartIndex) + "{" + newMapCode + content.substring(mapEndIndex);
fs.writeFileSync(filePath, newContent);
console.log("Reconstruction successful.");
