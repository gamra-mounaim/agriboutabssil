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

export default function CustomerList() {
  const { products, customers, sales, payments, settings, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();

  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'list' | 'checks'>('list');
  const [name, setName] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ type: 'pay' | 'charge', customer: Customer } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustMethod, setAdjustMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [checkNum, setCheckNum] = useState('');
  const [check_ownerModal, setcheck_ownerModal] = useState('');
  const [checkBankModal, setCheckBankModal] = useState('');
  const [dueDateModal, setDueDateModal] = useState('');
  
  // Product Return States
  const [returnModal, setReturnModal] = useState<{ customer: Customer } | null>(null);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState('');
  const [returnPrice, setReturnPrice] = useState('');
  const [returnAction, setReturnAction] = useState<'debt' | 'cash'>('debt');
  const [returnDescription, setReturnDescription] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', due_date: '' });
  const [selectedSaleToShow, setSelectedSaleToShow] = useState<Sale | null>(null);

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addCustomer({ 
        name: name.trim(), 
        debt: parseFloat(initialDebt) || 0,
        phone: phone.trim(),
        address: address.trim(),
        due_date: dueDate || null
      });
      setName('');
      setInitialDebt('0');
      setPhone('');
      setAddress('');
      setDueDate('');
      onRefresh();
      setMessage({ text: t.customerAdded, type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: t.customerAddFailed, type: 'error' });
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
          check_due_date: adjustMethod === 'CHECK' ? dueDateModal : null,
          check_owner: adjustMethod === 'CHECK' ? (checkBankModal && checkBankModal !== 'بنك آخر...' ? `${checkBankModal} | ${check_ownerModal}` : check_ownerModal) : null
        };
        await api.addPayment(adjustModal.customer.id, paymentData);
        setMessage({ text: t.paymentPosted, type: 'success' });
      } else {
        await api.addCharge(adjustModal.customer.id, amt, '');
        setMessage({ text: t.chargeAdded, type: 'success' });
      }
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustMethod('CASH');
      setCheckNum('');
      setcheck_ownerModal('');
      setCheckBankModal('');
      setDueDateModal('');
      onRefresh();
      if (selectedCustomer?.id === adjustModal.customer.id) {
        loadHistory(selectedCustomer.id);
      }
    } catch (err) {
      setMessage({ text: t.operationFailed, type: 'error' });
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModal || !returnProductId || !returnQty || !returnPrice) return;
    const qtyVal = parseInt(returnQty);
    const priceVal = parseFloat(returnPrice);
    if (isNaN(qtyVal) || qtyVal <= 0 || isNaN(priceVal) || priceVal < 0) return;

    try {
      await api.returnProduct(returnModal.customer.id, {
        productId: returnProductId,
        qty: qtyVal,
        price: priceVal,
        action: returnAction,
        description: returnDescription.trim()
      });
      
      setMessage({ text: t.returnSuccess || "Return recorded successfully.", type: 'success' });
      setReturnModal(null);
      setReturnProductId('');
      setReturnQty('');
      setReturnPrice('');
      setReturnAction('debt');
      setReturnDescription('');
      
      onRefresh();
      
      // Refresh current customer history and profile so UI stays in sync
      if (selectedCustomer?.id === returnModal.customer.id) {
        const totalVal = qtyVal * priceVal;
        if (returnAction === 'debt') {
          setSelectedCustomer({
            ...selectedCustomer,
            debt: Math.max(0, selectedCustomer.debt - totalVal)
          });
        }
        loadHistory(selectedCustomer.id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: t.returnFailed, type: 'error' });
    }
  };

  const loadHistory = async (customerId: string) => {
    setLoadingHistory(true);
    try {
      const history = await api.getCustomerHistory(customerId);
      setCustomerHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.updateCustomer(selectedCustomer.id, {
        ...editForm,
        debt: selectedCustomer.debt
      });
      setIsEditingProfile(false);
      onRefresh();
      setSelectedCustomer({ 
        ...selectedCustomer, 
        ...editForm, 
        dueDate: editForm.due_date 
      });
      setMessage({ text: t.profileUpdated, type: 'success' });
    } catch (err) {
      setMessage({ text: t.updateFailed, type: 'error' });
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      loadHistory(selectedCustomer.id);
      setEditForm({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone || '',
        address: selectedCustomer.address || '',
        due_date: selectedCustomer.dueDate || selectedCustomer.due_date || ''
      });
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (returnModal && returnModal.customer.id === 'walking') {
      setReturnAction('cash');
    }
  }, [returnModal]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) || 
    (c.phone && c.phone.includes(searchCustomer))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Users className="w-6 h-6 text-accent" />
            </div>
            {t.customers}
          </h2>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] opacity-60 ml-12">MANAGE_YOUR_ACCOUNTS</p>
        </div>
        
        <div className="flex bg-bg-base p-1 rounded-2xl border border-border-subtle shadow-sm">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'list' ? "bg-white text-accent shadow-md shadow-accent/5 ring-1 ring-accent/10" : "text-text-secondary hover:text-text-main")}
          >
            {t.customers}
          </button>
          <button 
            onClick={() => setActiveTab('checks')}
            className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'checks' ? "bg-white text-accent shadow-md shadow-accent/5 ring-1 ring-accent/10" : "text-text-secondary hover:text-text-main")}
          >
            {t.checks}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          <section className="bg-card border border-border-subtle p-8 rounded-[2rem] shadow-xl shadow-accent/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-accent/10 transition-colors" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-secondary mb-8 flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              {t.addCustomer}
            </h3>
            <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.dueDate || (language === 'ar' ? 'تاريخ الاستحقاق' : 'Date d\'échéance')}</label>
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
            </form>
          </section>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5 group-focus-within:text-accent transition-colors", language === 'ar' ? "right-6" : "left-6")} />
              <input 
                placeholder={t.customers} 
                className={cn("w-full bg-white border border-border-subtle rounded-[2rem] py-5 shadow-sm text-sm font-bold focus:border-accent outline-none transition-all", language === 'ar' ? "pr-16 pl-6 text-right" : "pl-16 pr-6")}
                value={searchCustomer || ''} onChange={e => setSearchCustomer(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setReturnModal({ customer: { id: 'walking', name: t.walkingCustomer || 'Client de passage', debt: 0, email: '', phone: '', address: '' } })} 
              className="h-full bg-accent text-white py-5 px-8 rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent/20 hover:opacity-90 transition-all shrink-0 active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {t.walkingCustomerReturn}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map(c => (
              <div key={c.id} className="bg-card border border-border-subtle p-8 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative border-b-4 border-b-border-subtle/20 hover:border-b-accent/40">
                <div className="flex justify-between items-start mb-6">
                   <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                      <h4 className="font-black text-lg text-text-main group-hover:text-accent transition-colors tracking-tight">{c.name}</h4>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1 opacity-60">
                        <Hash className="w-3 h-3" />
                        {c.id.slice(0, 8)}
                      </p>
                   </div>
                   <div className="bg-bg-base w-12 h-12 rounded-2xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner border border-border-subtle/50">
                      <User className="w-6 h-6" />
                   </div>
                </div>
                
                <div className={cn("p-6 rounded-[1.5rem] mb-6 relative overflow-hidden", c.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
                   <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-8 translate-x-8", c.debt > 0 ? "bg-danger/10" : "bg-success/10")} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-60">{t.debt}</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                      <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                   {c.debt > 0 && (c.dueDate || c.due_date) && (
                     <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                       <CalendarClock className={cn("w-3.5 h-3.5", new Date((c.dueDate || c.due_date)) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                       <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date((c.dueDate || c.due_date)) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                         {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.dueDate || c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                       </span>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setAdjustModal({ type: 'pay', customer: c })} className="bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95 transition-all hover:bg-accent/90">
                    {t.payDebt}
                  </button>
                  <button onClick={() => setAdjustModal({ type: 'charge', customer: c })} className="bg-white border-2 border-border-subtle text-text-main py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all">
                    {t.newCharge}
                  </button>
                </div>
                <button onClick={() => setSelectedCustomer(c)} className="w-full mt-4 py-2 text-[9px] font-black text-text-secondary hover:text-accent uppercase tracking-[0.3em] transition-colors border-t border-border-subtle/40 pt-4">{t.view} {t.customerDetails}</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {payments.filter(p => p.payment_method === 'CHECK').length > 0 ? (
              payments.filter(p => p.payment_method === 'CHECK').map(p => (
                <div key={p.id} className="bg-white border-2 border-border-subtle rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-accent/40 transition-all shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                      <div className="text-sm font-black text-text-main group-hover:text-accent transition-colors">{p.customerName}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> #{p.check_number}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.check_owner}</span>
                        <span className={cn("flex items-center gap-1", p.check_due_date && new Date(p.check_due_date) < new Date() ? "text-danger" : "text-amber-600")}>
                          <CalendarClock className="w-3 h-3" /> {p.check_due_date ? new Date(p.check_due_date).toLocaleDateString() : '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xl font-black text-text-main tracking-tighter">
                      {formatNumber(p.amount)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                    </div>
                    <div className="text-[10px] font-bold text-text-secondary opacity-60">
                      {new Date(p.date).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 border-4 border-dashed border-border-subtle rounded-3xl mx-auto flex items-center justify-center rotate-12">
                   <FolderOpen className="w-8 h-8 -rotate-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.noChecks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-border-subtle flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.customerDetails}</div>
                   {isEditingProfile ? (
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.customerName}</label>
                        <input className="text-2xl font-bold tracking-tight bg-bg-base border border-border-subtle rounded-lg px-3 py-1 w-full outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                     </div>
                   ) : (
                     <h3 className="text-3xl font-bold tracking-tight">{selectedCustomer.name}</h3>
                   )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={cn("p-2 rounded-full transition-colors", isEditingProfile ? "bg-accent/10 text-accent" : "hover:bg-bg-base text-text-secondary")}>
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-auto space-y-8">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.due_date || ''} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-border-subtle">
                       <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-6 py-3 bg-bg-base text-text-secondary font-bold rounded-xl hover:bg-border-subtle transition-all uppercase text-[10px] tracking-widest">{t.cancel}</button>
                       <button type="submit" className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all uppercase text-[10px] tracking-widest">{t.saveChanges}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">{t.totalAccrued}</div>
                        <div className="text-xl font-black font-mono text-text-main">
                          {formatNumber(customerHistory.filter(h => h.type === 'DEBT').reduce((sum, h) => sum + h.amount, 0))} {t.currency}
                        </div>
                      </div>
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">{t.totalPaid}</div>
                        <div className="text-xl font-black font-mono text-success">
                          {formatNumber(customerHistory.filter(h => h.type === 'PAYMENT').reduce((sum, h) => sum + h.amount, 0))} {t.currency}
                        </div>
                      </div>
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-accent font-black uppercase tracking-widest mb-1">{t.remainingBalance}</div>
                        <div className={cn("text-xl font-black font-mono", selectedCustomer.debt > 0 ? "text-danger" : "text-success")}>
                          {formatNumber(selectedCustomer.debt)} {t.currency}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <CalendarClock className="w-3.5 h-3.5 text-accent" /> {t.dueDate}
                        </div>
                        <div className="text-sm font-bold text-text-main">
                          {selectedCustomer.dueDate || selectedCustomer.due_date 
                            ? new Date(selectedCustomer.dueDate || selectedCustomer.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')
                            : '---'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">{t.financialHistory}</h4>
                      </div>
                      
                      {loadingHistory ? (
                        <div className="py-12 text-center text-text-secondary text-xs font-mono animate-pulse tracking-widest">LOADING_TRANSACTIONS...</div>
                      ) : (customerHistory?.length || 0) === 0 ? (
                        <div className="py-20 text-center text-text-secondary text-sm border-2 border-dashed border-border-subtle rounded-3xl opacity-50 flex flex-col items-center gap-4">
                          <Archive className="w-8 h-8 opacity-40" />
                          {t.historyEmpty}
                        </div>
                      ) : (
                        <div className="space-y-3 pr-1 overflow-y-auto max-h-[350px] no-scrollbar">
                           {(customerHistory || []).map((item) => (
                             <div key={item.id} className="group bg-bg-base/40 p-5 rounded-2xl flex justify-between items-center text-sm border border-border-subtle/40 hover:bg-white hover:border-accent/20 transition-all shadow-sm">
                               <div className={cn("flex flex-col gap-0.5", language === 'ar' && "text-right")}>
                                 <div className="text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-60 flex items-center gap-2">
                                   {item.type === 'SALE' && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-[9px]">FACTURE</span>}
                                   {item.description}
                                   {item.payment_method === 'CHECK' && (
                                     <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                       <CreditCard className="w-3 h-3" /> {t.check} #{item.check_number}
                                     </span>
                                   )}
                                 </div>
                                 <div className={cn("text-lg font-black tracking-tighter", item.type === 'PAYMENT' ? "text-success" : "text-danger")}>
                                    {item.type === 'PAYMENT' ? '+' : '-'}{formatNumber(item.amount)} {t.currency}
                                 </div>
                                 <div className="text-[10px] font-bold text-text-secondary/70 mt-1 flex items-center gap-1.5">
                                   <CalendarClock className="w-3 h-3" /> {new Date(item.date).toLocaleString()}
                                 </div>
                               </div>
                               <div className="flex items-center gap-1">
                                 <button 
                                   onClick={async () => {
                                     if (item.type === 'SALE') {
                                       try {
                                         let sale = sales.find((s: any) => s.id === item.id);
                                         if (!sale) {
                                            const allSales = await api.getSales();
                                            sale = allSales.find((s: any) => s.id === item.id);
                                         }

                                         if (sale) {
                                           if (!sale.items || sale.items.length === 0) {
                                             const items = await api.getSaleItems(sale.id);
                                             sale = { ...sale, items };
                                           }
                                           setSelectedSaleToShow(sale);
                                         }
                                       } catch (e) {
                                         console.error("View error:", e);
                                       }
                                     } 
                                   }}
                                   className={cn("p-2 hover:bg-white rounded-lg transition-colors group/view border border-transparent hover:border-border-subtle", item.type !== 'SALE' && "hidden")}
                                   title={t.view}
                                 >
                                   <Eye className="w-4 h-4 text-text-secondary group-hover/view:text-accent" />
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     if (item.type === 'SALE') {
                                       try {
                                         let sale = sales.find((s: any) => s.id === item.id);
                                         if (!sale) {
                                            const allSales = await api.getSales();
                                            sale = allSales.find((s: any) => s.id === item.id);
                                         }
                                         
                                         if (sale) {
                                           if (!sale.items || sale.items.length === 0) {
                                             const items = await api.getSaleItems(sale.id);
                                             sale = { ...sale, items };
                                           }
                                           generateInvoicePDF({
                                             saleId: sale.id,
                                             invoiceNumber: sale.invoiceNumber,
                                             date: sale.date,
                                             items: (sale.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                                             total: sale.total,
                                             clientName: selectedCustomer?.name
                                           }, language, settings);
                                         }
                                       } catch (e) {
                                         console.error("Print error:", e);
                                       }
                                     } else {
                                       generateTransactionReceiptPDF({
                                         customerName: selectedCustomer.name,
                                         type: item.type,
                                         amount: item.amount,
                                         date: item.date,
                                         description: item.description,
                                         saleId: item.id
                                       }, language, settings);
                                     }
                                   }}
                                   className="p-2 hover:bg-white rounded-lg transition-colors group/print border border-transparent hover:border-border-subtle"
                                 >
                                   <Printer className="w-4 h-4 text-text-secondary group-hover/print:text-accent" />
                                 </button>
                               </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 bg-[#fafafa] border-t border-border-subtle flex flex-col gap-4">
                <div className="flex gap-3">
                  <button onClick={() => generateStatementPDF({ entityName: selectedCustomer.name, remainingDebt: selectedCustomer.debt, transactions: customerHistory, type: 'customer' }, language, settings)} className="flex-1 bg-white border border-border-subtle text-text-main font-bold py-3 rounded-xl hover:bg-bg-base transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
                    <Download className="w-3.5 h-3.5 text-accent" /> {t.generateStatement}
                  </button>
                  <button onClick={() => setReturnModal({ customer: selectedCustomer })} className="flex-1 bg-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> {t.returnProduct}
                  </button>
                  <button onClick={() => setAdjustModal({ type: 'pay', customer: selectedCustomer })} className="flex-1 bg-success text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
                    {t.payDebt}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSaleToShow && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-base/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Hash className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main">{(t as any).saleDetails}</h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.invoice} #{selectedSaleToShow.invoiceNumber}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSaleToShow(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-4">
                  {(selectedSaleToShow.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-bg-base rounded-xl border border-border-subtle/50">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-text-main">{it.name}</p>
                        <p className="text-xs font-medium text-text-secondary">{it.qty} x {formatNumber(it.price)} {t.currency}</p>
                      </div>
                      <div className="text-sm font-black text-text-main">
                        {formatNumber((it.qty * it.price))} {t.currency}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border-subtle space-y-2">
                  <div className="flex justify-between items-center px-2">
                     <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t.total}</span>
                     <span className="text-2xl font-black text-accent tracking-tighter">{formatNumber(selectedSaleToShow.total)} {t.currency}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-bg-base border-t border-border-subtle flex gap-3">
                <button 
                  onClick={() => {
                    generateInvoicePDF({
                      saleId: selectedSaleToShow.id,
                      invoiceNumber: selectedSaleToShow.invoiceNumber,
                      date: selectedSaleToShow.date,
                      items: (selectedSaleToShow.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                      total: selectedSaleToShow.total,
                      subtotal: selectedSaleToShow.subtotal,
                      discount: selectedSaleToShow.discount,
                      clientName: selectedCustomer?.name
                    }, language, settings);
                  }}
                  className="flex-1 bg-accent text-white font-black py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> {t.invoice}
                </button>
                <button onClick={() => setSelectedSaleToShow(null)} className="flex-1 bg-white border border-border-subtle text-text-secondary font-black py-3 rounded-xl hover:bg-bg-base transition-all text-xs uppercase tracking-widest">
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Debt Adjustment Modal */}
      <AnimatePresence>
        {adjustModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl border border-border-subtle p-8">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-full bg-accent/5 text-accent mb-4">
                  {adjustModal.type === 'pay' ? <ArrowRightLeft className="w-8 h-8 rotate-90" /> : <Plus className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">{adjustModal.type === 'pay' ? t.postPayment : t.newCharge}</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">{adjustModal.customer.name}</p>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.amount}</label>
                  <input autoFocus type="number" step="0.01" className="w-full bg-white border-2 border-border-subtle rounded-2xl py-4 px-6 text-2xl font-black focus:border-accent outline-none shadow-sm transition-all" value={adjustAmount || ''} onChange={e => setAdjustAmount(e.target.value)} />
                </div>
                {adjustModal.type === 'pay' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">{t.paymentMethod}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setAdjustMethod('CASH')} className={cn("py-3 rounded-xl text-xs font-black border-2 transition-all", adjustMethod === 'CASH' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}>{t.cash}</button>
                      <button type="button" onClick={() => setAdjustMethod('CHECK')} className={cn("py-3 rounded-xl text-xs font-black border-2 transition-all", adjustMethod === 'CHECK' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}>{t.check}</button>
                    </div>
                  </div>
                )}
                {adjustMethod === 'CHECK' && adjustModal.type === 'pay' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={checkBankModal || ''} onChange={e => setCheckBankModal(e.target.value)}>
                      <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                      {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input placeholder={t.checkNumber} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={checkNum || ''} onChange={e => setCheckNum(e.target.value)} />
                    <input placeholder={t.checkOwner} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={check_ownerModal || ''} onChange={e => setcheck_ownerModal(e.target.value)} />
                    <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={dueDateModal || ''} onChange={e => setDueDateModal(e.target.value)} />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 py-4 bg-bg-base text-text-secondary font-black rounded-2xl hover:bg-border-subtle transition-all text-[10px] uppercase tracking-widest">{t.cancel || 'Cancel'}</button>
                  <button type="submit" className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all text-[10px] uppercase tracking-widest">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Return Modal */}
      <AnimatePresence>
        {returnModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl border border-border-subtle p-8 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-accent/5 text-accent mb-4">
                  <ArrowRightLeft className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">{t.returnProduct}</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">{returnModal.customer.name}</p>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-4">
                {/* Product Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.selectProduct}</label>
                  <select 
                    required
                    className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                    value={returnProductId} 
                    onChange={e => {
                      const pId = e.target.value;
                      setReturnProductId(pId);
                      const found = products.find(p => p.id === pId);
                      if (found) {
                        setReturnPrice(found.price.toString());
                      } else {
                        setReturnPrice('');
                      }
                    }}
                  >
                    <option value="">-- {t.selectProduct} --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} {t.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnQty || 'Quantity'}</label>
                    <input 
                      required 
                      type="number" 
                      min="1"
                      className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                      value={returnQty} 
                      onChange={e => setReturnQty(e.target.value)} 
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnPrice || 'Unit Price'}</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                      value={returnPrice} 
                      onChange={e => setReturnPrice(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Return Action / Settlement */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnAction || 'Settlement'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      disabled={returnModal.customer.id === 'walking'}
                      onClick={() => setReturnAction('debt')} 
                      className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all", 
                        returnModal.customer.id === 'walking' ? "bg-bg-base text-text-secondary/30 border-border-subtle cursor-not-allowed opacity-50" :
                        returnAction === 'debt' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle"
                      )}
                    >
                      {t.deductFromDebt}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReturnAction('cash')} 
                      className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all", returnAction === 'cash' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}
                    >
                      {t.refundInCash}
                    </button>
                  </div>
                </div>

                {/* Description / Custom Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.note}</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all resize-none"
                    placeholder="Ex: PVC pipe return..."
                    value={returnDescription} 
                    onChange={e => setReturnDescription(e.target.value)} 
                  />
                </div>

                {/* Total Preview */}
                {returnQty && returnPrice && (
                  <div className="bg-bg-base p-4 rounded-2xl border border-border-subtle flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                    <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">{t.total}:</span>
                    <span className="text-lg font-black text-accent">
                      {formatNumber((parseInt(returnQty) * parseFloat(returnPrice)))} {t.currency}
                    </span>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => {
                    setReturnModal(null);
                    setReturnProductId('');
                    setReturnQty('');
                    setReturnPrice('');
                    setReturnAction('debt');
                    setReturnDescription('');
                  }} className="flex-1 py-4 bg-bg-base text-text-secondary font-black rounded-2xl hover:bg-border-subtle transition-all text-[10px] uppercase tracking-widest">{t.cancel}</button>
                  <button type="submit" className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all text-[10px] uppercase tracking-widest">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// --- View: History ---
