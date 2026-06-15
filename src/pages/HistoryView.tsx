import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Customer, Sale, SaleItem, Supplier, UserProfile, Payment, ActivityLog, CheckDoc, Notification, TransactionRecord, moroccanBanks } from '../types';
import { Language, translations } from '../translations';
import { useStore, useAuthStore } from '../store/useStore';
import { api } from '../services/apiService';
import { 
  generateInvoicePDF, 
  generateStatementPDF, 
  generateGlobalCustomerReportPDF,
  generateHistoryReportPDF,
  generateTransactionReceiptPDF,
  generateStockReportPDF
} from '../services/invoiceService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReChartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Destructure common icons to avoid TS errors
const { Search, Archive, ArrowRightLeft, Hash, User, CalendarClock, FolderOpen, Eye, CheckCircle, Sparkles, UserCog, Store, ChevronRight, ShieldAlert, Cloud, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image: ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe } = LucideIcons;

export default function HistoryView({ permissions, currentUserRole }: { permissions: any, currentUserRole?: string }) {
  const { customers, sales, payments, activities, appUsers, settings, fetchData: onRefresh, salesTotal, salesPage, fetchSalesPage, activitiesTotal, activitiesPage, fetchActivitiesPage } = useStore();
  const { language, user: currentUser } = useAuthStore();

  const t = translations[language];
  const [subView, setSubView] = useState<'sales' | 'payments' | 'activity'>('activity');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchHistory, setSearchHistory] = useState('');
  const [filterActivityType, setFilterActivityType] = useState<string>('all');

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

  const filteredSales = sales.filter(s => {
    if (currentUserRole !== 'admin' && s.staffId !== currentUser?.id) return false;
    const d = new Date(s.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const customer = customers.find(c => c.id === s.customerId);
    const matchesSearch = (customer?.name || '').toLowerCase().includes(searchHistory.toLowerCase()) || 
                          ((s as any).customerName || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                          (s.invoiceNumber?.toString() || '').includes(searchHistory.replace('#', '')) ||
                         s.id.toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (s.checkNumber || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (s.checkOwner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });

    const filteredPayments = payments.filter(p => {
    if (currentUserRole !== 'admin' && p.staffId !== currentUser?.id) return false;
    const d = new Date(p.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const cName = p.customerName || customers.find(c => c.id === p.customerId)?.name || '';
    const matchesSearch = cName.toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_number || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_owner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });

    const translateActivityDetails = (details: string) => {
    if (language === 'en') return details;
    let d = details;
    if (language === 'ar') {
      d = d.replace(/User logged in:/i, 'تسجيل دخول المستخدم:');
      d = d.replace(/Admin login:/i, 'تسجيل دخول المدير:');
      d = d.replace(/Forced logout from all devices for user:/i, 'تسجيل خروج إجباري من جميع الأجهزة للمستخدم:');
      d = d.replace(/Created new user:/i, 'تم إنشاء مستخدم جديد:');
      d = d.replace(/Deleted user account:/i, 'تم حذف حساب المستخدم:');
      d = d.replace(/Added product:/i, 'تمت إضافة منتج:');
      d = d.replace(/Updated product:/i, 'تم تحديث منتج:');
      d = d.replace(/Updated customer:/i, 'تم تحديث زبون:');
      d = d.replace(/Updated supplier:/i, 'تم تحديث مورد:');
      d = d.replace(/\| Changes:/i, '| التغييرات:');
      d = d.replace(/Price:/g, 'السعر:');
      d = d.replace(/Cost:/g, 'التكلفة:');
      d = d.replace(/MinStock:/g, 'الحد الأدنى:');
      d = d.replace(/Barcode:/g, 'الباركود:');
      d = d.replace(/Name:/g, 'الاسم:');
      d = d.replace(/Supplier:/g, 'المورد:');
      d = d.replace(/Category:/g, 'الفئة:');
      d = d.replace(/Phone:/g, 'الهاتف:');
      d = d.replace(/Debt:/g, 'الدين:');
      d = d.replace(/Stock IN:/i, 'إدخال مخزون:');
      d = d.replace(/Stock OUT:/i, 'إخراج مخزون:');
      d = d.replace(/via Supplier/i, 'عبر المورد');
      d = d.replace(/Created category:/i, 'تم إنشاء فئة:');
      d = d.replace(/Added customer:/i, 'تمت إضافة زبون:');
      d = d.replace(/Payment of/i, 'دفعة بقيمة');
      d = d.replace(/from/i, 'من');
      d = d.replace(/Return of/i, 'إرجاع');
      d = d.replace(/Value:/i, 'القيمة:');
      d = d.replace(/Initial Debt:/i, 'الديون الأولية:');
      d = d.replace(/Qty:/g, 'الكمية:');
      d = d.replace(/units/i, 'وحدات');
    } else if (language === 'fr') {
      d = d.replace(/User logged in:/i, 'Utilisateur connecté :');
      d = d.replace(/Admin login:/i, 'Connexion admin :');
      d = d.replace(/Forced logout from all devices for user:/i, 'Déconnexion forcée de tous les appareils pour l\'utilisateur :');
      d = d.replace(/Created new user:/i, 'Nouvel utilisateur créé :');
      d = d.replace(/Deleted user account:/i, 'Compte utilisateur supprimé :');
      d = d.replace(/Added product:/i, 'Produit ajouté :');
      d = d.replace(/Updated product:/i, 'Produit mis à jour :');
      d = d.replace(/Updated customer:/i, 'Client mis à jour :');
      d = d.replace(/Updated supplier:/i, 'Fournisseur mis à jour :');
      d = d.replace(/\| Changes:/i, '| Modifications :');
      d = d.replace(/Price:/g, 'Prix :');
      d = d.replace(/Cost:/g, 'Coût :');
      d = d.replace(/MinStock:/g, 'Stock min :');
      d = d.replace(/Barcode:/g, 'Code-barres :');
      d = d.replace(/Name:/g, 'Nom :');
      d = d.replace(/Supplier:/g, 'Fournisseur :');
      d = d.replace(/Category:/g, 'Catégorie :');
      d = d.replace(/Phone:/g, 'Tél :');
      d = d.replace(/Debt:/g, 'Dette :');
      d = d.replace(/Stock IN:/i, 'Entrée de stock :');
      d = d.replace(/Stock OUT:/i, 'Sortie de stock :');
      d = d.replace(/via Supplier/i, 'via Fournisseur');
      d = d.replace(/Created category:/i, 'Catégorie créée :');
      d = d.replace(/Added customer:/i, 'Client ajouté :');
      d = d.replace(/Payment of/i, 'Paiement de');
      d = d.replace(/from/i, 'de');
      d = d.replace(/Return of/i, 'Retour de');
      d = d.replace(/Value:/i, 'Valeur :');
      d = d.replace(/Initial Debt:/i, 'Dette initiale :');
      d = d.replace(/Qty:/g, 'Qté :');
      d = d.replace(/units/i, 'unités');
    }
    return d;
  };

  const filteredActivities = (activities || []).filter(a => {
    if (currentUserRole !== 'admin' && a.actorId !== currentUser?.id) {
      return false;
    }
    const d = new Date(a.timestamp);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesType = filterActivityType === 'all' || a.type === filterActivityType;
    const translatedDetails = translateActivityDetails(a.details);
    const matchesSearch = (translatedDetails || '').toLowerCase().includes(searchHistory.toLowerCase()) || 
                         (a.actorName || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesType && matchesSearch;
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { v: 1, n: 'Jan' }, { v: 2, n: 'Feb' }, { v: 3, n: 'Mar' }, { v: 4, n: 'Apr' },
    { v: 5, n: 'May' }, { v: 6, n: 'Jun' }, { v: 7, n: 'Jul' }, { v: 8, n: 'Aug' },
    { v: 9, n: 'Sep' }, { v: 10, n: 'Oct' }, { v: 11, n: 'Nov' }, { v: 12, n: 'Dec' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ShoppingCart className="w-4 h-4 text-accent" />;
      case 'PAYMENT': return <Save className="w-4 h-4 text-success" />;
      case 'PRODUCT': return <Package className="w-4 h-4 text-warning" />;
      case 'CUSTOMER': return <Users className="w-4 h-4 text-info" />;
      case 'STAFF': return <UserCog className="w-4 h-4 text-danger" />;
      case 'STOCK': return <Archive className="w-4 h-4 text-indigo-500" />;
      default: return <AlertCircle className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 pb-20">
      <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          <div className="flex flex-wrap gap-2 bg-sidebar border border-border-subtle p-1.5 rounded-xl self-start lg:self-center">
             <button 
              onClick={() => setSubView('activity')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'activity' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {t.allActivities}
            </button>
            <button 
              onClick={() => setSubView('sales')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'sales' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {t.sales}
            </button>
            <button 
              onClick={() => setSubView('payments')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'payments' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <Save className="w-3.5 h-3.5" />
              {t.payments}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
             <button 
              onClick={() => onRefresh()}
              className="p-2.5 rounded-xl border border-border-subtle hover:bg-bg-base text-text-secondary transition-colors"
              title="Refresh"
            >
              <ArrowRightLeft className="w-4 h-4 rotate-90" />
            </button>
            <button 
              onClick={() => {
                const currentList = subView === 'sales' ? filteredSales : (subView === 'payments' ? filteredPayments : filteredActivities);
                let periodStr = filterYear.toString();
                if (filterMonth > 0) {
                  const mName = months.find(m => m.v === filterMonth)?.n;
                  periodStr = `${mName} ${filterYear}`;
                }

                generateHistoryReportPDF({
                  type: subView === 'sales' ? 'SALES' : (subView === 'payments' ? 'PAYMENTS' : 'ACTIVITY'),
                  period: periodStr,
                  totalAmount: subView === 'activity' ? 0 : currentList.reduce((sum, item) => sum + (subView === 'sales' ? (item as Sale).total : (item as Payment).amount), 0),
                  items: currentList.map(item => {
                    if (subView === 'activity') {
                      const a = item as ActivityLog;
                      return { date: a.timestamp, amount: 0, description: `[${a.type}] ${a.details} (by ${a.actorName || 'System'})` };
                    }
                    const customerMatch = customers.find(c => c.id === (item as Sale).customerId);
                    return {
                      date: item.date,
                      amount: subView === 'sales' ? (item as Sale).total : (item as Payment).amount,
                      description: subView === 'sales' ? (customerMatch?.name || 'Walk-in') : ((item as Payment).customerName || customers.find(c => c.id === (item as Payment).customerId)?.name || 'Unknown')
                    };
                  })
                }, language, settings);
              }}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-[11px] font-black border border-border-subtle px-6 py-2.5 rounded-xl hover:border-accent transition-all bg-white shadow-sm hover:shadow-md"
            >
              <Printer className="w-4 h-4 text-accent" />
              {language === 'ar' ? "تحميل التقرير" : "EXPORT REPORT"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
           <div className="md:col-span-12 lg:col-span-6 relative">
             <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4", language === 'ar' ? "right-4" : "left-4")} />
             <input 
               placeholder={language === 'ar' ? "بحث في السجلات..." : "Search history records..."} 
               className={cn(
                 "w-full bg-bg-base border border-border-subtle rounded-xl py-3 text-sm focus:border-accent outline-none",
                 language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
               )}
               value={searchHistory} onChange={e => setSearchHistory(e.target.value)}
             />
           </div>
           
           <div className="md:col-span-4 lg:col-span-2">
             <select 
               className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
               value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
             >
               <option value={0}>{language === 'ar' ? "جميع الشهور" : "All Months"}</option>
               {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
             </select>
           </div>

           <div className="md:col-span-4 lg:col-span-2">
             <select 
               className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
               value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
             >
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>

           {subView === 'activity' && (
             <div className="md:col-span-4 lg:col-span-2">
               <select 
                 className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
                 value={filterActivityType} onChange={e => setFilterActivityType(e.target.value)}
               >
                 <option value="all">{t.allCategories}</option>
                 <option value="SALE">SALE</option>
                 <option value="PAYMENT">PAYMENT</option>
                 <option value="PRODUCT">PRODUCT</option>
                 <option value="CUSTOMER">CUSTOMER</option>
                 <option value="STAFF">STAFF</option>
                 <option value="STOCK">STOCK</option>
               </select>
             </div>
           )}
        </div>
      </div>

      <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {subView === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sidebar/50 border-b border-border-subtle">
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "المعرف / التاريخ" : "REFERENCE / DATE"}</th>
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "المنتجات" : "PRODUCTS"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{language === 'ar' ? "المبلغ" : "AMOUNT"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredSales.map(s => (
                  <tr key={s.id} className="group hover:bg-bg-base/30 transition-colors">
                    <td className="p-5">
                       <div className="font-bold text-text-main text-sm">#{s.invoiceNumber}</div>
                       <div className="text-text-secondary text-[11px] mt-1 font-medium">{new Date(s.date).toLocaleDateString()} • {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       {s.paymentMethod === 'CHECK' && (
                         <div className="text-[10px] font-bold text-text-secondary mt-1">
                           شيك: {s.checkNumber || '-'} | {s.checkOwner || '-'}
                         </div>
                       )}
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1">
                        {(s.items || []).slice(0, 3).map((i, idx) => (
                          <span key={idx} className="bg-bg-base px-2 py-0.5 rounded text-[10px] font-bold border border-border-subtle">{i.qty}x {i.name}</span>
                        ))}
                        {(s.items?.length || 0) > 3 && <span className="text-[10px] text-text-secondary font-bold">+{(s.items?.length || 0) - 3} more</span>}
                      </div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                       <div className="text-base font-black text-text-main tracking-tight">{formatNumber(s.total)} {t.currency}</div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                      <button 
                        onClick={() => printInvoice(s)}
                        className={cn("p-2.5 rounded-xl hover:bg-accent hover:text-white text-accent transition-all", language === 'ar' ? "mr-auto" : "ml-auto")}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'sales' && salesTotal > 50 && (
          <div className="flex items-center justify-between p-5 border-t border-border-subtle bg-sidebar/30">
            <div className="text-xs font-black text-text-secondary uppercase tracking-widest">
              {language === 'ar' ? `صفحة ${salesPage} من ${Math.ceil(salesTotal / 50)}` : `Page ${salesPage} of ${Math.ceil(salesTotal / 50)}`}
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={salesPage === 1}
                onClick={() => fetchSalesPage(salesPage - 1)}
                className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <button 
                disabled={salesPage >= Math.ceil(salesTotal / 50)}
                onClick={() => fetchSalesPage(salesPage + 1)}
                className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
              >
                {language === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {subView === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sidebar/50 border-b border-border-subtle">
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "الزبون" : "CUSTOMER"}</th>
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "التاريخ والوقت" : "TIMESTAMP"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{t.amount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="group hover:bg-bg-base/30 transition-colors">
                    <td className="p-5">
                       <div className="font-bold text-text-main">{p.customerName || customers.find(c => c.id === p.customerId)?.name || 'Unknown'}</div>
                       {(p as any).paymentMethod === 'CHECK' && (
                         <div className="mt-2 inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-purple-100">
                           <CreditCard className="w-3 h-3" />
                           {(p as any).checkNumber} {(p as any).checkOwner && `| ${(p as any).checkOwner}`}
                         </div>
                       )}
                    </td>
                    <td className="p-5">
                       <div className="text-text-secondary text-[11px] font-medium">{new Date(p.date).toLocaleDateString()} • {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                       <div className="text-base font-black text-success tracking-tight">+{formatNumber(p.amount)} {t.currency}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'activity' && (
          <div className="divide-y divide-border-subtle">
            {filteredActivities.map(a => (
              <div key={a.id} className="p-5 hover:bg-bg-base/30 transition-colors flex gap-4 items-start">
                <div className="mt-1 w-8 h-8 rounded-full bg-sidebar flex items-center justify-center shrink-0 border border-border-subtle shadow-sm">
                  {getActivityIcon(a.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="text-[13px] font-bold text-text-main leading-tight">{translateActivityDetails(a.details)}</div>
                    <div className="text-[10px] text-text-secondary font-medium whitespace-nowrap ml-4">
                      {new Date(a.timestamp).toLocaleDateString()} • {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-base border border-border-subtle rounded text-[9px] font-black text-text-secondary uppercase tracking-tighter">
                      <UserCog className="w-2.5 h-2.5" />
                      {a.actorName || 'System'}
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                      a.action === 'create' ? "bg-success/10 text-success" : 
                      a.action === 'update' ? "bg-accent/10 text-accent" : 
                      a.action === 'delete' ? "bg-danger/10 text-danger" : "bg-sidebar text-text-secondary"
                    )}>
                      {a.action}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {subView === 'activity' && activitiesTotal > 50 && (
          <div className="flex items-center justify-between p-5 border-t border-border-subtle bg-sidebar/30">
            <div className="text-xs font-black text-text-secondary uppercase tracking-widest">
              {language === 'ar' ? `صفحة ${activitiesPage} من ${Math.ceil(activitiesTotal / 50)}` : `Page ${activitiesPage} of ${Math.ceil(activitiesTotal / 50)}`}
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={activitiesPage === 1}
                onClick={() => fetchActivitiesPage(activitiesPage - 1)}
                className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <button 
                disabled={activitiesPage >= Math.ceil(activitiesTotal / 50)}
                onClick={() => fetchActivitiesPage(activitiesPage + 1)}
                className="px-4 py-2 bg-white border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-colors"
              >
                {language === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {((subView === 'sales' && filteredSales.length === 0) || 
          (subView === 'payments' && filteredPayments.length === 0) || 
          (subView === 'activity' && filteredActivities.length === 0)) && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Archive className="w-12 h-12 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">{language === 'ar' ? "لا توجد سجلات" : t.historyEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: Staff Management ---
// --- Component: Settings & User Management ---
