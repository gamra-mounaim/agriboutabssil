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
const { Search, Zap, Archive, ArrowRightLeft, Hash, User, CalendarClock, FolderOpen, Eye, CheckCircle, Sparkles, UserCog, Store, ChevronRight, ShieldAlert, Cloud, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image: ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe, Receipt, Copy, Check, MessageSquare, ArrowRight, ArrowDownLeft, Tag } = LucideIcons;

export default function CustomerList() {
  const { products, customers, sales, payments, checks, settings, appUsers, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();

  const profile = appUsers?.find((u: any) => u.id === (user?.id || (user as any)?.uid));
  const canViewProfits = profile?.role === 'admin' || profile?.role === 'manager' || profile?.permissions?.profits !== false;

  useEffect(() => {
    onRefresh();
  }, []);

  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'list' | 'checks'>('list');
  const [name, setName] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const currentSelectedCustomer = customers.find(c => c.id === selectedCustomer?.id) || selectedCustomer;
  const [customerHistory, setCustomerHistory] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SALE' | 'PAYMENT'>('ALL');
  const [copiedPhone, setCopiedPhone] = useState(false);
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
  const [returnProductSearch, setReturnProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [returnQty, setReturnQty] = useState('');
  const [returnPrice, setReturnPrice] = useState('');
  const [returnAction, setReturnAction] = useState<'debt' | 'cash'>('debt');
  const [returnDescription, setReturnDescription] = useState('');

  // FLAH 10% and Purchased Products states for Return Modal
  const [isReturnFlahActive, setIsReturnFlahActive] = useState(false);
  const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
  const [loadingPurchasedProducts, setLoadingPurchasedProducts] = useState(false);
  const [showAllProductsInReturn, setShowAllProductsInReturn] = useState(false);

  const openReturnModal = async (customer: Customer) => {
    setReturnModal({ customer });
    setReturnProductId('');
    setReturnProductSearch('');
    setIsProductDropdownOpen(false);
    setReturnQty('');
    setReturnPrice('');
    setReturnAction(customer.id === 'walking' ? 'cash' : 'debt');
    setReturnDescription('');
    setIsReturnFlahActive(false);
    setShowAllProductsInReturn(false);

    setLoadingPurchasedProducts(true);
    try {
      const res = await api.getCustomerPurchasedProducts(customer.id);
      setPurchasedProducts(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching purchased products:', err);
      setPurchasedProducts([]);
    } finally {
      setLoadingPurchasedProducts(false);
    }
  };

  const availableReturnProducts = useMemo(() => {
    if (showAllProductsInReturn) {
      return products;
    }
    if (purchasedProducts && purchasedProducts.length > 0) {
      return purchasedProducts;
    }
    return products;
  }, [showAllProductsInReturn, purchasedProducts, products]);

  const toggleReturnFlah = () => {
    const newActive = !isReturnFlahActive;
    setIsReturnFlahActive(newActive);

    if (returnProductId) {
      const prod = products.find(p => p.id === returnProductId) || purchasedProducts.find((p: any) => p.id === returnProductId);
      if (prod) {
        const basePrice = Number(prod.price) || 0;
        if (newActive) {
          const flahPrice = Math.round(basePrice * 1.1 * 100) / 100;
          setReturnPrice(flahPrice.toString());
        } else {
          setReturnPrice(basePrice.toString());
        }
      }
    }
  };

  const handleSelectReturnProduct = (prod: any) => {
    setReturnProductId(prod.id);
    const basePrice = Number(prod.price) || 0;
    
    let priceToSet = basePrice;
    if (isReturnFlahActive) {
      priceToSet = Math.round(basePrice * 1.1 * 100) / 100;
    } else if (prod.lastSoldPrice && Math.abs((Number(prod.lastSoldPrice) / basePrice) - 1.1) < 0.03) {
      priceToSet = Number(prod.lastSoldPrice);
      setIsReturnFlahActive(true);
    } else if (prod.lastSoldPrice) {
      priceToSet = Number(prod.lastSoldPrice);
    }
    
    setReturnPrice(priceToSet.toString());
    setIsProductDropdownOpen(false);
  };

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
        description: returnDescription.trim(),
        actor: user?.username || 'System'
      });
      
      setMessage({ text: t.returnSuccess || "Return recorded successfully.", type: 'success' });
      setReturnModal(null);
      setReturnProductId('');
      setReturnProductSearch('');
      setIsProductDropdownOpen(false);
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
    if (!returnModal) {
      setReturnProductSearch('');
      setIsProductDropdownOpen(false);
    }
  }, [returnModal]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) || 
    (c.phone && c.phone.includes(searchCustomer))
  ).sort((a, b) => b.debt - a.debt);

  const displayHistory = useMemo(() => {
    if (!customerHistory) return [];
    return customerHistory.filter(item => {
      if (item.type === 'DEBT') {
        const match = item.description.match(/facture #(\d+)/i);
        if (match) {
          const invoiceNum = match[1];
          const matchingSale = customerHistory.find(h => h.type === 'SALE' && h.description.includes('Sale #' + invoiceNum));
          if (matchingSale && matchingSale.amount === item.amount) {
            return false;
          }
        }
      }
      return true;
    });
  }, [customerHistory]);

  const getCustomerInitials = (fullName?: string) => {
    if (!fullName) return 'CL';
    const clean = fullName.trim().replace(/[^a-zA-Z0-9\s\u0600-\u06FF]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const filteredDisplayHistory = useMemo(() => {
    if (!displayHistory) return [];
    if (historyFilter === 'SALE') return displayHistory.filter(item => item.type === 'SALE');
    if (historyFilter === 'PAYMENT') return displayHistory.filter(item => item.type === 'PAYMENT');
    return displayHistory;
  }, [displayHistory, historyFilter]);

  const historyCounts = useMemo(() => {
    if (!displayHistory) return { all: 0, sales: 0, payments: 0 };
    return {
      all: displayHistory.length,
      sales: displayHistory.filter(item => item.type === 'SALE').length,
      payments: displayHistory.filter(item => item.type === 'PAYMENT').length
    };
  }, [displayHistory]);

  const totalAccruedAmount = useMemo(() => {
    return customerHistory.filter(h => h.type === 'DEBT').reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  }, [customerHistory]);

  const totalPaidAmount = useMemo(() => {
    return customerHistory.filter(h => h.type === 'PAYMENT').reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
  }, [customerHistory]);

  const totalDiscountsGiven = useMemo(() => {
    return customerHistory.filter(h => h.type === 'SALE').reduce((sum, h) => sum + (Number(h.discount) || 0), 0);
  }, [customerHistory]);

  const customerDueDateInfo = useMemo(() => {
    if (!selectedCustomer) return null;
    const rawDate = selectedCustomer.dueDate || selectedCustomer.due_date;
    if (!rawDate) return null;
    const due = new Date(rawDate);
    if (isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateClean = new Date(due);
    dueDateClean.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDateClean.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      formatted: due.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      isOverdue: diffDays < 0,
      isToday: diffDays === 0,
      isNear: diffDays > 0 && diffDays <= 7,
      diffDays
    };
  }, [selectedCustomer, language]);

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
              onClick={() => openReturnModal({ id: 'walking', name: t.walkingCustomer || 'Client de passage', debt: 0, email: '', phone: '', address: '' })} 
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
                
                <div className={cn("p-6 rounded-[1.5rem] mb-4 relative overflow-hidden", c.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
                   <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-8 translate-x-8", c.debt > 0 ? "bg-danger/10" : "bg-success/10")} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-60">{t.debt}</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                      <span dir="ltr" className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
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

                {/* Cumulative Profit Badge */}
                {canViewProfits && (
                  <div className="p-4 rounded-[1.25rem] mb-5 bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-teal-50/40 border border-emerald-200/70 relative overflow-hidden transition-all group-hover:border-emerald-300/90 group-hover:shadow-sm">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl -translate-y-8 translate-x-8 pointer-events-none" />
                    
                    <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 shrink-0 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900/80 truncate">
                          {t.totalCustomerProfit}
                        </span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700/70 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
                        {t.profitFromFirstTx}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t border-emerald-200/50 relative z-10">
                      <div className="flex items-baseline gap-1">
                        <span dir="ltr" className={cn("text-2xl font-black tracking-tight font-mono", (c.totalProfit || 0) >= 0 ? "text-emerald-600" : "text-amber-600")}>
                          {(c.totalProfit || 0) > 0 ? `+${formatNumber(c.totalProfit)}` : formatNumber(c.totalProfit || 0)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">{t.currency}</span>
                      </div>
                      {(c.totalSpent || 0) > 0 && (
                        <span className="text-[10px] font-bold text-text-secondary/70">
                          {t.sales}: <span dir="ltr" className="font-mono text-text-main font-black">{formatNumber(c.totalSpent)}</span> {t.currency}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { setAdjustModal({ type: 'pay', customer: c }); setAdjustAmount(''); }} className="bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95 transition-all hover:bg-accent/90">
                    {t.payDebt}
                  </button>
                  <button onClick={() => setAdjustModal({ type: 'charge', customer: c })} className="bg-white border-2 border-border-subtle text-text-main py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all">
                    {t.newCharge}
                  </button>
                </div>
                {c.debt > 0 && (
                  <button 
                    onClick={() => {
                      setAdjustModal({ type: 'pay', customer: c });
                      setAdjustAmount(c.debt.toString());
                    }} 
                    className="w-full bg-success text-white py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-success/20 active:scale-95 transition-all hover:bg-success/90 flex items-center justify-center gap-2"
                  >
                    <span>{t.clearFullDebt}</span>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelectedCustomer(c)} className="w-full mt-4 py-2 text-[9px] font-black text-text-secondary hover:text-accent uppercase tracking-[0.3em] transition-colors border-t border-border-subtle/40 pt-4">{t.view} {t.customerDetails}</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {checks && checks.filter(c => c.partyRole === 'customer').length > 0 ? (
              checks.filter(c => c.partyRole === 'customer').slice(0, 50).map((p: any) => (
                <div key={p.id} className="bg-white border-2 border-border-subtle rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-accent/40 transition-all shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                      <div className="text-sm font-black text-text-main group-hover:text-accent transition-colors">{p.partyName || t.walkingCustomer}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> #{p.checkNumber || '---'}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.checkOwner ? (p.checkOwner.includes('|') ? p.checkOwner.split('|').join(' - ') : p.checkOwner) : '---'}</span>
                        <span className={cn("flex items-center gap-1", p.checkDueDate && new Date(p.checkDueDate) < new Date() ? "text-danger" : "text-amber-600")}>
                          <CalendarClock className="w-3 h-3" /> {p.checkDueDate ? new Date(p.checkDueDate).toLocaleDateString() : '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xl font-black text-text-main tracking-tighter">
                      {formatNumber(p.total)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                    </div>
                    <div className="text-[10px] font-bold text-text-secondary opacity-60">
                      {p.date ? new Date(p.date).toLocaleString() : '---'}
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
        {selectedCustomer && (() => {
          const currentDebt = currentSelectedCustomer?.debt ?? selectedCustomer.debt ?? 0;
          const currentProfit = currentSelectedCustomer?.totalProfit ?? 0;

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 8 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.96, y: 8 }} 
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-card w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-border-subtle flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 dark:border-border-subtle bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0 ring-4 ring-emerald-50 dark:ring-emerald-950/40">
                      {getCustomerInitials(selectedCustomer.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black tracking-widest uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                          {t.customerDetails}
                        </span>
                        {currentDebt > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Solde débiteur : {formatNumber(currentDebt)} {t.currency}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Compte soldé
                          </span>
                        )}
                      </div>
                      {isEditingProfile ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">{t.customerName}</label>
                          <input 
                            className="text-xl font-black bg-bg-base border border-border-subtle rounded-xl px-3 py-1.5 w-full outline-none focus:ring-2 focus:ring-emerald-500" 
                            value={editForm.name || ''} 
                            onChange={e => setEditForm({...editForm, name: e.target.value})} 
                          />
                        </div>
                      ) : (
                        <h3 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight truncate">
                          {selectedCustomer.name}
                        </h3>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => setIsEditingProfile(!isEditingProfile)} 
                      className={cn("p-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-bold", isEditingProfile ? "bg-accent/15 text-accent ring-2 ring-accent/30" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary hover:text-text-main border border-border-subtle")}
                      title={isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedCustomer(null)} 
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-secondary hover:text-text-main transition-colors border border-transparent hover:border-border-subtle"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-5 bg-slate-50/70 dark:bg-slate-800/30 p-6 rounded-2xl border border-border-subtle">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-accent" />
                            {t.phone}
                          </label>
                          <input 
                            className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent" 
                            value={editForm.phone || ''} 
                            onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                            placeholder="06XXXXXXXX"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                            {t.address}
                          </label>
                          <input 
                            className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent" 
                            value={editForm.address || ''} 
                            onChange={e => setEditForm({...editForm, address: e.target.value})} 
                            placeholder="Ex: Douar..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5 text-accent" />
                            {t.dueDate}
                          </label>
                          <input 
                            type="date" 
                            className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent" 
                            value={editForm.due_date || ''} 
                            onChange={e => setEditForm({...editForm, due_date: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-3 border-t border-border-subtle">
                         <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-text-secondary font-bold rounded-xl transition-all uppercase text-xs tracking-wider">{t.cancel}</button>
                         <button type="submit" className="flex-1 px-5 py-2.5 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all uppercase text-xs tracking-wider shadow-md shadow-accent/20 flex items-center justify-center gap-2">
                           <CheckCircle2 className="w-4 h-4" />
                           {t.saveChanges}
                         </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* KPI Cards */}
                      <div className={cn("grid grid-cols-2 gap-3.5", canViewProfits ? "md:grid-cols-4" : "md:grid-cols-3")}>
                        {/* Total Accumulé */}
                        <div className={cn("p-4.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-border-subtle flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs", language === 'ar' && "text-right")}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">{t.totalAccrued}</span>
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Receipt className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-text-main tabular-nums tracking-tight">
                              <span dir="ltr">{formatNumber(totalAccruedAmount)}</span> <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-text-secondary/70 mt-1">
                              {language === 'ar' ? 'إجمالي المشتريات' : 'Total des achats'}
                            </div>
                          </div>
                        </div>

                        {/* Total Payé */}
                        <div className={cn("p-4.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs", language === 'ar' && "text-right")}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">{t.totalPaid}</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                              <span dir="ltr">{formatNumber(totalPaidAmount)}</span> <span className="text-xs font-bold text-emerald-600/70">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700/70 mt-1">
                              {language === 'ar' ? 'المبلغ المؤدى' : 'Encaissé avec succès'}
                            </div>
                          </div>
                        </div>

                        {/* Solde Restant */}
                        <div className={cn(
                          "p-4.5 rounded-2xl border flex flex-col justify-between transition-all shadow-xs",
                          currentDebt > 0 
                            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 hover:border-rose-300" 
                            : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40",
                          language === 'ar' && "text-right"
                        )}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider", currentDebt > 0 ? "text-rose-800 dark:text-rose-300" : "text-emerald-800 dark:text-emerald-300")}>
                              {t.remainingBalance}
                            </span>
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              currentDebt > 0 ? "bg-rose-100/70 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400" : "bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {currentDebt > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          <div>
                            <div className={cn("text-xl sm:text-2xl font-black tabular-nums tracking-tight", currentDebt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                              <span dir="ltr">{formatNumber(currentDebt)}</span> <span className="text-xs font-bold opacity-80">{t.currency}</span>
                            </div>
                            <div className={cn("text-[10px] font-semibold mt-1", currentDebt > 0 ? "text-rose-700/70" : "text-emerald-700/70")}>
                              {currentDebt > 0 ? (language === 'ar' ? 'مبلغ الدين المتبقي' : 'Reste à recouvrer') : (language === 'ar' ? 'لا يوجد أي دين' : 'Aucun impayé')}
                            </div>
                          </div>
                        </div>

                        {/* Bénéfice Total */}
                        {canViewProfits && (
                          <div className={cn("p-4.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 flex flex-col justify-between hover:border-teal-300 transition-all shadow-xs", language === 'ar' && "text-right")}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">{t.totalCustomerProfit}</span>
                              <div className="w-7 h-7 rounded-lg bg-teal-100/70 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div>
                              <div className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-400 tabular-nums tracking-tight">
                                <span dir="ltr">{currentProfit > 0 ? `+${formatNumber(currentProfit)}` : formatNumber(currentProfit)}</span> <span className="text-xs font-bold text-teal-700/70">{t.currency}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] font-semibold text-teal-700/80 mt-1 gap-1 flex-wrap">
                                <span>{t.profitFromFirstTx}</span>
                                {totalDiscountsGiven > 0 && (
                                  <span dir="ltr" className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1 rounded">
                                    -{formatNumber(totalDiscountsGiven)} {t.currency}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact & Info Strip */}
                      <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-border-subtle rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Téléphone */}
                        <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                          <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.phone}</div>
                            {selectedCustomer.phone ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <a href={`tel:${selectedCustomer.phone}`} className="text-sm font-black text-text-main hover:text-accent transition-colors font-mono tracking-tight">
                                  {selectedCustomer.phone}
                                </a>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (selectedCustomer.phone) {
                                      navigator.clipboard.writeText(selectedCustomer.phone);
                                      setCopiedPhone(true);
                                      setTimeout(() => setCopiedPhone(false), 1800);
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md text-text-secondary hover:text-text-main transition-colors"
                                  title={copiedPhone ? "Copié !" : "Copier le numéro"}
                                >
                                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <a 
                                  href={`https://wa.me/212${selectedCustomer.phone.replace(/\D/g, '').replace(/^0/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded-md text-emerald-600 transition-colors"
                                  title="Contacter sur WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <div className="text-sm font-semibold text-text-secondary/60">---</div>
                            )}
                          </div>
                        </div>

                        {/* Adresse */}
                        <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.address}</div>
                            <div className="text-sm font-black text-text-main truncate" title={selectedCustomer.address || ''}>
                              {selectedCustomer.address || '---'}
                            </div>
                          </div>
                        </div>

                        {/* Date d'échéance */}
                        <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            customerDueDateInfo?.isOverdue ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600" : "bg-amber-50 dark:bg-amber-950/60 text-amber-600"
                          )}>
                            <CalendarClock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.dueDate}</div>
                            {customerDueDateInfo ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-text-main">{customerDueDateInfo.formatted}</span>
                                {customerDueDateInfo.isOverdue && (
                                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-full">
                                    {language === 'ar' ? `متأخر بـ ${Math.abs(customerDueDateInfo.diffDays)} يوم` : `En retard (${Math.abs(customerDueDateInfo.diffDays)}j)`}
                                  </span>
                                )}
                                {customerDueDateInfo.isToday && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                    {language === 'ar' ? 'اليوم' : "Aujourd'hui"}
                                  </span>
                                )}
                                {customerDueDateInfo.isNear && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                    {language === 'ar' ? `خلال ${customerDueDateInfo.diffDays} أيام` : `Dans ${customerDueDateInfo.diffDays}j`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm font-semibold text-text-secondary/60">---</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial History */}
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-3 gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-text-main flex items-center gap-1.5">
                              <History className="w-4 h-4 text-accent" />
                              {t.financialHistory}
                            </h4>
                            <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-text-secondary px-2 py-0.5 rounded-full">
                              {historyCounts.all} {language === 'ar' ? 'عملية' : 'opérations'}
                            </span>
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-text-secondary">
                            <button
                              type="button"
                              onClick={() => setHistoryFilter('ALL')}
                              className={cn(
                                "px-3 py-1 rounded-lg transition-all text-[11px]",
                                historyFilter === 'ALL' ? "bg-white dark:bg-slate-700 text-text-main shadow-xs font-black" : "hover:text-text-main"
                              )}
                            >
                              {language === 'ar' ? 'الكل' : 'Tous'} ({historyCounts.all})
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryFilter('SALE')}
                              className={cn(
                                "px-3 py-1 rounded-lg transition-all text-[11px]",
                                historyFilter === 'SALE' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-black" : "hover:text-text-main"
                              )}
                            >
                              {language === 'ar' ? 'فواتير' : 'Factures'} ({historyCounts.sales})
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryFilter('PAYMENT')}
                              className={cn(
                                "px-3 py-1 rounded-lg transition-all text-[11px]",
                                historyFilter === 'PAYMENT' ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-black" : "hover:text-text-main"
                              )}
                            >
                              {language === 'ar' ? 'دفعات' : 'Règlements'} ({historyCounts.payments})
                            </button>
                          </div>
                        </div>
                        
                        {loadingHistory ? (
                          <div className="py-14 text-center text-text-secondary text-xs font-mono animate-pulse tracking-widest">
                            CHARGEMENT_HISTORIQUE...
                          </div>
                        ) : filteredDisplayHistory.length === 0 ? (
                          <div className="py-14 text-center border-2 border-dashed border-border-subtle rounded-3xl opacity-60 flex flex-col items-center gap-3">
                            <Archive className="w-8 h-8 opacity-40" />
                            <p className="text-xs font-semibold text-text-secondary">{t.historyEmpty}</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 pr-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                             {filteredDisplayHistory.map((item) => (
                               <div 
                                 key={item.id} 
                                 className="group bg-slate-50/60 dark:bg-slate-800/30 p-3.5 sm:p-4 rounded-2xl flex justify-between items-center text-sm border border-border-subtle/60 hover:bg-white dark:hover:bg-slate-800 hover:border-accent/30 transition-all shadow-xs gap-3"
                               >
                                 <div className="flex items-center gap-3.5 min-w-0">
                                   <div className={cn(
                                     "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                     item.type === 'PAYMENT' 
                                       ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" 
                                       : item.type === 'SALE'
                                       ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40"
                                       : "bg-slate-100 dark:bg-slate-800 text-text-secondary border-border-subtle"
                                   )}>
                                     {item.type === 'PAYMENT' ? (
                                       <ArrowDownLeft className="w-5 h-5" />
                                     ) : item.type === 'SALE' ? (
                                       <FileText className="w-5 h-5" />
                                     ) : (
                                       <Receipt className="w-5 h-5" />
                                     )}
                                   </div>

                                   <div className={cn("min-w-0 flex flex-col gap-0.5", language === 'ar' && "text-right")}>
                                     <div className="flex items-center gap-2 flex-wrap">
                                       <span className="font-black text-text-main text-sm truncate">
                                         {item.description || (item.type === 'SALE' ? `Facture #${item.id?.slice(0, 8)}` : 'Règlement')}
                                       </span>
                                       {item.type === 'SALE' && (
                                         <span className="bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                           {t.invoice}
                                         </span>
                                       )}
                                       {item.payment_method === 'CHECK' && (
                                         <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                           <CreditCard className="w-3 h-3" /> {t.check} #{item.check_number || '---'}
                                         </span>
                                       )}
                                       {Number(item.discount || 0) > 0 && (
                                         <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold px-2 py-0.5 rounded-md text-[10px]">
                                           {t.discount}: -{formatNumber(item.discount)} {t.currency}
                                         </span>
                                       )}
                                     </div>

                                     <div className="text-[11px] font-semibold text-text-secondary/70 flex items-center gap-1.5 flex-wrap">
                                       <CalendarClock className="w-3.5 h-3.5 text-text-secondary/50" />
                                       <span>
                                         {new Date(item.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                         {' · '}
                                         {new Date(item.date).toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       {(item as any).check_owner && (
                                         <span className="opacity-80">
                                           • {(item as any).check_owner}
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </div>

                                 <div className="flex items-center gap-3 shrink-0">
                                   <div className="flex flex-col items-end">
                                     <div className={cn(
                                       "text-base font-black tabular-nums tracking-tight",
                                       String(item.type).toUpperCase() === 'PAYMENT' 
                                         ? "text-emerald-600 dark:text-emerald-400" 
                                         : (String(item.type).toUpperCase() === 'SALE' && !['DEBT', 'CREDIT'].includes(String(item.paymentMethod || item.payment_method).toUpperCase()) ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400")
                                     )}>
                                       <span dir="ltr">{item.type === 'PAYMENT' ? '+' : '-'}{formatNumber(item.amount)}</span> <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
                                     </div>
                                     {Number(item.discount || 0) > 0 && (
                                       <div className="text-[10px] font-semibold text-text-secondary line-through opacity-70">
                                         <span dir="ltr">{formatNumber(Number(item.amount) + Number(item.discount))}</span> {t.currency}
                                       </div>
                                     )}
                                   </div>

                                   <div className="flex items-center gap-1">
                                     {item.type === 'SALE' && (
                                       <button 
                                         onClick={async () => {
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
                                         }}
                                         className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors text-text-secondary hover:text-accent border border-transparent hover:border-border-subtle"
                                         title={t.view}
                                       >
                                         <Eye className="w-4 h-4" />
                                       </button>
                                     )}
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
                                                 clientName: selectedCustomer?.name,
                                                 clientPhone: selectedCustomer?.phone
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
                                             saleId: item.id, 
                                             paymentMethod: (item as any).payment_method, 
                                             checkNumber: (item as any).check_number, 
                                             checkOwner: (item as any).check_owner, 
                                             checkDueDate: (item as any).check_due_date 
                                           }, language, settings);
                                         }
                                       }}
                                       className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors text-text-secondary hover:text-accent border border-transparent hover:border-border-subtle"
                                       title="Imprimer le reçu"
                                     >
                                       <Printer className="w-4 h-4" />
                                     </button>
                                   </div>
                                 </div>
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 border-t border-border-subtle flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                      onClick={() => generateStatementPDF({ entityName: selectedCustomer.name, remainingDebt: currentDebt, transactions: displayHistory, type: 'customer' }, language, settings)} 
                      className="bg-white dark:bg-card border border-border-subtle text-text-main font-bold py-3 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Download className="w-4 h-4 text-accent" /> 
                      {t.generateStatement}
                    </button>
                    <button 
                      onClick={() => openReturnModal(selectedCustomer)} 
                      className="bg-white dark:bg-card border border-border-subtle text-text-main font-bold py-3 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-accent" /> 
                      {t.returnProduct}
                    </button>
                    <button 
                      onClick={() => {
                        setAdjustModal({ type: 'pay', customer: selectedCustomer });
                        setAdjustAmount('');
                      }} 
                      className="bg-accent text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-accent/20"
                    >
                      <CreditCard className="w-4 h-4" />
                      {t.payDebt}
                    </button>
                  </div>

                  {/* High-impact Full Settlement CTA */}
                  {currentDebt > 0 && (
                    <button 
                      onClick={() => {
                        setAdjustModal({ type: 'pay', customer: selectedCustomer });
                        setAdjustAmount(currentDebt.toString());
                      }} 
                      className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        </div>
                        <span>{t.clearFullDebt}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 px-3.5 py-1.5 rounded-xl border border-white/10">
                        <span className="text-sm font-black tabular-nums">{formatNumber(currentDebt)} {t.currency}</span>
                        <CheckCircle className="w-4 h-4 text-emerald-300" />
                      </div>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
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
                  {Number(selectedSaleToShow.discount || 0) > 0 && (
                    <>
                      <div className="flex justify-between items-center px-2 text-xs font-bold text-text-secondary">
                        <span className="uppercase tracking-widest">{t.subtotal}</span>
                        <span className="font-mono">{formatNumber(selectedSaleToShow.subtotal || (selectedSaleToShow.total + selectedSaleToShow.discount))} {t.currency}</span>
                      </div>
                      <div className="flex justify-between items-center px-2 text-xs font-bold text-rose-600">
                        <span className="uppercase tracking-widest">{t.discount}</span>
                        <span className="font-mono">-{formatNumber(selectedSaleToShow.discount)} {t.currency}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center px-2 pt-2 border-t border-border-subtle/50">
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
                      clientName: selectedCustomer?.name,
                                            clientPhone: selectedCustomer?.phone
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
              
              {/* Top Header with FLAH 10% Toggle Button */}
              <div className="flex items-center justify-between mb-6 bg-bg-base/60 p-4 rounded-2xl border border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-text-main uppercase">{t.returnProduct}</h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] mt-0.5">{returnModal.customer.name}</p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={toggleReturnFlah}
                  className={cn(
                    "px-3 py-2 border rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm",
                    isReturnFlahActive ? "bg-accent text-white border-accent shadow-accent/25 scale-105" : "bg-white text-text-secondary border-border-subtle hover:bg-bg-base"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isReturnFlahActive ? (language === 'ar' ? 'فلاح نشط' : 'FLAH ON') : 'FLAH 10%'}</span>
                </button>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-4">
                {/* Product Selector */}
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{t.selectProduct}</label>
                    {purchasedProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllProductsInReturn(!showAllProductsInReturn)}
                        className="text-[9px] font-bold text-accent hover:underline"
                      >
                        {showAllProductsInReturn 
                          ? (language === 'ar' ? `مشتريات الزبون فقط (${purchasedProducts.length})` : `Achats client فقط (${purchasedProducts.length})`)
                          : (language === 'ar' ? 'إظهار كل المخزون' : 'Afficher tout le stock')}
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all flex items-center justify-between"
                    >
                      <span className={cn("truncate", !returnProductId && "text-text-secondary")}>
                        {returnProductId 
                          ? (availableReturnProducts.find(p => p.id === returnProductId)?.name || products.find(p => p.id === returnProductId)?.name || t.selectProduct)
                          : `-- ${t.selectProduct} --`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-text-secondary" />
                    </button>

                    <AnimatePresence>
                      {isProductDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-border-subtle rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[250px]"
                        >
                          <div className="p-2 border-b border-border-subtle bg-bg-base/50 sticky top-0">
                            <div className="relative">
                              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4", language === 'ar' ? "right-3" : "left-3")} />
                              <input 
                                type="text"
                                autoFocus
                                placeholder={language === 'ar' ? "بحث عن منتج..." : "Rechercher un produit..."}
                                className={cn("w-full bg-white border border-border-subtle rounded-lg py-2 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all", language === 'ar' ? "pr-9 pl-3 text-right" : "pl-9 pr-3")}
                                value={returnProductSearch}
                                onChange={e => setReturnProductSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          
                          <div className="overflow-y-auto flex-1 p-1">
                            {loadingPurchasedProducts ? (
                              <div className="py-6 text-center text-xs text-text-secondary font-bold">
                                {language === 'ar' ? 'جاري تحميل منتجات الزبون...' : 'Chargement des produits...'}
                              </div>
                            ) : availableReturnProducts.filter(p => p.name.toLowerCase().includes(returnProductSearch.toLowerCase())).length === 0 ? (
                              <div className="py-6 text-center text-xs text-text-secondary font-bold px-2">
                                {purchasedProducts.length === 0 && !showAllProductsInReturn ? (
                                  <div className="space-y-2">
                                    <p>{language === 'ar' ? 'لم يقم هذا الزبون بشراء أي منتج مسجل سابقاً' : 'Aucun achat précédent trouvé'}</p>
                                    <button 
                                      type="button" 
                                      onClick={() => setShowAllProductsInReturn(true)}
                                      className="text-accent underline text-[10px] font-black"
                                    >
                                      {language === 'ar' ? 'إظهار جميع منتجات المخزون' : 'Afficher tout le stock'}
                                    </button>
                                  </div>
                                ) : (
                                  language === 'ar' ? 'لا توجد نتائج' : 'Aucun produit trouvé'
                                )}
                              </div>
                            ) : (
                              availableReturnProducts.filter(p => p.name.toLowerCase().includes(returnProductSearch.toLowerCase())).map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectReturnProduct(p)}
                                  className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg text-xs font-bold hover:bg-bg-base transition-colors flex items-center justify-between",
                                    returnProductId === p.id && "bg-accent/10 text-accent"
                                  )}
                                >
                                  <span className="truncate">{p.name}</span>
                                  <div className="shrink-0 ml-2 text-right">
                                    <span className="opacity-80 block">{p.price} {t.currency}</span>
                                    {p.lastSoldPrice && (
                                      <span className="text-[9px] font-semibold text-accent block">
                                        {language === 'ar' ? `ثمن الشراء: ${p.lastSoldPrice} DH` : `Achat: ${p.lastSoldPrice} DH`}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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





