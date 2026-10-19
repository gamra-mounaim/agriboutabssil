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
const { Search, Zap, Archive, ArrowRightLeft, Hash, User, CalendarClock, FolderOpen, Eye, CheckCircle, Sparkles, UserCog, Store, ChevronRight, ShieldAlert, Cloud, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image: ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe, Receipt, Copy, Check, MessageSquare, ArrowRight, ArrowDownLeft, Tag, Building2, TrendingDown, ArrowUpDown, Table } = LucideIcons;

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'debt' | 'settled' | 'overdue'>('all');
  const [sortKey, setSortKey] = useState<'debt_desc' | 'debt_asc' | 'name_asc' | 'profit_desc' | 'recent'>('debt_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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

  // ── Executive KPI Calculations ──
  const customersWithDebt = useMemo(() => customers.filter(c => (Number(c.debt) || 0) > 0), [customers]);
  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + (Number(c.debt) || 0), 0), [customers]);
  const totalProfits = useMemo(() => customers.reduce((sum, c) => sum + (Number(c.totalProfit) || 0), 0), [customers]);
  const totalSales = useMemo(() => customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0), [customers]);

  const overdueCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return customers.filter(c => {
      if (!c.debt || Number(c.debt) <= 0) return false;
      const raw = c.dueDate || c.due_date;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
  }, [customers]);

  const soonCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return customers.filter(c => {
      if (!c.debt || Number(c.debt) <= 0) return false;
      const raw = c.dueDate || c.due_date;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
  }, [customers]);

  const customerChecks = useMemo(() => {
    return (checks || []).filter((c: any) => c.partyRole === 'customer');
  }, [checks]);

  const pendingChecks = useMemo(() => {
    return customerChecks.filter((c: any) => c.checkStatus === 'PENDING' || c.status === 'PENDING');
  }, [customerChecks]);

  const pendingChecksTotal = useMemo(() => {
    return pendingChecks.reduce((sum: number, c: any) => sum + (Number(c.total || c.amount) || 0), 0);
  }, [pendingChecks]);

  const getCustomerCardDueDate = (c: Customer) => {
    const raw = c.dueDate || c.due_date;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      formatted: d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      isOverdue: diffDays < 0,
      isToday: diffDays === 0,
      isNear: diffDays > 0 && diffDays <= 7,
      diffDays
    };
  };

  const sortLabels: Record<string, string> = {
    debt_desc: language === 'ar' ? 'الديون: من الأعلى للأدنى' : 'Dettes décroissantes',
    debt_asc: language === 'ar' ? 'الديون: من الأدنى للأعلى' : 'Dettes croissantes',
    name_asc: language === 'ar' ? 'الاسم: أ - ي' : 'Nom (A-Z)',
    profit_desc: language === 'ar' ? 'الأرباح: الأكثر ربحاً' : 'Bénéfices décroissants',
    recent: language === 'ar' ? 'الأحدث نشاطاً' : 'Plus récents',
  };

  // ── Advanced Filter & Sort ──
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchCustomer.trim()) {
        const q = searchCustomer.toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').includes(q);
        const matchesAddress = (c.address || '').toLowerCase().includes(q);
        const matchesId = (c.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesAddress && !matchesId) return false;
      }

      const debt = Number(c.debt) || 0;
      if (statusFilter === 'debt' && debt <= 0) return false;
      if (statusFilter === 'settled' && debt > 0) return false;
      if (statusFilter === 'overdue') {
        if (debt <= 0) return false;
        const raw = c.dueDate || c.due_date;
        if (!raw) return false;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortKey === 'debt_desc') return (Number(b.debt) || 0) - (Number(a.debt) || 0);
      if (sortKey === 'debt_asc') return (Number(a.debt) || 0) - (Number(b.debt) || 0);
      if (sortKey === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'profit_desc') return (Number(b.totalProfit) || 0) - (Number(a.totalProfit) || 0);
      if (sortKey === 'recent') {
        const da = new Date((a as any).updatedAt || (a as any).created_at || 0).getTime();
        const db = new Date((b as any).updatedAt || (b as any).created_at || 0).getTime();
        return db - da;
      }
      return 0;
    });
  }, [customers, searchCustomer, statusFilter, sortKey]);

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

  const getHistoryItemProfit = (item: any) => {
    if (item.profit !== undefined && item.profit !== null && !isNaN(Number(item.profit))) {
      return Number(item.profit);
    }
    const matched = sales.find((s: any) => s.id === item.id || (s.invoiceNumber && item.invoice_number && s.invoiceNumber === item.invoice_number));
    if (matched?.profit !== undefined && matched?.profit !== null && !isNaN(Number(matched.profit))) {
      return Number(matched.profit);
    }
    if (matched?.items && matched.items.length > 0) {
      const cost = matched.items.reduce((acc: number, it: any) => {
        const p = products.find(prod => prod.id === it.productId);
        const cp = it.costPrice !== undefined ? Number(it.costPrice) : Number(p?.costPrice || 0);
        return acc + (cp * (Number(it.qty) || 1));
      }, 0);
      return Number(matched.total || 0) - cost;
    }
    return 0;
  };

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
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-24 px-1 sm:px-2 md:px-4">

      {/* ── TOP HEADER & TABS BAR ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card/60 border border-border-subtle/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm">
        
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent/20 via-accent/10 to-transparent flex items-center justify-center text-accent border border-accent/20 shadow-xs">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
                {t.customers}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-accent/10 text-accent border border-accent/20 font-mono">
                {customers.length}
              </span>
            </div>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">
              {language === 'ar' 
                ? 'إدارة حسابات الزبائن، متابعة الديون، الأرباح، وشيكات الدفع'
                : 'Gestion des comptes clients, suivi des créances, bénéfices et règlements'}
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Tabs */}
          <div className="flex p-1 bg-bg-base/80 dark:bg-slate-900/80 border border-border-subtle rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                'px-4 sm:px-5 py-2 rounded-xl font-black text-xs tracking-wider transition-all duration-200 uppercase flex items-center gap-2',
                activeTab === 'list'
                  ? 'bg-card text-accent shadow-sm border border-border-subtle/60'
                  : 'text-text-secondary hover:text-text-main'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.customers}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                activeTab === 'list' ? "bg-accent/15 text-accent" : "bg-border-subtle/40 text-text-secondary"
              )}>
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('checks')}
              className={cn(
                'px-4 sm:px-5 py-2 rounded-xl font-black text-xs tracking-wider transition-all duration-200 uppercase flex items-center gap-2',
                activeTab === 'checks'
                  ? 'bg-card text-accent shadow-sm border border-border-subtle/60'
                  : 'text-text-secondary hover:text-text-main'
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t.checks}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                activeTab === 'checks' ? "bg-accent/15 text-accent" : "bg-border-subtle/40 text-text-secondary"
              )}>
                {customerChecks.length}
              </span>
            </button>
          </div>

          {/* Quick Add Customer Toggle Button */}
          {activeTab === 'list' && (
            <button
              onClick={() => setShowAddForm(v => !v)}
              className={cn(
                "px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95",
                showAddForm
                  ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90"
                  : "bg-accent text-white shadow-accent/20 hover:bg-accent/90"
              )}
            >
              {showAddForm ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إخفاء الاستمارة' : 'Masquer'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.addCustomer}</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* ── 4-METRIC EXECUTIVE KPI GRID (FULL-WIDTH) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* KPI 1: Total Clients */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                  {t.customers}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-900/40 shadow-xs">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-text-main font-mono tracking-tight">
                  {customers.length}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-text-main font-black">{customersWithDebt.length}</span> {language === 'ar' ? 'عليهم دين مفتوح' : 'avec solde débiteur'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Dette Totale Clients */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  {(t as any).totalCustomerDebt || (language === 'ar' ? 'إجمالي ديون الزبائن' : 'Total Dettes Clients')}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-900/40 shadow-xs">
                  <TrendingDown className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  <span>{formatNumber(totalDebt)}</span>
                  <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {overdueCustomers.length > 0 ? (
                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/70 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-900/50">
                      <AlertTriangle className="w-3 h-3 animate-pulse" />
                      {overdueCustomers.length} {language === 'ar' ? 'متأخر في الأداء' : 'en retard d\'échéance'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'ar' ? 'الوضعية جيدة ومضبوطة' : 'Aucun retard critique'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3: Bénéfice Cumulé */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">
                  {language === 'ar' ? 'إجمالي الأرباح' : 'Bénéfice Cumulé'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-900/40 shadow-xs">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 font-mono tracking-tight">
                  <span>{totalProfits > 0 ? `+${formatNumber(totalProfits)}` : formatNumber(totalProfits)}</span>
                  <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {language === 'ar' ? 'حجم المبيعات' : 'Ventes'}: <span className="font-bold text-text-main font-mono">{formatNumber(totalSales)}</span> {t.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Chèques Clients */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                  {language === 'ar' ? 'شيكات في الانتظار' : 'Chèques en portefeuille'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-900/40 shadow-xs">
                  <CreditCard className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                  <span>{formatNumber(pendingChecksTotal)}</span>
                  <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                    <span className="text-text-main font-black">{pendingChecks.length}</span> {language === 'ar' ? 'شيك قيد التحصيل' : 'chèques en attente'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ── ADD CUSTOMER FORM (COLLAPSIBLE / EXPANDABLE) ── */}
          <AnimatePresence>
            {showAddForm && (
              <motion.section
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-card border-2 border-accent/20 p-6 sm:p-7 rounded-3xl shadow-lg relative">
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-subtle/80">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-accent/10 rounded-xl text-accent">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
                          {t.addCustomer}
                        </h3>
                        <p className="text-[11px] font-bold text-text-secondary">
                          {language === 'ar' ? 'سجل بيانات الزبون ورصيد الدين الأولي وتاريخ الاستحقاق' : 'Remplissez les informations pour ajouter un nouveau client'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="p-2 rounded-xl text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors"
                      title={t.cancel}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Nom */}
                    <div className="lg:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-accent" />
                        <span>{t.customerName}</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={t.customerName}
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Phone */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <span>{t.phone}</span>
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="06XXXXXXXX"
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Address */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span>{t.address}</span>
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder={t.address}
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Due Date */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>{t.dueDate || (language === 'ar' ? 'تاريخ الاستحقاق' : 'Échéance')}</span>
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Initial Debt */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-accent" />
                        <span>{t.initialDebt}</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={initialDebt}
                          onChange={e => setInitialDebt(e.target.value)}
                          className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-black text-rose-600 focus:border-accent outline-none shadow-2xs transition-all"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary/50">
                          {t.currency}
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-6 flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-accent text-white py-3 px-8 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-98 transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>{t.confirm}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── SEARCH, FILTER PILLS & VIEW CONTROLS (FULL-WIDTH) ── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card/60 border border-border-subtle p-3 sm:p-4 rounded-3xl shadow-xs">
            
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 group">
              <Search className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors',
                language === 'ar' ? 'right-4' : 'left-4'
              )} />
              <input
                value={searchCustomer}
                onChange={e => setSearchCustomer(e.target.value)}
                placeholder={language === 'ar' ? 'بحث باسم الزبون، رقم الهاتف، العنوان...' : 'Rechercher par nom, téléphone, adresse...'}
                className={cn(
                  'w-full bg-bg-base/80 border border-border-subtle rounded-2xl py-2.5 text-sm font-bold focus:border-accent outline-none transition-all',
                  language === 'ar' ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10'
                )}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
              {searchCustomer && (
                <button
                  type="button"
                  onClick={() => setSearchCustomer('')}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-main rounded-full",
                    language === 'ar' ? 'left-3' : 'right-3'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {[
                { key: 'all' as const, label: language === 'ar' ? 'الكل' : 'Tous', count: customers.length },
                { key: 'debt' as const, label: language === 'ar' ? 'عليهم دين' : 'En Dette', count: customersWithDebt.length },
                { key: 'settled' as const, label: language === 'ar' ? 'مسوّى' : 'Soldés', count: customers.length - customersWithDebt.length },
                { key: 'overdue' as const, label: language === 'ar' ? 'متأخر/قريب' : 'Échéance', count: overdueCustomers.length + soonCustomers.length },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap",
                    statusFilter === f.key
                      ? "bg-accent text-white shadow-xs"
                      : "bg-bg-base text-text-secondary hover:text-text-main hover:bg-border-subtle/30"
                  )}
                >
                  <span>{f.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    statusFilter === f.key ? "bg-white/20 text-white" : "bg-card text-text-secondary"
                  )}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort Dropdown & View Mode & Return Walking Client */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Sort Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(v => !v)}
                  className="px-3.5 py-2 rounded-xl bg-bg-base border border-border-subtle text-xs font-black text-text-main hover:border-accent transition-colors flex items-center gap-1.5"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden sm:inline">{sortLabels[sortKey]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                </button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      className="absolute top-full mt-2 right-0 z-30 bg-card border border-border-subtle rounded-2xl shadow-xl overflow-hidden min-w-[210px]"
                    >
                      {Object.keys(sortLabels).map(k => (
                        <button
                          key={k}
                          onClick={() => { setSortKey(k as any); setShowSortMenu(false); }}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-between',
                            sortKey === k ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-base hover:text-text-main'
                          )}
                        >
                          <span>{sortLabels[k]}</span>
                          {sortKey === k && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View Mode Toggle: Grid vs Table */}
              <div className="flex bg-bg-base p-1 rounded-2xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-card text-accent shadow-xs" : "text-text-secondary hover:text-text-main"
                  )}
                  title="Grille"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    viewMode === 'table' ? "bg-card text-accent shadow-xs" : "text-text-secondary hover:text-text-main"
                  )}
                  title="Tableau"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>

              {/* Walking Customer Return Button */}
              <button 
                onClick={() => openReturnModal({ id: 'walking', name: t.walkingCustomer || 'Client de passage', debt: 0, email: '', phone: '', address: '' })} 
                className="bg-accent text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-accent/20 hover:opacity-95 transition-all shrink-0 active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.walkingCustomerReturn}</span>
              </button>

            </div>

          </div>

          {/* ── CLIENTS RESULTS CONTAINER (GRID OR TABLE) ── */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-card border border-border-subtle rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-bg-base mx-auto flex items-center justify-center text-text-secondary/50">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-text-main">
                  {language === 'ar' ? 'لا توجد نتائج مطابقة' : 'Aucun client trouvé'}
                </h4>
                <p className="text-xs text-text-secondary font-medium mt-1">
                  {language === 'ar' ? 'جرّب البحث بكلمات أخرى أو أزل الفلاتر المحددة' : 'Essayez d\'autres termes de recherche ou réinitialisez les filtres.'}
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── MULTI-COLUMN RESPONSIVE CARDS GRID ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5">
              {filteredCustomers.map(c => {
                const dueInfo = getCustomerCardDueDate(c);
                const hasDebt = (Number(c.debt) || 0) > 0;

                return (
                  <div
                    key={c.id}
                    className="bg-card border border-border-subtle p-5 sm:p-6 rounded-3xl shadow-xs hover:shadow-xl transition-all group overflow-hidden relative border-b-4 border-b-border-subtle/40 hover:border-b-accent flex flex-col justify-between"
                  >
                    {/* Top Row: Client Info & Avatar */}
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <h4 
                            onClick={() => setSelectedCustomer(c)}
                            className="font-black text-base text-text-main group-hover:text-accent transition-colors tracking-tight truncate cursor-pointer"
                            title={c.name}
                          >
                            {c.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-text-secondary font-mono font-bold flex items-center gap-1 opacity-70">
                              <Hash className="w-3 h-3" />
                              {c.id.slice(0, 8)}
                            </span>
                            {c.phone && (
                              <span className="text-[10px] text-text-secondary font-mono font-bold flex items-center gap-1 bg-bg-base px-2 py-0.5 rounded-lg border border-border-subtle/50">
                                <Phone className="w-2.5 h-2.5 text-accent" />
                                {c.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Avatar */}
                        <div 
                          onClick={() => setSelectedCustomer(c)}
                          className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-accent/20 via-accent/10 to-transparent flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 border border-accent/20 shadow-xs font-black text-sm cursor-pointer"
                        >
                          {getCustomerInitials(c.name)}
                        </div>
                      </div>

                      {/* Current Debt Box */}
                      <div className={cn(
                        "p-4 rounded-2xl mb-3 relative overflow-hidden border transition-all",
                        hasDebt 
                          ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40" 
                          : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40"
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider",
                            hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                          )}>
                            {t.debt}
                          </span>
                          {!hasDebt && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                              {language === 'ar' ? 'حساب مسوّى' : 'Soldé'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span dir="ltr" className={cn(
                            "text-2xl font-black tracking-tight font-mono",
                            hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {formatNumber(c.debt)}
                          </span>
                          <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                        </div>

                        {/* Due Date Indicator */}
                        {hasDebt && dueInfo && (
                          <div className={cn(
                            "mt-2.5 pt-2 border-t flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
                            hasDebt ? "border-rose-200/50 dark:border-rose-900/40" : "border-emerald-200/50",
                            dueInfo.isOverdue ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                          )}>
                            <CalendarClock className={cn("w-3 h-3 shrink-0", dueInfo.isOverdue && "animate-pulse")} />
                            <span>
                              {dueInfo.isOverdue 
                                ? `${language === 'ar' ? 'متأخر' : 'Retard'}: ${dueInfo.formatted}`
                                : `${language === 'ar' ? 'استحقاق' : 'Échéance'}: ${dueInfo.formatted}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cumulative Profit Badge */}
                      {canViewProfits && (
                        <div className="p-3.5 rounded-2xl mb-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 relative overflow-hidden">
                          <div className="flex items-center justify-between text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                              {t.totalCustomerProfit}
                            </span>
                            <span className="text-[9px] font-bold text-text-secondary/80 lowercase">
                              {language === 'ar' ? 'من أول معاملة' : 'depuis 1ère tx'}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-emerald-200/40 dark:border-emerald-900/40">
                            <div className="flex items-baseline gap-1">
                              <span dir="ltr" className={cn(
                                "text-lg font-black font-mono tracking-tight",
                                (c.totalProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                              )}>
                                {(c.totalProfit || 0) > 0 ? `+${formatNumber(c.totalProfit)}` : formatNumber(c.totalProfit || 0)}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-700 uppercase">{t.currency}</span>
                            </div>

                            {(c.totalSpent || 0) > 0 && (
                              <span className="text-[10px] font-semibold text-text-secondary">
                                {t.sales}: <span dir="ltr" className="font-mono text-text-main font-bold">{formatNumber(c.totalSpent)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setAdjustModal({ type: 'pay', customer: c }); setAdjustAmount(''); }}
                          className="bg-accent text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-accent/90 active:scale-95 transition-all text-center"
                        >
                          {t.payDebt}
                        </button>
                        <button
                          onClick={() => setAdjustModal({ type: 'charge', customer: c })}
                          className="bg-bg-base border border-border-subtle text-text-main hover:border-accent hover:text-accent py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center"
                        >
                          {t.newCharge}
                        </button>
                      </div>

                      {hasDebt && (
                        <button
                          onClick={() => {
                            setAdjustModal({ type: 'pay', customer: c });
                            setAdjustAmount(c.debt.toString());
                          }}
                          className="w-full bg-emerald-600 text-white py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>{t.clearFullDebt}</span>
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="w-full pt-1.5 pb-0.5 text-[10px] font-black text-text-secondary hover:text-accent uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{t.view} {t.customerDetails}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DENSE FULL-WIDTH TABLE VIEW ── */
            <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-base/60 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                      <th className="p-4">{t.customerName}</th>
                      <th className="p-4">{t.phone}</th>
                      <th className="p-4">{t.address}</th>
                      <th className="p-4">{t.dueDate || 'Échéance'}</th>
                      <th className="p-4">{t.debt}</th>
                      {canViewProfits && <th className="p-4">{t.totalCustomerProfit}</th>}
                      <th className="p-4 text-center">{t.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60">
                    {filteredCustomers.map(c => {
                      const dueInfo = getCustomerCardDueDate(c);
                      const hasDebt = (Number(c.debt) || 0) > 0;

                      return (
                        <tr key={c.id} className="hover:bg-bg-base/40 transition-colors group">
                          {/* Name + Initials */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent font-black text-xs flex items-center justify-center shrink-0 border border-accent/20">
                                {getCustomerInitials(c.name)}
                              </div>
                              <div>
                                <button
                                  onClick={() => setSelectedCustomer(c)}
                                  className="font-black text-text-main group-hover:text-accent transition-colors text-left"
                                >
                                  {c.name}
                                </button>
                                <div className="text-[10px] font-mono text-text-secondary opacity-70">
                                  #{c.id.slice(0, 8)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="p-4 font-mono font-bold text-text-secondary">
                            {c.phone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-accent" />
                                {c.phone}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Address */}
                          <td className="p-4 text-text-secondary truncate max-w-[150px]">
                            {c.address || '—'}
                          </td>

                          {/* Due Date */}
                          <td className="p-4">
                            {dueInfo ? (
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                                dueInfo.isOverdue 
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                              )}>
                                <CalendarClock className="w-3 h-3" />
                                {dueInfo.formatted}
                              </span>
                            ) : (
                              <span className="text-text-secondary opacity-40">—</span>
                            )}
                          </td>

                          {/* Debt */}
                          <td className="p-4">
                            <span dir="ltr" className={cn(
                              "font-mono font-black text-sm",
                              hasDebt ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {formatNumber(c.debt)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                            </span>
                          </td>

                          {/* Cumulative Profit */}
                          {canViewProfits && (
                            <td className="p-4">
                              <span dir="ltr" className={cn(
                                "font-mono font-black text-sm",
                                (c.totalProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"
                              )}>
                                {(c.totalProfit || 0) > 0 ? `+${formatNumber(c.totalProfit)}` : formatNumber(c.totalProfit || 0)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                              </span>
                            </td>
                          )}

                          {/* Quick Actions */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setAdjustModal({ type: 'pay', customer: c }); setAdjustAmount(''); }}
                                className="px-3 py-1.5 rounded-xl bg-accent text-white font-black text-[10px] uppercase tracking-wider shadow-xs hover:bg-accent/90"
                              >
                                {t.payDebt}
                              </button>
                              <button
                                onClick={() => setAdjustModal({ type: 'charge', customer: c })}
                                className="px-3 py-1.5 rounded-xl bg-bg-base border border-border-subtle font-black text-[10px] uppercase tracking-wider text-text-main hover:border-accent"
                              >
                                {t.newCharge}
                              </button>
                              <button
                                onClick={() => setSelectedCustomer(c)}
                                className="p-1.5 rounded-xl text-text-secondary hover:text-accent hover:bg-bg-base"
                                title={t.view}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {checks && checks.filter(c => c.partyRole === 'customer').length > 0 ? (
              checks.filter(c => c.partyRole === 'customer').slice(0, 50).map((p: any) => (
                <div key={p.id} className="bg-card border border-border-subtle rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-accent/40 transition-all shadow-xs group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform border border-amber-200/50">
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
                    <div className="text-xl font-black text-text-main font-mono tracking-tight">
                      {formatNumber(p.total)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                    </div>
                    <div className="text-[10px] font-bold text-text-secondary opacity-60">
                      {p.date ? new Date(p.date).toLocaleString() : '---'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 opacity-50 bg-card border border-border-subtle rounded-3xl">
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
                                       {item.type === 'SALE' && canViewProfits && (() => {
                                         const profitVal = getHistoryItemProfit(item);
                                         return (
                                           <span className={cn(
                                             "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md",
                                             profitVal >= 0 
                                               ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40"
                                               : "bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40"
                                           )}>
                                             <TrendingUp className="w-3 h-3" />
                                             <span>{language === 'ar' ? 'الربح' : 'Bénéfice'}: {profitVal >= 0 ? '+' : ''}{formatNumber(profitVal)} {t.currency}</span>
                                           </span>
                                         );
                                       })()}
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
                                     {item.type === 'SALE' && canViewProfits && (() => {
                                       const profitVal = getHistoryItemProfit(item);
                                       return (
                                         <div className={cn(
                                           "text-xs font-black tabular-nums flex items-center gap-1 mt-0.5",
                                           profitVal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                         )}>
                                           <span className="text-[10px] font-semibold text-text-secondary">{language === 'ar' ? 'الربح:' : 'Bénéfice:'}</span>
                                           <span dir="ltr">{profitVal >= 0 ? '+' : ''}{formatNumber(profitVal)}</span>
                                           <span className="text-[10px] font-bold">{t.currency}</span>
                                         </div>
                                       );
                                     })()}
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
                  {canViewProfits && (() => {
                    const profitVal = getHistoryItemProfit(selectedSaleToShow);
                    return (
                      <div className="flex justify-between items-center px-2 pt-2 border-t border-border-subtle/40">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {language === 'ar' ? 'الربح المحقق في هذه الفاتورة' : 'Bénéfice réalisé'}
                        </span>
                        <span className={cn(
                          "text-base font-black tracking-tight font-mono",
                          profitVal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          <span dir="ltr">{profitVal >= 0 ? '+' : ''}{formatNumber(profitVal)}</span> {t.currency}
                        </span>
                      </div>
                    );
                  })()}
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





