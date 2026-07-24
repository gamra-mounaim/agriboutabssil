import React, { useState, useEffect } from 'react';
import { Search, Printer, Edit2, CheckCircle2, AlertTriangle, FileText, X } from 'lucide-react';
import { cn, formatNumber } from '../utils';
import { Sale } from '../types';
import { useStore, useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { generateInvoicePDF } from '../services/invoiceService';
import { api } from '../services/apiService';
import { motion, AnimatePresence } from 'motion/react';

export default function InvoicesView({ permissions, currentUserRole }: { permissions: any, currentUserRole?: string }) {
  const { sales, salesTotal, salesPage, fetchSalesPage, customers, appUsers, settings, fetchData } = useStore();
  const { language, user: currentUser } = useAuthStore();
  const t = translations[language] as any;

  const [searchQuery, setSearchQuery] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const printInvoice = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const staff = appUsers.find(u => u.id === sale.staffId);
    
    generateInvoicePDF({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      items: (sale.items || []).map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      clientName: customer?.name,
      staffName: staff?.email,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSalesPage(1, searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, fetchSalesPage]);

  const canViewAll = currentUserRole === 'admin' || currentUser?.email?.includes('1984') || (currentUser as any)?.username?.includes('1984');
  const filteredSales = sales.filter(s => {
    if (!canViewAll && s.staffId !== currentUser?.id) return false;
    const customer = customers.find(c => c.id === s.customerId);
    const cName = customer?.name || (s as any).customerName || '';
    
    const matchesSearch = 
      cName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.invoiceNumber?.toString() || '').includes(searchQuery.replace('#', '')) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setNewDiscount(sale.discount || 0);
  };

  const handleSaveDiscount = async () => {
    if (!editingSale) return;
    setIsSubmitting(true);
    try {
      await api.updateSaleDiscount(editingSale.id, newDiscount, currentUser?.id || '');
      await fetchData();
      setEditingSale(null);
    } catch (error: any) {
      alert(error.message || 'Error updating discount');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent" />
            {t.invoices || "Invoices"}
          </h2>
        </div>
      </div>

      <div className="bg-card border border-border-subtle rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-base border-2 border-border-subtle rounded-xl py-3 pl-12 pr-4 text-sm focus:border-accent outline-none transition-all text-text-main"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-base text-[10px] uppercase tracking-wider text-text-secondary font-black">
                <th className="p-4 border-b border-border-subtle rounded-tl-2xl">{(t as any).date}</th>
                <th className="p-4 border-b border-border-subtle">N°</th>
                <th className="p-4 border-b border-border-subtle">{(t as any).client}</th>
                <th className="p-4 border-b border-border-subtle">{(t as any).staff}</th>
                <th className="p-4 border-b border-border-subtle">{(t as any).method}</th>
                <th className="p-4 border-b border-border-subtle text-right">{(t as any).subtotal}</th>
                <th className="p-4 border-b border-border-subtle text-right">{(t as any).discount}</th>
                <th className="p-4 border-b border-border-subtle text-right">{(t as any).total}</th>
                <th className="p-4 border-b border-border-subtle text-right rounded-tr-2xl">{(t as any).actions}</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-border-subtle">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-bg-base/50 transition-colors group">
                  <td className="p-4">
                    <span className="text-text-secondary whitespace-nowrap">{new Date(sale.date).toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR')}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-text-secondary bg-text-secondary/10 px-2 py-1 rounded-md">
                      #{sale.invoiceNumber || sale.id.slice(0,6)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold">
                      {(sale as any).customerName || customers.find(c => c.id === sale.customerId)?.name || (t as any).walkingCustomer}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary text-xs">
                    {appUsers.find(u => u.id === sale.staffId)?.email?.split('@')[0] || '-'}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      sale.paymentMethod === 'cash' ? "bg-emerald-50 text-emerald-600" :
                      sale.paymentMethod === 'card' ? "bg-blue-50 text-blue-600" :
                      sale.paymentMethod === 'debt' ? "bg-rose-50 text-rose-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {sale.paymentMethod === 'debt' ? (t as any).debt :
                       sale.paymentMethod === 'cash' ? (t as any).cash :
                       sale.paymentMethod === 'check' ? (t as any).check : sale.paymentMethod}
                    </span>
                  </td>
                  <td className="p-4 text-right">{formatNumber(sale.subtotal)} DH</td>
                  <td className="p-4 text-right text-rose-500">
                    {sale.discount > 0 ? `-${formatNumber(sale.discount)}` : '-'}
                  </td>
                  <td className="p-4 text-right font-black text-accent">{formatNumber(sale.total)} DH</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(sale)}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                        title={t.editDiscount}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => printInvoice(sale)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        title={(t as any).print}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-secondary">
                    {t.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {salesTotal > 50 && (
            <div className="flex items-center justify-between p-5 border-t border-border-subtle bg-bg-base/30">
              <div className="text-xs font-black text-text-secondary uppercase tracking-widest">
                {language === 'ar' ? `صفحة ${salesPage} من ${Math.ceil(salesTotal / 50)}` : language === 'fr' ? `Page ${salesPage} sur ${Math.ceil(salesTotal / 50)}` : `Page ${salesPage} of ${Math.ceil(salesTotal / 50)}`}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={salesPage === 1}
                  onClick={() => fetchSalesPage(salesPage - 1, searchQuery)}
                  className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
                >
                  {language === 'ar' ? 'السابق' : language === 'fr' ? 'Précédent' : 'Previous'}
                </button>
                <button 
                  disabled={salesPage >= Math.ceil(salesTotal / 50)}
                  onClick={() => fetchSalesPage(salesPage + 1, searchQuery)}
                  className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
                >
                  {language === 'ar' ? 'التالي' : language === 'fr' ? 'Suivant' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingSale(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border-subtle p-6"
            >
              <button onClick={() => !isSubmitting && setEditingSale(null)} className="absolute top-4 right-4 p-2 bg-bg-base hover:bg-border-subtle text-text-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-black mb-6 text-text-main flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-accent" />
                {t.editDiscount}
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-bg-base rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">N° {(t as any).invoice}</span>
                    <span className="font-mono font-bold text-text-main">#{editingSale.invoiceNumber || editingSale.id.slice(0,6)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{(t as any).subtotal}</span>
                    <span className="font-bold text-text-main">{formatNumber(editingSale.subtotal)} DH</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border-subtle pt-2 mt-2">
                    <span className="text-text-secondary font-bold">{(t as any).total}</span>
                    <span className="font-black text-accent">{formatNumber(editingSale.subtotal - newDiscount)} DH</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-2">
                    {t.discountAmount}
                  </label>
                  <input
                    type="number"
                    value={newDiscount === 0 ? '' : newDiscount}
                    onChange={(e) => setNewDiscount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={editingSale.subtotal}
                    step="0.01"
                    className="w-full bg-bg-base border-2 border-border-subtle rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-all text-text-main font-bold"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingSale(null)}
                    disabled={isSubmitting}
                    className="flex-1 bg-bg-base hover:bg-border-subtle text-text-main font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSaveDiscount}
                    disabled={isSubmitting || newDiscount < 0 || newDiscount > editingSale.subtotal}
                    className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (t as any).saving : (t as any).saveChanges}
                    {!isSubmitting && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
