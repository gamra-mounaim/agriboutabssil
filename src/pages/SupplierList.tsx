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

export default function SupplierList({ permissions }: { permissions: any }) {
  const { suppliers, checks, settings, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();

  const t = translations[language];
  const canViewDebtAmount = permissions ? permissions.viewSupplierDebtAmount !== false : true;
  const [activeTab, setActiveTab] = useState<'suppliers' | 'checks'>('suppliers');
  const [name, setName] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
  const [supplierDueDate, setSupplierDueDate] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierHistory, setSupplierHistory] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ type: 'pay' | 'charge', supplier: Supplier } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustMethod, setAdjustMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [checkNum, setCheckNum] = useState('');
  const [checkOwner, setCheckOwner] = useState('');
  const [checkBankSupplier, setCheckBankSupplier] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', due_date: '' });

  const supplierChecks = checks.filter(c => c.partyRole === 'supplier');

  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
            await api.addSupplier({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        address: address.trim(),
        debt: parseFloat(initialDebt) || 0,
        due_date: supplierDueDate || null
      });
      setName('');
      setInitialDebt('0');
      setEmail('');
      setPhone('');
      setAddress('');
      setSupplierDueDate('');
      onRefresh();
      setMessage({ text: language === 'ar' ? "تمت إضافة المورد بنجاح." : "Supplier added successfully.", type: 'success' });
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل إضافة المورد." : "Failed to add supplier.", type: 'error' });
      console.error(err);
    }
  };

  const openDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
        setEditForm({ 
      name: supplier.name, 
      email: supplier.email || '', 
      phone: supplier.phone || '', 
      address: supplier.address || '',
      due_date: supplier.dueDate || supplier.due_date || ''
    });
    setIsEditingProfile(false);
    setLoadingHistory(true);
    try {
      const history = await api.getSupplierHistory(supplier.id);
      setSupplierHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustAmount) return;
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      if (adjustModal.type === 'pay') {
        const paymentData = {
          amount: amt,
          payment_method: adjustMethod,
          check_number: adjustMethod === 'CHECK' ? checkNum : null,
          check_due_date: adjustMethod === 'CHECK' ? dueDate : null,
          check_owner: adjustMethod === 'CHECK' ? (checkBankSupplier && checkBankSupplier !== 'بنك آخر...' ? `${checkBankSupplier} | ${checkOwner}` : checkOwner) : null
        };
        await api.addSupplierPayment(adjustModal.supplier.id, paymentData);
        setMessage({ text: language === 'ar' ? "تم تسجيل الدفع للمورد." : "Payment to supplier posted successfully.", type: 'success' });
      } else {
        await api.addSupplierCharge(adjustModal.supplier.id, amt, adjustNote);
        setMessage({ text: language === 'ar' ? "تمت إضافة الدين." : "Supplier debt updated successfully.", type: 'success' });
      }
      
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustMethod('CASH');
      setCheckNum('');
      setCheckOwner('');
      setCheckBankSupplier('');
      setDueDate('');
      setAdjustNote('');
      onRefresh();
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشلت العملية." : "Operation failed.", type: 'error' });
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await api.updateSupplier(selectedSupplier.id, {
        ...editForm,
        debt: selectedSupplier.debt
      });
      setIsEditingProfile(false);
      onRefresh();
      setSelectedSupplier({ ...selectedSupplier, ...editForm });
      setMessage({ text: t.profileUpdated, type: 'success' });
    } catch (err) {
      setMessage({ text: t.updateFailed, type: 'error' });
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchSupplier.toLowerCase()) || 
    (s.phone && s.phone.includes(searchSupplier))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-20">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle pb-4">
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all uppercase",
            activeTab === 'suppliers' ? "bg-sidebar text-white shadow-lg" : "text-text-secondary hover:bg-bg-base"
          )}
        >
          {t.suppliers}
        </button>
        <button 
          onClick={() => setActiveTab('checks')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all uppercase flex items-center gap-2",
            activeTab === 'checks' ? "bg-sidebar text-white shadow-lg" : "text-text-secondary hover:bg-bg-base"
          )}
        >
          <CreditCard className="w-4 h-4" />
          {t.supplierChecks}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <>
          <section className="bg-card border border-border-subtle p-8 rounded-xl shadow-md">
        <h3 className="section-title text-sm font-bold mb-6 flex items-center justify-between">
          <span className="uppercase tracking-widest text-text-secondary">{t.addSupplier}</span>
          <Store className="w-4 h-4 text-accent" />
        </h3>
        <form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        </form>
      </section>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-bg-base/30 p-2 rounded-2xl border border-border-subtle/40 backdrop-blur-md">
        <div className="relative flex-1 group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 group-focus-within:text-accent transition-colors", language === 'ar' ? "right-4" : "left-4")} />
          <input 
            placeholder={t.suppliers} 
            className={cn("w-full bg-white/50 border border-border-subtle rounded-xl py-3 text-sm font-bold focus:border-accent outline-none", language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4")}
            value={searchSupplier || ''} onChange={e => setSearchSupplier(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(s => (
          <div key={s.id} className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
               <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                  <h4 className="font-bold text-md text-text-main group-hover:text-accent transition-colors">{s.name}</h4>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{s.phone || 'NO PHONE'}</p>
               </div>
               <div className="bg-bg-base p-2 rounded-xl text-text-secondary">
                  <Store className="w-4 h-4" />
               </div>
            </div>
            
            <div className={cn("p-4 rounded-xl mb-6", s.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">{t.youOweSupplier}</p>
               <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-black tracking-tighter", s.debt > 0 ? "text-danger" : "text-emerald-600")}>
                    {canViewDebtAmount ? formatNumber(s.debt) : '***'}
                  </span>
                  <span className="text-[10px] font-bold text-text-secondary">{t.currency}</span>
               </div>
            </div>

            {canViewDebtAmount && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAdjustModal({ type: 'pay', supplier: s })} className="bg-accent text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-accent/10 active:scale-95 transition-all">
                  {t.paySupplier}
                </button>
                <button onClick={() => setAdjustModal({ type: 'charge', supplier: s })} className="bg-white border border-border-subtle text-text-main py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-accent transition-all">
                  {t.newSupplierCharge.toUpperCase()}
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
               <button onClick={() => openDetails(s)} className="flex-1 py-1.5 text-[9px] font-bold text-text-secondary hover:text-accent uppercase tracking-[0.2em]">{t.view} {t.supplierDetails}</button>
               {canViewDebtAmount && (
                 <button 
                   onClick={async () => {
                     const history = await api.getSupplierHistory(s.id);
                     generateStatementPDF({
                       entityName: s.name,
                       remainingDebt: s.debt,
                       transactions: history,
                       type: 'supplier'
                     }, language, settings);
                   }}
                   className="flex-1 py-1.5 text-[9px] font-bold text-accent hover:underline uppercase tracking-[0.2em] flex items-center justify-center gap-1"
                 >
                   <Printer className="w-3 h-3" />
                   {language === 'ar' ? "كشف سريع" : "QUICK PDF"}
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>
        </>
      ) : (
        <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fafafa] border-b border-border-subtle">
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.date}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.supplierName}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.checkNumber}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.amount}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.checkOwner}</th>
              </tr>
            </thead>
            <tbody>
              {supplierChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-text-secondary italic">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    {t.noChecks}
                  </td>
                </tr>
              ) : (
                supplierChecks.map(c => (
                  <tr key={c.id} className="border-b border-border-subtle hover:bg-bg-base transition-colors group">
                    <td className="p-5 text-sm font-medium">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="p-5 text-sm font-black text-text-main group-hover:text-accent">{c.partyName}</td>
                    <td className="p-5 text-sm font-mono flex items-center gap-2">
                       <Hash className="w-3.5 h-3.5 opacity-40" />
                       {c.checkNumber}
                    </td>
                    <td className="p-5 text-sm font-black text-success">{formatNumber(c.total)} DH</td>
                    <td className="p-5 text-[11px] font-bold text-text-secondary uppercase">{c.checkOwner || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedSupplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-border-subtle flex justify-between items-start">
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
                                  <CreditCard className="w-3 h-3" /> {t.check} #{h.check_number} {h.check_owner && `(${h.check_owner})`}
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
                            {h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? formatNumber(h.amount) : '***'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {adjustModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm uppercase">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-8 border border-border-subtle">
              <h3 className="text-xl font-black tracking-tight mb-8">
                {adjustModal.type === 'pay' ? t.paySupplier : t.newSupplierCharge}
              </h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.amount}</label>
                  <input autoFocus type="number" step="any" required value={adjustAmount || ''} onChange={e => setAdjustAmount(e.target.value)} placeholder="0.00" className="w-full bg-bg-base border border-border-subtle rounded-xl py-4 px-6 text-2xl font-black focus:border-accent outline-none" />
                </div>

                {adjustModal.type === 'pay' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.paymentMethod}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => setAdjustMethod('CASH')}
                          className={cn("py-3 rounded-xl text-xs font-bold border transition-all", adjustMethod === 'CASH' ? "bg-accent text-white border-accent" : "bg-bg-base text-text-secondary border-border-subtle")}
                        >
                          {t.cash}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setAdjustMethod('CHECK')}
                          className={cn("py-3 rounded-xl text-xs font-bold border transition-all", adjustMethod === 'CHECK' ? "bg-accent text-white border-accent" : "bg-bg-base text-text-secondary border-border-subtle")}
                        >
                          {t.check}
                        </button>
                      </div>
                    </div>

                    {adjustMethod === 'CHECK' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{language === 'ar' ? 'البنك' : 'Bank'}</label>
                          <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" value={checkBankSupplier || ''} onChange={e => setCheckBankSupplier(e.target.value)}>
                            <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                            {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.checkOwner}</label>
                          <input required value={checkOwner || ''} onChange={e => setCheckOwner(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.checkNumber}</label>
                            <input required value={checkNum || ''} onChange={e => setCheckNum(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.dueDate}</label>
                            <input type="date" required value={dueDate || ''} onChange={e => setDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {adjustModal.type === 'charge' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.note}</label>
                    <input value={adjustNote || ''} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Purchase of 50 iPhones" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-6 text-sm font-bold focus:border-accent outline-none" />
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 bg-white border border-border-subtle text-text-secondary py-4 rounded-2xl font-black text-xs tracking-widest active:scale-95 transition-all">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

