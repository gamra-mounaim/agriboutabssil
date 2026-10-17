import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Printer, Edit2, CheckCircle2, AlertTriangle, FileText, X, Eye, 
  RotateCw, Calendar, User, CreditCard, DollarSign, TrendingUp, Filter,
  ArrowUpDown, Download, Tag, Wallet, Clock, ArrowUpRight, ChevronRight,
  ShieldAlert, Sparkles, Check, Phone, MapPin, Receipt, Hash
} from 'lucide-react';
import { cn, formatNumber } from '../utils';
import { Sale, Customer } from '../types';
import { useStore, useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { generateInvoicePDF } from '../services/invoiceService';
import { api } from '../services/apiService';
import { motion, AnimatePresence } from 'motion/react';

type DateFilter = 'all' | 'today' | 'week' | 'month';
type MethodFilter = 'all' | 'cash' | 'debt' | 'check' | 'card';
type SortOption = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';

export default function InvoicesView({ permissions, currentUserRole }: { permissions: any, currentUserRole?: string }) {
  const { sales, salesTotal, salesPage, fetchSalesPage, customers, appUsers, settings, fetchData } = useStore();
  const { language, user: currentUser } = useAuthStore();
  const t = translations[language] as any;
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchData(),
        fetchSalesPage(salesPage, searchQuery)
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSalesPage(1, searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery, fetchSalesPage]);

  // Permissions
  const canViewAll = currentUserRole === 'admin' || currentUserRole === 'manager' || permissions?.manageInvoices || permissions?.history;
  const canEditDiscount = currentUserRole === 'admin' || currentUserRole === 'manager' || permissions?.manageInvoices;

  // Filtered and sorted sales
  const processedSales = useMemo(() => {
    let result = (sales || []).filter(s => {
      if (!canViewAll && s.staffId !== currentUser?.id) return false;

      // Method filter
      if (methodFilter !== 'all') {
        const method = (s.paymentMethod || 'cash').toLowerCase();
        if (method !== methodFilter) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const saleDate = new Date(s.date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const sDate = new Date(saleDate);
          sDate.setHours(0, 0, 0, 0);
          if (sDate.getTime() !== now.getTime()) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (saleDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (saleDate < monthStart) return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOption === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOption === 'total_desc') return (b.total || 0) - (a.total || 0);
      if (sortOption === 'total_asc') return (a.total || 0) - (b.total || 0);
      return 0;
    });

    return result;
  }, [sales, canViewAll, currentUser?.id, methodFilter, dateFilter, sortOption]);

  // KPI Calculations based on currently processed sales
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let cashAndCard = 0;
    let totalDebt = 0;
    let totalDiscounts = 0;
    let debtCount = 0;
    let discountCount = 0;

    processedSales.forEach(s => {
      const tot = Number(s.total) || 0;
      const disc = Number(s.discount) || 0;
      const method = (s.paymentMethod || 'cash').toLowerCase();

      totalInvoiced += tot;
      if (disc > 0) {
        totalDiscounts += disc;
        discountCount += 1;
      }

      if (method === 'debt') {
        totalDebt += tot;
        debtCount += 1;
      } else {
        cashAndCard += tot;
      }
    });

    const cashPct = totalInvoiced > 0 ? Math.round((cashAndCard / totalInvoiced) * 100) : 0;

    return {
      totalInvoiced,
      cashAndCard,
      totalDebt,
      totalDiscounts,
      debtCount,
      discountCount,
      cashPct,
      count: processedSales.length
    };
  }, [processedSales]);

  // Print Invoice
  const printInvoice = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const staff = appUsers.find(u => u.id === sale.staffId || u.username === sale.staffId);
    
    generateInvoicePDF({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      items: (sale.items || []).map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      clientName: (sale as any).customerName || customer?.name,
      clientPhone: customer?.phone,
      clientAddress: customer?.address,
      staffName: (sale as any).staffName || staff?.username || staff?.email?.split('@')[0] || sale.staffId,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);
  };

  // Print Current Journal Report
  const handlePrintJournal = () => {
    window.print();
  };

  // Edit discount
  const handleEditClick = (sale: Sale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSale(sale);
    setNewDiscount(sale.discount || 0);
  };

  const handleSaveDiscount = async () => {
    if (!editingSale) return;
    setIsSubmitting(true);
    try {
      await api.updateSaleDiscount(editingSale.id, newDiscount, currentUser?.id || '');
      await Promise.all([fetchData(), fetchSalesPage(salesPage, searchQuery)]);
      setEditingSale(null);
    } catch (error: any) {
      alert(error.message || 'Error updating discount');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStaffDisplayName = (sale: Sale) => {
    if ((sale as any).staffName) return (sale as any).staffName;
    const found = appUsers.find(u => u.id === sale.staffId || u.username === sale.staffId);
    if (found?.username) return found.username;
    if (found?.email) return found.email.split('@')[0];
    if (sale.staffId && sale.staffId.length < 25) return sale.staffId;
    return 'Admin';
  };

  const getCustomerDisplayName = (sale: Sale) => {
    if ((sale as any).customerName) return (sale as any).customerName;
    const found = customers.find(c => c.id === sale.customerId);
    if (found?.name) return found.name;
    return language === 'ar' ? 'زبون عابر' : 'Client de passage';
  };

  const getMethodBadge = (method?: string) => {
    const m = (method || 'cash').toLowerCase();
    switch (m) {
      case 'cash':
        return {
          label: language === 'ar' ? 'نقداً (كاش)' : 'Espèces',
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
        };
      case 'debt':
        return {
          label: language === 'ar' ? 'كريدي / دين' : 'Dette',
          className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-black'
        };
      case 'check':
        return {
          label: language === 'ar' ? 'شيك' : 'Chèque',
          className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
        };
      case 'card':
        return {
          label: language === 'ar' ? 'بطاقة بنكية' : 'Carte',
          className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
        };
      default:
        return {
          label: method || 'Autre',
          className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20'
        };
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-24 px-1 sm:px-2 md:px-4" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. Executive Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/80 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-xs shrink-0">
            <FileText className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight font-heading">
                {isAr ? 'الفواتير والمبيعات' : 'Journal des Factures'}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isAr ? 'مباشر' : 'Direct'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              {isAr ? 'سجل مركزي للمبيعات، الفواتير، طرق الدفع والتخفيضات' : 'Journal centralisé des factures, règlements et gestion des remises'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-bg-base hover:bg-border-subtle/60 border border-border-subtle text-xs font-bold text-text-main transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title={isAr ? 'تحديث' : 'Actualiser'}
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-text-secondary", isRefreshing && "animate-spin text-accent")} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Actualiser'}</span>
          </button>

          <button
            onClick={handlePrintJournal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-text-main text-bg-base hover:opacity-90 transition-all font-bold text-xs shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? 'طباعة السجل' : 'Imprimer le Journal'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Strategic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 print:hidden">
        
        {/* KPI 1: Chiffre Facturé */}
        <div className="p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700/60 dark:from-slate-950 dark:to-slate-900">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
              {isAr ? 'إجمالي المبيعات المفوترة' : 'Total Facturé'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-emerald-400">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span dir="ltr" className="text-3xl xl:text-4xl font-black text-white font-mono tracking-tight">
                {formatNumber(kpis.totalInvoiced)}
              </span>
              <span className="text-xs font-black text-emerald-400 uppercase font-mono">DH</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10 text-[11px]">
            <span className="text-slate-400 font-medium">
              {isAr ? 'مجموع الفواتير المعروضة' : 'Ventes facturées actives'}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              {kpis.count} {isAr ? 'فاتورة' : 'factures'}
            </span>
          </div>
        </div>

        {/* KPI 2: Réglé Immédiatement (Espèces / Carte) */}
        <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {isAr ? 'مستخلص نقداً / بطاقة' : 'Encaissé (Comptant)'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span dir="ltr" className="text-3xl xl:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {formatNumber(kpis.cashAndCard)}
              </span>
              <span className="text-xs font-black text-text-secondary/70 uppercase font-mono">DH</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle/50 text-[11px]">
            <span className="text-text-secondary font-medium">
              {isAr ? 'نسبة الاستخلاص المباشر' : 'Taux de recouvrement comptant'}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              {kpis.cashPct}%
            </span>
          </div>
        </div>

        {/* KPI 3: Ventes en Crédit / Dette */}
        <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {isAr ? 'مبيعات الكريدي (الديون)' : 'Ventes à Crédit (Dette)'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span dir="ltr" className="text-3xl xl:text-4xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                {formatNumber(kpis.totalDebt)}
              </span>
              <span className="text-xs font-black text-text-secondary/70 uppercase font-mono">DH</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle/50 text-[11px]">
            <span className="text-text-secondary font-medium">
              {isAr ? 'فواتير قيد الانتظار' : 'Factures non encaissées'}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 font-mono">
              {kpis.debtCount} {isAr ? 'كريدي' : 'crédits'}
            </span>
          </div>
        </div>

        {/* KPI 4: Total Remises Accordées */}
        <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {isAr ? 'إجمالي التخفيضات الممنوحة' : 'Total Remises'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="my-auto py-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span dir="ltr" className="text-3xl xl:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                {formatNumber(kpis.totalDiscounts)}
              </span>
              <span className="text-xs font-black text-text-secondary/70 uppercase font-mono">DH</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle/50 text-[11px]">
            <span className="text-text-secondary font-medium">
              {isAr ? 'تخفيضات على المبيعات' : 'Remises appliquées'}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 font-mono">
              {kpis.discountCount} {isAr ? 'فاتورة مخفضة' : 'remisées'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Filter & Control Bar */}
      <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-xs space-y-4 print:hidden">
        
        {/* Top search & sorting row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search box */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالاسم، رقم الفاتورة #، الهاتف...' : 'Rechercher par client, N° facture #, téléphone...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 pl-11 pr-10 text-xs sm:text-sm font-semibold focus:border-accent outline-none transition-all text-text-main shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-main rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-secondary whitespace-nowrap hidden sm:inline">
              <ArrowUpDown className="w-3.5 h-3.5 inline mr-1" />
              {isAr ? 'ترتيب:' : 'Trier:'}
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-bg-base border border-border-subtle rounded-2xl px-4 py-3 text-xs font-bold text-text-main focus:border-accent outline-none cursor-pointer"
            >
              <option value="date_desc">{isAr ? 'الأحدث أولاً' : 'Date (plus récente)'}</option>
              <option value="date_asc">{isAr ? 'الأقدم أولاً' : 'Date (plus ancienne)'}</option>
              <option value="total_desc">{isAr ? 'المبلغ (الأعلى)' : 'Montant (décroissant)'}</option>
              <option value="total_asc">{isAr ? 'المبلغ (الأدنى)' : 'Montant (croissant)'}</option>
            </select>
          </div>
        </div>

        {/* Filters Pills Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-3 border-t border-border-subtle/60">
          
          {/* Date range pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black uppercase text-text-secondary mr-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              {isAr ? 'الفترة:' : 'Période:'}
            </span>
            {[
              { id: 'all', label: isAr ? 'الكل' : 'Tout' },
              { id: 'today', label: isAr ? 'اليوم' : "Aujourd'hui" },
              { id: 'week', label: isAr ? '7 أيام' : '7 Jours' },
              { id: 'month', label: isAr ? 'هذا الشهر' : 'Ce Mois' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilter)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  dateFilter === tab.id
                    ? "bg-text-main text-bg-base shadow-xs"
                    : "bg-bg-base text-text-secondary hover:text-text-main hover:bg-border-subtle/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment method pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black uppercase text-text-secondary mr-1">
              <CreditCard className="w-3 h-3 inline mr-1" />
              {isAr ? 'طريقة الدفع:' : 'Règlement:'}
            </span>
            {[
              { id: 'all', label: isAr ? 'الكل' : 'Tous' },
              { id: 'cash', label: isAr ? 'كاش' : 'Espèces' },
              { id: 'debt', label: isAr ? 'كريدي' : 'Dette' },
              { id: 'check', label: isAr ? 'شيك' : 'Chèque' },
              { id: 'card', label: isAr ? 'بطاقة' : 'Carte' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMethodFilter(tab.id as MethodFilter)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  methodFilter === tab.id
                    ? "bg-accent text-white shadow-xs"
                    : "bg-bg-base text-text-secondary hover:text-text-main hover:bg-border-subtle/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 4. Modern Invoices Table Card */}
      <div className="bg-card border border-border-subtle rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table summary title */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2 bg-bg-base/20 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            <span className="text-xs font-black uppercase tracking-wider text-text-main">
              {isAr ? 'قائمة الفواتير المكتشفة' : 'Liste des Factures & Règlements'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono">
              {processedSales.length} {isAr ? 'سجل' : 'lignes'}
            </span>
          </div>

          <span className="text-xs text-text-secondary font-medium">
            {isAr ? `إجمالي الصفحة: ` : `Total affiché: `}
            <span className="font-mono font-black text-text-main">{formatNumber(kpis.totalInvoiced)} DH</span>
          </span>
        </div>

        {/* Table wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-bg-base/70 text-[10px] uppercase tracking-wider text-text-secondary font-black border-b border-border-subtle">
                <th className="py-4 px-4 sm:px-6">{isAr ? 'التاريخ والوقت' : 'Date & Heure'}</th>
                <th className="py-4 px-3 text-center">{isAr ? 'رقم الفاتورة' : 'N° Facture'}</th>
                <th className="py-4 px-4">{isAr ? 'الزبون' : 'Client'}</th>
                <th className="py-4 px-4">{isAr ? 'المستخدم / الكايس' : 'Vendeur / Caissier'}</th>
                <th className="py-4 px-4 text-center">{isAr ? 'طريقة الأداء' : 'Mode de Paiement'}</th>
                <th className="py-4 px-4 text-right">{isAr ? 'المجموع الجزئي' : 'Sous-total'}</th>
                <th className="py-4 px-4 text-right">{isAr ? 'التخفيض' : 'Remise'}</th>
                <th className="py-4 px-4 text-right">{isAr ? 'المجموع النهائي' : 'Total Net'}</th>
                <th className="py-4 px-4 sm:px-6 text-right print:hidden">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold divide-y divide-border-subtle">
              {processedSales.map((sale) => {
                const badge = getMethodBadge(sale.paymentMethod);
                const clientName = getCustomerDisplayName(sale);
                const staffName = getStaffDisplayName(sale);
                const formattedDate = new Date(sale.date).toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric'
                });
                const formattedTime = new Date(sale.date).toLocaleTimeString(isAr ? 'ar-MA' : 'fr-FR', {
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr 
                    key={sale.id} 
                    onClick={() => setViewingSale(sale)}
                    className="hover:bg-accent/5 transition-colors group cursor-pointer"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-bg-base border border-border-subtle flex items-center justify-center text-text-secondary/70 shrink-0 group-hover:border-accent/40 group-hover:text-accent transition-colors">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-text-main">{formattedDate}</div>
                          <div className="text-[10px] text-text-secondary font-mono">{formattedTime}</div>
                        </div>
                      </div>
                    </td>

                    {/* Invoice Number */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-black text-text-main bg-bg-base px-2.5 py-1 rounded-xl border border-border-subtle shadow-2xs group-hover:border-accent/40 group-hover:text-accent transition-colors">
                        #{sale.invoiceNumber || sale.id.slice(0, 6)}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 text-accent font-black text-xs flex items-center justify-center shrink-0">
                          {clientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-text-main block truncate text-xs sm:text-sm">
                            {clientName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Staff / Cashier */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-base border border-border-subtle text-xs font-bold text-text-secondary">
                        <User className="w-3 h-3 text-text-secondary/60" />
                        <span className="capitalize">{staffName}</span>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={cn("px-2.5 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider inline-block", badge.className)}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs text-text-secondary">
                      {formatNumber(sale.subtotal)} DH
                    </td>

                    {/* Discount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-xs">
                      {sale.discount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          -{formatNumber(sale.discount)} DH
                        </span>
                      ) : (
                        <span className="text-text-secondary/40">—</span>
                      )}
                    </td>

                    {/* Total Net */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono text-sm sm:text-base font-black text-accent tracking-tight">
                        {formatNumber(sale.total)} <span className="text-[10px] font-bold">DH</span>
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap print:hidden" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => setViewingSale(sale)}
                          className="p-2 rounded-xl bg-bg-base hover:bg-accent hover:text-white border border-border-subtle text-text-secondary transition-all cursor-pointer shadow-2xs"
                          title={isAr ? 'عرض التفاصيل' : 'Voir les détails'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Invoice */}
                        <button
                          onClick={() => printInvoice(sale)}
                          className="p-2 rounded-xl bg-bg-base hover:bg-emerald-600 hover:text-white border border-border-subtle text-text-secondary transition-all cursor-pointer shadow-2xs"
                          title={isAr ? 'طباعة الفاتورة' : 'Imprimer la facture'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Discount (if permitted) */}
                        {canEditDiscount && (
                          <button
                            onClick={(e) => handleEditClick(sale, e)}
                            className="p-2 rounded-xl bg-bg-base hover:bg-rose-600 hover:text-white border border-border-subtle text-text-secondary transition-all cursor-pointer shadow-2xs"
                            title={isAr ? 'تعديل التخفيض' : 'Modifier la remise'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {processedSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-text-secondary">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-bg-base border border-border-subtle mx-auto flex items-center justify-center text-text-secondary/50">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-text-main">
                        {isAr ? 'لم يتم العثور على أي فاتورة' : 'Aucune facture trouvée'}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {isAr ? 'جرب تغيير شروط البحث أو الفلترة' : 'Essayez de modifier vos filtres ou termes de recherche'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {salesTotal > 50 && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border-subtle bg-bg-base/30 print:hidden">
            <div className="text-xs font-black text-text-secondary uppercase tracking-widest font-mono">
              {isAr 
                ? `صفحة ${salesPage} من ${Math.ceil(salesTotal / 50)} (${salesTotal} فاتورة إجمالية)` 
                : `Page ${salesPage} sur ${Math.ceil(salesTotal / 50)} (${salesTotal} factures au total)`}
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={salesPage === 1}
                onClick={() => fetchSalesPage(salesPage - 1, searchQuery)}
                className="px-4 py-2 bg-card border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                {isAr ? 'السابق' : 'Précédent'}
              </button>
              <button 
                disabled={salesPage >= Math.ceil(salesTotal / 50)}
                onClick={() => fetchSalesPage(salesPage + 1, searchQuery)}
                className="px-4 py-2 bg-card border border-border-subtle rounded-xl text-xs font-bold hover:bg-bg-base disabled:opacity-50 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                {isAr ? 'التالي' : 'Suivant'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 5. Detail Modal (Voir Détails de la Facture) */}
      <AnimatePresence>
        {viewingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setViewingSale(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card rounded-3xl shadow-2xl border border-border-subtle p-6 sm:p-7 max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Close Button */}
              <button 
                onClick={() => setViewingSale(null)} 
                className="absolute top-5 right-5 p-2 bg-bg-base hover:bg-border-subtle text-text-secondary rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Receipt className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-text-main font-heading">
                      {isAr ? 'تفاصيل الفاتورة' : 'Détails de la Facture'}
                    </h3>
                    <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-bg-base border border-border-subtle text-text-main">
                      #{viewingSale.invoiceNumber || viewingSale.id.slice(0, 6)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(viewingSale.date).toLocaleString(isAr ? 'ar-MA' : 'fr-FR')}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 bg-bg-base/70 rounded-2xl border border-border-subtle">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">
                    {isAr ? 'الزبون' : 'Client'}
                  </span>
                  <span className="text-xs font-black text-text-main truncate block">
                    {getCustomerDisplayName(viewingSale)}
                  </span>
                </div>

                <div className="p-3.5 bg-bg-base/70 rounded-2xl border border-border-subtle">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">
                    {isAr ? 'المستخدم' : 'Vendeur'}
                  </span>
                  <span className="text-xs font-black text-text-main truncate block capitalize">
                    {getStaffDisplayName(viewingSale)}
                  </span>
                </div>

                <div className="p-3.5 bg-bg-base/70 rounded-2xl border border-border-subtle col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">
                    {isAr ? 'طريقة الأداء' : 'Règlement'}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase inline-block", getMethodBadge(viewingSale.paymentMethod).className)}>
                    {getMethodBadge(viewingSale.paymentMethod).label}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-y-auto mb-6 rounded-2xl border border-border-subtle bg-bg-base/30">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-base text-[10px] uppercase font-black text-text-secondary border-b border-border-subtle sticky top-0">
                    <tr>
                      <th className="p-3">{isAr ? 'المنتج' : 'Article'}</th>
                      <th className="p-3 text-center">{isAr ? 'الكمية' : 'Qté'}</th>
                      <th className="p-3 text-right">{isAr ? 'ثمن الوحدة' : 'Prix Unitaire'}</th>
                      <th className="p-3 text-right">{isAr ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle font-semibold">
                    {(viewingSale.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-card/50">
                        <td className="p-3 text-text-main font-bold">{item.name}</td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-black text-[11px]">
                            {item.qty}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-text-secondary">
                          {formatNumber(item.price)} DH
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-text-main">
                          {formatNumber(item.qty * item.price)} DH
                        </td>
                      </tr>
                    ))}

                    {(!viewingSale.items || viewingSale.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-text-secondary text-xs italic">
                          {isAr ? 'لا توجد تفاصيل للمنتجات مسجلة' : 'Aucun détail produit disponible'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Footer */}
              <div className="p-4 bg-bg-base/80 rounded-2xl border border-border-subtle space-y-2 mb-6">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{isAr ? 'المجموع الجزئي (Sous-total):' : 'Sous-total:'}</span>
                  <span className="font-mono font-bold text-text-main">{formatNumber(viewingSale.subtotal)} DH</span>
                </div>
                {viewingSale.discount > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>{isAr ? 'التخفيض المقتطع (Remise):' : 'Remise déduite:'}</span>
                    <span className="font-mono">-{formatNumber(viewingSale.discount)} DH</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-border-subtle pt-2 text-text-main">
                  <span>{isAr ? 'المجموع الصافي (Total Net):' : 'Total Net à Payer:'}</span>
                  <span className="font-mono text-base text-accent">{formatNumber(viewingSale.total)} DH</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => printInvoice(viewingSale)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-text-main text-bg-base hover:opacity-90 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة الفاتورة' : 'Imprimer la Facture'}</span>
                </button>

                {canEditDiscount && (
                  <button
                    onClick={() => {
                      const s = viewingSale;
                      setViewingSale(null);
                      handleEditClick(s);
                    }}
                    className="py-3 px-4 rounded-2xl bg-bg-base hover:bg-border-subtle border border-border-subtle text-text-main transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-4 h-4 text-accent" />
                    <span>{isAr ? 'تعديل التخفيض' : 'Remise'}</span>
                  </button>
                )}

                <button
                  onClick={() => setViewingSale(null)}
                  className="py-3 px-5 rounded-2xl bg-bg-base hover:bg-border-subtle border border-border-subtle text-text-secondary font-bold text-xs cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Fermer'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Edit Discount Modal */}
      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setEditingSale(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border-subtle p-6 sm:p-7"
            >
              <button 
                onClick={() => !isSubmitting && setEditingSale(null)} 
                className="absolute top-5 right-5 p-2 bg-bg-base hover:bg-border-subtle text-text-secondary rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-black mb-6 text-text-main flex items-center gap-2 font-heading">
                <Edit2 className="w-5 h-5 text-accent" />
                {isAr ? 'تعديل تخفيض الفاتورة' : 'Modifier la Remise'}
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-bg-base/70 rounded-2xl border border-border-subtle space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{isAr ? 'رقم الفاتورة:' : 'N° Facture:'}</span>
                    <span className="font-mono font-bold text-text-main">#{editingSale.invoiceNumber || editingSale.id.slice(0, 6)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{isAr ? 'المجموع الجزئي:' : 'Sous-total:'}</span>
                    <span className="font-mono font-bold text-text-main">{formatNumber(editingSale.subtotal)} DH</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border-subtle pt-2 mt-2 font-black">
                    <span className="text-text-main">{isAr ? 'المجموع الجديد:' : 'Nouveau Total:'}</span>
                    <span className="font-mono text-accent text-base">{formatNumber(Math.max(0, editingSale.subtotal - newDiscount))} DH</span>
                  </div>
                </div>

                {/* Preset quick discount buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-text-secondary px-1">
                    {isAr ? 'اقتراحات سريعة:' : 'Suggestions rapides:'}
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[20, 50, 100, 200].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setNewDiscount(Math.min(editingSale.subtotal, amt))}
                        className="py-1.5 px-2 bg-bg-base hover:bg-accent/10 hover:text-accent border border-border-subtle rounded-xl text-xs font-mono font-bold transition-all"
                      >
                        -{amt} DH
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">
                    {isAr ? 'مبلغ التخفيض (DH):' : 'Montant de la remise (DH):'}
                  </label>
                  <input
                    type="number"
                    value={newDiscount === 0 ? '' : newDiscount}
                    onChange={(e) => setNewDiscount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={editingSale.subtotal}
                    step="0.01"
                    className="w-full bg-bg-base border-2 border-border-subtle rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-all text-text-main font-bold font-mono"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingSale(null)}
                    disabled={isSubmitting}
                    className="flex-1 bg-bg-base hover:bg-border-subtle text-text-main font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50 text-xs cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    onClick={handleSaveDiscount}
                    disabled={isSubmitting || newDiscount < 0 || newDiscount > editingSale.subtotal}
                    className="flex-1 bg-accent hover:opacity-90 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Enregistrement...') : (isAr ? 'حفظ التغييرات' : 'Enregistrer')}
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
