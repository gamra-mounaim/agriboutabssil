import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Store, Plus, Edit2, Trash2, Printer, X, Hash,
  CreditCard, ChevronDown, ChevronUp, AlertTriangle,
  Phone, Mail, MapPin, Calendar, TrendingDown, TrendingUp,
  ArrowUpDown, CheckCircle2, Copy, Check, Package, Receipt,
  Wallet, CalendarClock, ArrowRightLeft, ShieldCheck, FileText,
  Filter, LayoutGrid, Table, ArrowRight, User, Sparkles, Building2,
  Clock, AlertCircle
} from 'lucide-react';

function getSupplierInitials(name?: string) {
  if (!name) return 'FR';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s\u0600-\u06FF]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

import { formatNumber, cn } from '../utils';
import { Supplier, TransactionRecord, moroccanBanks } from '../types';
import { translations } from '../translations';
import { useStore, useAuthStore } from '../store/useStore';
import { api } from '../services/apiService';
import { generateStatementPDF } from '../services/invoiceService';

type SortKey = 'debt_desc' | 'debt_asc' | 'name_asc' | 'name_desc' | 'stock_desc';
type StatusFilter = 'all' | 'debt' | 'settled' | 'overdue';

// ─── Due date helpers ────────────────────────────────────────────────────────
function getDueDateStatus(dateStr?: string): 'overdue' | 'soon' | 'ok' | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'overdue';
  if (diff <= 7) return 'soon';
  return 'ok';
}

export default function SupplierList({ permissions }: { permissions: any }) {
  const { suppliers, checks, settings, fetchData: onRefresh, setMessage } = useStore();
  const { language } = useAuthStore();

  const t = translations[language];
  const canViewDebtAmount = permissions ? permissions.viewSupplierDebtAmount !== false : true;

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<'suppliers' | 'checks'>('suppliers');

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // ── Add supplier toggle & form ──
  const [showAddForm, setShowAddForm]       = useState(false);
  const [name, setName]                     = useState('');
  const [initialDebt, setInitialDebt]       = useState('0');
  const [phone, setPhone]                   = useState('');
  const [email, setEmail]                   = useState('');
  const [address, setAddress]               = useState('');
  const [supplierDueDate, setSupplierDueDate] = useState('');
  const [submittingAdd, setSubmittingAdd]   = useState(false);

  // ── List controls & filters ──
  const [searchSupplier, setSearchSupplier] = useState('');
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('all');
  const [sortKey, setSortKey]               = useState<SortKey>('debt_desc');
  const [showSortMenu, setShowSortMenu]     = useState(false);

  // ── Checks controls ──
  const [checkSearch, setCheckSearch]       = useState('');

  // ── Supplier detail / edit ──
  const [selectedSupplier, setSelectedSupplier]   = useState<Supplier | null>(null);
  const [supplierHistory, setSupplierHistory]     = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory]       = useState(false);
  const [isEditingProfile, setIsEditingProfile]   = useState(false);
  const [editForm, setEditForm]                   = useState({ name: '', email: '', phone: '', address: '', due_date: '' });
  const [historySearch, setHistorySearch]         = useState('');
  const [historyFilter, setHistoryFilter]         = useState<'all' | 'payment' | 'debt' | 'check'>('all');
  const [copiedPhone, setCopiedPhone]             = useState(false);

  // ── Delete confirm ──
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // ── Payment / charge modal ──
  const [adjustModal, setAdjustModal]           = useState<{ type: 'pay' | 'charge'; supplier: Supplier } | null>(null);
  const [adjustAmount, setAdjustAmount]         = useState('');
  const [adjustMethod, setAdjustMethod]         = useState<'CASH' | 'CHECK'>('CASH');
  const [checkNum, setCheckNum]                 = useState('');
  const [checkOwner, setCheckOwner]             = useState('');
  const [checkBankSupplier, setCheckBankSupplier] = useState('');
  const [dueDate, setDueDate]                   = useState('');
  const [adjustNote, setAdjustNote]             = useState('');

  // ── Derived totals ──
  const totalDebt = useMemo(() => suppliers.reduce((s, x) => s + (x.debt || 0), 0), [suppliers]);
  const totalSold = useMemo(() => suppliers.reduce((s, x) => s + (x.soldValue || 0), 0), [suppliers]);
  const totalStock = useMemo(() => suppliers.reduce((s, x) => s + (x.stockValue || 0), 0), [suppliers]);
  const totalProfit = useMemo(() => suppliers.reduce((s, x) => s + (x.profit || 0), 0), [suppliers]);

  const suppliersWithDebt = useMemo(() => suppliers.filter(s => s.debt > 0), [suppliers]);
  const overdueSuppliers = useMemo(() => suppliers.filter(s => {
    const d = s.dueDate || s.due_date;
    return s.debt > 0 && getDueDateStatus(d) === 'overdue';
  }), [suppliers]);
  const soonSuppliers = useMemo(() => suppliers.filter(s => {
    const d = s.dueDate || s.due_date;
    return s.debt > 0 && getDueDateStatus(d) === 'soon';
  }), [suppliers]);

  // ── Derived checks data ──
  const supplierChecks = useMemo(() => checks.filter(c => c.partyRole === 'supplier'), [checks]);
  const totalChecksAmount = useMemo(() => supplierChecks.reduce((acc, c) => acc + (c.total || 0), 0), [supplierChecks]);

  const filteredChecks = useMemo(() => {
    const q = checkSearch.toLowerCase().trim();
    if (!q) return supplierChecks;
    return supplierChecks.filter(c => 
      c.partyName.toLowerCase().includes(q) ||
      c.checkNumber.toLowerCase().includes(q) ||
      (c.checkOwner && c.checkOwner.toLowerCase().includes(q))
    );
  }, [supplierChecks, checkSearch]);

  const sortLabels: Record<SortKey, string> = {
    debt_desc:  language === 'ar' ? 'الدين الأعلى' : language === 'fr' ? 'Dette : Haute → Basse' : 'Debt: High → Low',
    debt_asc:   language === 'ar' ? 'الدين الأدنى' : language === 'fr' ? 'Dette : Basse → Haute' : 'Debt: Low → High',
    name_asc:   language === 'ar' ? 'الاسم أ → ي'  : language === 'fr' ? 'Nom : A → Z'          : 'Name: A → Z',
    name_desc:  language === 'ar' ? 'الاسم ي → أ'  : language === 'fr' ? 'Nom : Z → A'          : 'Name: Z → A',
    stock_desc: language === 'ar' ? 'المخزون الأعلى' : language === 'fr' ? 'Stock : Élevé → Bas' : 'Stock: High → Low',
  };

  const filteredSuppliers = useMemo(() => {
    const q = searchSupplier.toLowerCase().trim();
    return suppliers
      .filter(s => {
        if (q) {
          const matchesName = s.name.toLowerCase().includes(q);
          const matchesPhone = s.phone && s.phone.toLowerCase().includes(q);
          const matchesEmail = s.email && s.email.toLowerCase().includes(q);
          const matchesAddress = s.address && s.address.toLowerCase().includes(q);
          if (!matchesName && !matchesPhone && !matchesEmail && !matchesAddress) return false;
        }
        if (statusFilter === 'debt' && !(s.debt > 0)) return false;
        if (statusFilter === 'settled' && s.debt > 0) return false;
        if (statusFilter === 'overdue') {
          const due = s.dueDate || s.due_date;
          const st = getDueDateStatus(due);
          if (!(s.debt > 0 && (st === 'overdue' || st === 'soon'))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'name_asc')  return a.name.localeCompare(b.name);
        if (sortKey === 'name_desc') return b.name.localeCompare(a.name);
        if (sortKey === 'debt_desc') return b.debt - a.debt;
        if (sortKey === 'debt_asc')  return a.debt - b.debt;
        if (sortKey === 'stock_desc') return (b.stockValue || 0) - (a.stockValue || 0);
        return 0;
      });
  }, [suppliers, searchSupplier, sortKey, statusFilter]);

  // ── Running balance in history ──
  const historyWithBalance = useMemo(() => {
    if (!supplierHistory.length) return [];
    const sorted = [...supplierHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    return sorted.map(h => {
      if (h.type === 'DEBT')    running += h.amount;
      if (h.type === 'PAYMENT') running -= h.amount;
      return { ...h, runningBalance: running };
    }).reverse(); // show newest first
  }, [supplierHistory]);

  const supplierStats = useMemo(() => {
    if (!supplierHistory.length) return { totalDebts: 0, totalPayments: 0, count: 0 };
    let totalDebts = 0;
    let totalPayments = 0;
    supplierHistory.forEach(h => {
      if (h.type === 'DEBT')    totalDebts += (h.amount || 0);
      if (h.type === 'PAYMENT') totalPayments += (h.amount || 0);
    });
    return { totalDebts, totalPayments, count: supplierHistory.length };
  }, [supplierHistory]);

  const historyCounts = useMemo(() => {
    let payment = 0;
    let debt = 0;
    let check = 0;
    historyWithBalance.forEach(h => {
      if (h.type === 'PAYMENT') payment++;
      if (h.type === 'DEBT')    debt++;
      if (h.payment_method === 'CHECK' || h.description?.toLowerCase().includes('chèque') || h.description?.toLowerCase().includes('check')) check++;
    });
    return { all: historyWithBalance.length, payment, debt, check };
  }, [historyWithBalance]);

  const filteredSupplierHistory = useMemo(() => {
    if (!historyWithBalance.length) return [];
    const q = historySearch.trim().toLowerCase();
    return historyWithBalance.filter(h => {
      if (historyFilter === 'payment' && h.type !== 'PAYMENT') return false;
      if (historyFilter === 'debt' && h.type !== 'DEBT') return false;
      if (historyFilter === 'check' && h.payment_method !== 'CHECK' && !h.description?.toLowerCase().includes('chèque') && !h.description?.toLowerCase().includes('check')) return false;

      if (q) {
        const matchDesc = h.description && h.description.toLowerCase().includes(q);
        const matchCheck = h.check_number && h.check_number.toLowerCase().includes(q);
        const matchAmount = h.amount && h.amount.toString().includes(q);
        if (!matchDesc && !matchCheck && !matchAmount) return false;
      }
      return true;
    });
  }, [historyWithBalance, historySearch, historyFilter]);

  // ── Handlers ──
  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmittingAdd(true);
    try {
      await api.addSupplier({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        address: address.trim(), 
        debt: parseFloat(initialDebt) || 0, 
        due_date: supplierDueDate || null 
      });
      setName(''); setInitialDebt('0'); setPhone(''); setEmail(''); setAddress(''); setSupplierDueDate('');
      setShowAddForm(false);
      onRefresh();
      setMessage({ text: language === 'ar' ? 'تمت إضافة المورد بنجاح.' : language === 'fr' ? 'Fournisseur ajouté avec succès.' : 'Supplier added successfully.', type: 'success' });
    } catch { 
      setMessage({ text: language === 'ar' ? 'فشل إضافة المورد.' : language === 'fr' ? "Échec de l'ajout du fournisseur." : 'Failed to add supplier.', type: 'error' }); 
    } finally {
      setSubmittingAdd(false);
    }
  };

  const openDetails = async (s: Supplier) => {
    setSelectedSupplier(s);
    setEditForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', due_date: s.dueDate || s.due_date || '' });
    setIsEditingProfile(false);
    setHistorySearch('');
    setHistoryFilter('all');
    setLoadingHistory(true);
    try { setSupplierHistory(await api.getSupplierHistory(s.id)); } catch { /* silent */ }
    setLoadingHistory(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await api.updateSupplier(selectedSupplier.id, { ...editForm, debt: selectedSupplier.debt });
      setIsEditingProfile(false);
      onRefresh();
      setSelectedSupplier({ ...selectedSupplier, ...editForm });
      setMessage({ text: t.profileUpdated, type: 'success' });
    } catch { setMessage({ text: t.updateFailed, type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.deleteSupplier(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
      setMessage({ text: language === 'ar' ? 'تم حذف المورد.' : language === 'fr' ? 'Fournisseur supprimé.' : 'Supplier deleted.', type: 'success' });
    } catch { setMessage({ text: language === 'ar' ? 'فشل الحذف.' : language === 'fr' ? 'Échec suppression.' : 'Delete failed.', type: 'error' }); }
    setDeleting(false);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustAmount) return;
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      if (adjustModal.type === 'pay') {
        await api.addSupplierPayment(adjustModal.supplier.id, {
          amount: amt, payment_method: adjustMethod,
          check_number:   adjustMethod === 'CHECK' ? checkNum : null,
          check_due_date: adjustMethod === 'CHECK' ? dueDate  : null,
          check_owner:    adjustMethod === 'CHECK' ? (checkBankSupplier && checkBankSupplier !== 'بنك آخر...' ? `${checkBankSupplier} | ${checkOwner}` : checkOwner) : null,
        });
        setMessage({ text: language === 'ar' ? 'تم تسجيل الدفع بنجاح.' : language === 'fr' ? 'Paiement fournisseur enregistré.' : 'Payment posted.', type: 'success' });
      } else {
        await api.addSupplierCharge(adjustModal.supplier.id, amt, adjustNote);
        setMessage({ text: language === 'ar' ? 'تمت إضافة الدين بنجاح.' : language === 'fr' ? 'Dette ajoutée avec succès.' : 'Debt added.', type: 'success' });
      }
      setAdjustModal(null); setAdjustAmount(''); setAdjustMethod('CASH');
      setCheckNum('');
      setCheckOwner(''); setCheckBankSupplier(''); setDueDate(''); setAdjustNote('');
      onRefresh();
    } catch { setMessage({ text: language === 'ar' ? 'فشلت العملية.' : language === 'fr' ? 'Opération échouée.' : 'Operation failed.', type: 'error' }); }
  };

  // ── Due Badge ──
  const dueBadge = (dateStr?: string) => {
    const status = getDueDateStatus(dateStr);
    if (!status || status === 'ok') return null;
    const label = status === 'overdue'
      ? (language === 'ar' ? 'متأخر' : language === 'fr' ? 'En retard' : 'Overdue')
      : (language === 'ar' ? 'قريباً' : language === 'fr' ? 'Bientôt' : 'Due soon');
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs',
        status === 'overdue' 
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300' 
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300'
      )}>
        <AlertTriangle className={cn("w-2.5 h-2.5", status === 'overdue' && "animate-pulse")} />
        {label}
      </span>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-24 px-1 sm:px-2 md:px-4">

      {/* ── TOP HEADER & TABS BAR ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card/60 border border-border-subtle/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm">
        
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent/20 via-accent/10 to-transparent flex items-center justify-center text-accent border border-accent/20 shadow-xs">
            <Store className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
                {t.suppliers}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-accent/10 text-accent border border-accent/20 font-mono">
                {suppliers.length}
              </span>
            </div>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">
              {language === 'ar' 
                ? 'إدارة الموردين، متابعة الديون، البضائع بالمخزون، والشيكات'
                : 'Gestion des approvisionnements, encours des dettes et règlements'}
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Tabs */}
          <div className="flex p-1 bg-bg-base/80 dark:bg-slate-900/80 border border-border-subtle rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={cn(
                'px-4 sm:px-5 py-2 rounded-xl font-black text-xs tracking-wider transition-all duration-200 uppercase flex items-center gap-2',
                activeTab === 'suppliers'
                  ? 'bg-card text-accent shadow-sm border border-border-subtle/60'
                  : 'text-text-secondary hover:text-text-main'
              )}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{t.suppliers}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                activeTab === 'suppliers' ? "bg-accent/15 text-accent" : "bg-border-subtle/40 text-text-secondary"
              )}>
                {suppliers.length}
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
              <span>{t.supplierChecks}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                activeTab === 'checks' ? "bg-accent/15 text-accent" : "bg-border-subtle/40 text-text-secondary"
              )}>
                {supplierChecks.length}
              </span>
            </button>
          </div>

          {/* Quick Add Supplier Toggle Button */}
          {activeTab === 'suppliers' && (
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
                  <span>{t.addSupplier}</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>

      {activeTab === 'suppliers' ? (
        <>
          {/* ── 4-METRIC EXECUTIVE KPI GRID (FULL-WIDTH) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* KPI 1: Total Fournisseurs */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                  {t.suppliers}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-900/40 shadow-xs">
                  <Store className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-text-main font-mono tracking-tight">
                  {suppliers.length}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-text-main font-black">{suppliersWithDebt.length}</span> {language === 'ar' ? 'بحساب مفتوح' : 'avec solde débiteur'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Dette Totale */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  {t.totalSupplierDebt}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-900/40 shadow-xs">
                  <TrendingDown className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  {canViewDebtAmount ? (
                    <>
                      <span>{formatNumber(totalDebt)}</span>
                      <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                    </>
                  ) : '***'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {overdueSuppliers.length > 0 ? (
                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/70 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-900/50">
                      <AlertTriangle className="w-3 h-3 animate-pulse" />
                      {overdueSuppliers.length} {language === 'ar' ? 'متأخر في الأداء' : 'en retard d\'échéance'}
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

            {/* KPI 3: Marchandises Vendues */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">
                  {language === 'ar' ? 'إجمالي السلع المباعة' : 'Total Vendu'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-900/40 shadow-xs">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 font-mono tracking-tight">
                  {canViewDebtAmount ? (
                    <>
                      <span>{formatNumber(totalSold)}</span>
                      <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                    </>
                  ) : '***'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {language === 'ar' ? 'بضائع تم تصريفها للزبائن' : 'Marchandises écoulées'}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Valeur Restante en Stock */}
            <div className="bg-card border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                  {language === 'ar' ? 'قيمة السلع بالمخزون' : 'Valeur en Stock'}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-900/40 shadow-xs">
                  <Package className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                  {canViewDebtAmount ? (
                    <>
                      <span>{formatNumber(totalStock)}</span>
                      <span className="text-sm font-black text-text-secondary ml-1.5">{t.currency}</span>
                    </>
                  ) : '***'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {language === 'ar' ? 'سلع متواجدة بالمحل حالياً' : 'Actifs en magasin'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ── ADD SUPPLIER FORM (COLLAPSIBLE / EXPANDABLE) ── */}
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
                          {t.addSupplier}
                        </h3>
                        <p className="text-[11px] font-bold text-text-secondary">
                          {language === 'ar' ? 'سجل بيانات المورد ورصيد الدين الأولي وتاريخ الاستحقاق' : 'Remplissez les informations pour ajouter un nouveau partenaire'}
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

                  <form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Nom */}
                    <div className="lg:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-accent" />
                        <span>{t.supplierName}</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: شركة المغرب للأسمدة...' : 'ex: AGRI PHOS MAROC'}
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

                    {/* Email */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-accent" />
                        <span>{t.email}</span>
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="contact@domaine.ma"
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Initial Debt */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                        <span>{t.supplierDebt}</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={initialDebt}
                          onChange={e => setInitialDebt(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 pl-4 pr-10 text-sm font-black text-rose-600 focus:border-accent outline-none shadow-2xs font-mono transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-secondary/60">
                          DH
                        </span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="lg:col-span-1 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>{t.dueDate}</span>
                      </label>
                      <input
                        type="date"
                        value={supplierDueDate}
                        onChange={e => setSupplierDueDate(e.target.value)}
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-3 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    {/* Address & Submit Button */}
                    <div className="lg:col-span-4 space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span>{t.address}</span>
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder={language === 'ar' ? 'العنوان / المدينة / المنطقة الفلاحية' : 'Adresse, ville, zone...'}
                        className="w-full bg-bg-base/70 border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-2xs transition-all"
                      />
                    </div>

                    <div className="lg:col-span-2 flex items-end">
                      <button
                        type="submit"
                        disabled={submittingAdd}
                        className="w-full bg-accent text-white py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-98 transition-all disabled:opacity-60"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>{submittingAdd ? '...' : t.confirm}</span>
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
                value={searchSupplier}
                onChange={e => setSearchSupplier(e.target.value)}
                placeholder={language === 'ar' ? 'بحث بالاسم، الهاتف، البريد أو العنوان...' : 'Rechercher fournisseur par nom, téléphone, email...'}
                className={cn(
                  'w-full bg-bg-base/80 border border-border-subtle rounded-2xl py-2.5 text-sm font-bold focus:border-accent outline-none transition-all',
                  language === 'ar' ? 'pr-11 pl-10 text-right' : 'pl-11 pr-10'
                )}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
              {searchSupplier && (
                <button
                  type="button"
                  onClick={() => setSearchSupplier('')}
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
                { key: 'all' as const, label: language === 'ar' ? 'الكل' : 'Tous', count: suppliers.length },
                { key: 'debt' as const, label: language === 'ar' ? 'عليهم دين' : 'En Dette', count: suppliersWithDebt.length },
                { key: 'settled' as const, label: language === 'ar' ? 'مسوّى' : 'Soldés', count: suppliers.length - suppliersWithDebt.length },
                { key: 'overdue' as const, label: language === 'ar' ? 'متأخر/قريب' : 'Échéance', count: overdueSuppliers.length + soonSuppliers.length },
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

            {/* Sort Dropdown & View Mode Switcher */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              
              {/* Sort Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(v => !v)}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-bg-base border border-border-subtle rounded-2xl text-xs font-black uppercase tracking-wider text-text-secondary hover:text-text-main hover:border-accent transition-all whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden sm:inline">{sortLabels[sortKey]}</span>
                  <span className="sm:hidden">{language === 'ar' ? 'ترتيب' : 'Trier'}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', showSortMenu && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      className="absolute top-full mt-2 right-0 z-30 bg-card border border-border-subtle rounded-2xl shadow-xl overflow-hidden min-w-[210px]"
                    >
                      {(Object.keys(sortLabels) as SortKey[]).map(k => (
                        <button
                          key={k}
                          onClick={() => { setSortKey(k); setShowSortMenu(false); }}
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

            </div>

          </div>

          {/* ── SUPPLIER CARDS (4-COLUMNS ON WIDE SCREENS) ── */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSuppliers.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40 gap-3 border-2 border-dashed border-border-subtle rounded-3xl bg-card/40">
                  <Store className="w-12 h-12 stroke-[1.5]" />
                  <p className="text-sm font-black uppercase tracking-widest text-text-secondary">
                    {language === 'ar' ? 'لا يوجد مورد مطابق للبحث' : 'Aucun fournisseur trouvé'}
                  </p>
                  {searchSupplier && (
                    <button
                      onClick={() => { setSearchSupplier(''); setStatusFilter('all'); }}
                      className="text-xs text-accent font-bold underline"
                    >
                      {language === 'ar' ? 'مسح الفلاتر' : 'Réinitialiser les filtres'}
                    </button>
                  )}
                </div>
              ) : (
                filteredSuppliers.map(s => {
                  const due = s.dueDate || s.due_date;
                  const dueStatus = getDueDateStatus(due);
                  const hasDebt = s.debt > 0;

                  return (
                    <motion.div
                      layout
                      key={s.id}
                      className="bg-card border border-border-subtle/90 hover:border-accent/40 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative flex flex-col justify-between"
                    >
                      {/* Top colored accent indicator */}
                      <div className={cn(
                        'h-1.5 w-full transition-colors',
                        hasDebt 
                          ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-400' 
                          : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400'
                      )} />

                      <div className="p-5 flex flex-col flex-1">
                        
                        {/* Header: Avatar, Name, Debt Pill & Trash */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Supplier Initials Avatar */}
                            <div className={cn(
                              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm ring-2 ring-card",
                              hasDebt 
                                ? "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 dark:from-slate-700 dark:to-slate-800" 
                                : "bg-gradient-to-br from-emerald-600 to-teal-600"
                            )}>
                              {getSupplierInitials(s.name)}
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-black text-base text-text-main group-hover:text-accent transition-colors leading-tight truncate" title={s.name}>
                                {s.name}
                              </h4>
                              {s.phone ? (
                                <a
                                  href={`tel:${s.phone}`}
                                  className="text-[11px] text-text-secondary hover:text-accent font-semibold flex items-center gap-1 font-mono mt-0.5"
                                >
                                  <Phone className="w-3 h-3 text-text-secondary/70 shrink-0" />
                                  <span>{s.phone}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-text-secondary/50 italic">
                                  {language === 'ar' ? 'لا يوجد هاتف' : 'Sans téléphone'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete Action Icon */}
                          <button
                            onClick={() => setDeleteConfirm(s)}
                            className="p-1.5 rounded-xl text-text-secondary/60 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
                            title={language === 'ar' ? 'حذف' : 'Supprimer'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Status row: Debt amount pill & Due badge */}
                        <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
                          {canViewDebtAmount ? (
                            hasDebt ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 font-mono tracking-tight shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>{formatNumber(s.debt)}</span>
                                <span className="text-[10px] font-bold uppercase">{t.currency}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{language === 'ar' ? 'الحساب مسوّى' : 'Compte soldé (0 DH)'}</span>
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-mono font-bold text-text-secondary">***</span>
                          )}

                          {due && dueBadge(due)}
                        </div>

                        {/* 3 Metric Cards: VENDU / EN STOCK / BÉNÉFICE */}
                        <div className="grid grid-cols-3 gap-2 my-1">
                          
                          {/* Vendu */}
                          <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              {language === 'ar' ? 'ما تم بيعه' : 'Vendu'}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono truncate mt-1">
                              {canViewDebtAmount ? formatNumber(s.soldValue || 0) : '***'}
                            </span>
                          </div>

                          {/* En stock */}
                          <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                              {language === 'ar' ? 'بالمخزون' : 'En stock'}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums font-mono truncate mt-1">
                              {canViewDebtAmount ? formatNumber(s.stockValue || 0) : '***'}
                            </span>
                          </div>

                          {/* Bénéfice */}
                          <div className="p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                              {language === 'ar' ? 'الربح' : 'Bénéfice'}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums font-mono truncate mt-1">
                              {canViewDebtAmount ? formatNumber(s.profit || 0) : '***'}
                            </span>
                          </div>

                        </div>

                        {/* Action buttons: Régler & Nouvelle Dette */}
                        {canViewDebtAmount && (
                          <div className="grid grid-cols-2 gap-2 mt-4 mb-3">
                            <button
                              onClick={() => setAdjustModal({ type: 'pay', supplier: s })}
                              className="bg-accent text-white py-2.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-md hover:bg-accent/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>{t.paySupplier}</span>
                            </button>
                            <button
                              onClick={() => setAdjustModal({ type: 'charge', supplier: s })}
                              className="bg-bg-base dark:bg-white/5 border border-border-subtle hover:border-accent text-text-main hover:text-accent py-2.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{t.newSupplierCharge}</span>
                            </button>
                          </div>
                        )}

                        {/* Footer: Details & Statement PDF */}
                        <div className="flex items-center justify-between pt-3 border-t border-border-subtle/60 mt-auto text-xs">
                          <button
                            onClick={() => openDetails(s)}
                            className="py-1 text-[10px] font-black text-text-secondary hover:text-accent uppercase tracking-wider transition-colors flex items-center gap-1 group/btn"
                          >
                            <span>{t.view} {t.supplierDetails}</span>
                            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>

                          {canViewDebtAmount && (
                            <button
                              onClick={async () => {
                                const history = await api.getSupplierHistory(s.id);
                                generateStatementPDF({ entityName: s.name, remainingDebt: s.debt, transactions: history, type: 'supplier' }, language, settings);
                              }}
                              className="py-1 px-2.5 rounded-xl text-[10px] font-black text-accent bg-accent/10 hover:bg-accent/20 uppercase tracking-wider flex items-center gap-1.5 transition-all"
                              title="Générer relevé de compte PDF"
                            >
                              <Printer className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            /* ── COMPACT TABLE VIEW FOR POWER USERS ── */
            <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-bg-base/60 border-b border-border-subtle text-[10px] font-black uppercase tracking-wider text-text-secondary">
                      <th className="py-4 px-6">{t.supplierName}</th>
                      <th className="py-4 px-4">{t.phone}</th>
                      <th className="py-4 px-4 text-right">{t.supplierDebt}</th>
                      <th className="py-4 px-4 text-right">{language === 'ar' ? 'ما تم بيعه' : 'Vendu'}</th>
                      <th className="py-4 px-4 text-right">{language === 'ar' ? 'بالمخزون' : 'En stock'}</th>
                      <th className="py-4 px-4 text-right">{language === 'ar' ? 'الربح' : 'Bénéfice'}</th>
                      <th className="py-4 px-4">{t.dueDate}</th>
                      <th className="py-4 px-6 text-right">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/50 text-sm font-semibold">
                    {filteredSuppliers.map(s => {
                      const due = s.dueDate || s.due_date;
                      return (
                        <tr key={s.id} className="hover:bg-bg-base/40 transition-colors group">
                          {/* Name + Initials */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent font-black text-[11px] flex items-center justify-center shrink-0">
                                {getSupplierInitials(s.name)}
                              </div>
                              <span className="font-black text-text-main group-hover:text-accent transition-colors">{s.name}</span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                            {s.phone || '---'}
                          </td>

                          {/* Debt */}
                          <td className="py-3.5 px-4 text-right">
                            {canViewDebtAmount ? (
                              <span className={cn(
                                "font-mono font-black",
                                s.debt > 0 ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {formatNumber(s.debt)} {t.currency}
                              </span>
                            ) : '***'}
                          </td>

                          {/* Vendu */}
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">
                            {canViewDebtAmount ? formatNumber(s.soldValue || 0) : '***'}
                          </td>

                          {/* Stock */}
                          <td className="py-3.5 px-4 text-right font-mono text-indigo-600 font-bold">
                            {canViewDebtAmount ? formatNumber(s.stockValue || 0) : '***'}
                          </td>

                          {/* Bénéfice */}
                          <td className="py-3.5 px-4 text-right font-mono text-blue-600 font-bold">
                            {canViewDebtAmount ? formatNumber(s.profit || 0) : '***'}
                          </td>

                          {/* Due Date */}
                          <td className="py-3.5 px-4 text-xs">
                            {due ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-text-secondary">{new Date(due).toLocaleDateString()}</span>
                                {dueBadge(due)}
                              </div>
                            ) : (
                              <span className="text-text-secondary/50">---</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canViewDebtAmount && (
                                <button
                                  onClick={() => setAdjustModal({ type: 'pay', supplier: s })}
                                  className="px-2.5 py-1 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-wider hover:bg-accent/90 transition-all"
                                >
                                  {t.paySupplier}
                                </button>
                              )}
                              <button
                                onClick={() => openDetails(s)}
                                className="p-1.5 rounded-xl border border-border-subtle hover:bg-card text-text-secondary hover:text-accent transition-all"
                                title={t.supplierDetails}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
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
        /* ── CHECKS TAB (FULL-WIDTH MODERN VIEW) ── */
        <div className="space-y-5">
          {/* Checks Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border-subtle rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                  {language === 'ar' ? 'عدد الشيكات' : 'Nombre de Chèques'}
                </p>
                <p className="text-2xl font-black text-text-main font-mono mt-1">{supplierChecks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border-subtle rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  {language === 'ar' ? 'مجموع مبالغ الشيكات' : 'Montant Total Chèques'}
                </p>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {formatNumber(totalChecksAmount)} {t.currency}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border-subtle rounded-3xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  {language === 'ar' ? 'شيكات مدفوعة للموردين' : 'Règlements Fournisseurs'}
                </p>
                <p className="text-2xl font-black text-indigo-600 font-mono mt-1">
                  {supplierChecks.length} {language === 'ar' ? 'شيك' : 'chèques'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Checks Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute top-1/2 -translate-y-1/2 left-4" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث برقم الشيك أو اسم المورد أو المالك...' : 'Rechercher par numéro de chèque, fournisseur, titulaire...'}
              value={checkSearch}
              onChange={e => setCheckSearch(e.target.value)}
              className="w-full bg-card border border-border-subtle rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:border-accent outline-none shadow-xs"
            />
          </div>

          {/* Checks Table */}
          <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-bg-base/70 border-b border-border-subtle text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    <th className="py-4 px-6">{t.date}</th>
                    <th className="py-4 px-4">{t.supplierName}</th>
                    <th className="py-4 px-4">{t.checkNumber}</th>
                    <th className="py-4 px-4 text-right">{t.amount}</th>
                    <th className="py-4 px-6">{t.checkOwner}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-sm">
                  {filteredChecks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-text-secondary opacity-40">
                        <CreditCard className="w-12 h-12 mx-auto mb-3 stroke-[1.5]" />
                        <p className="text-xs font-black uppercase tracking-widest">{t.noChecks}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredChecks.map(c => (
                      <tr key={c.id} className="hover:bg-bg-base/50 transition-colors group">
                        <td className="py-4 px-6 font-mono text-xs font-semibold text-text-secondary">
                          {new Date(c.date).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-black text-text-main group-hover:text-accent transition-colors">
                            {c.partyName}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-xs font-bold px-2 py-1 bg-bg-base border border-border-subtle rounded-lg flex items-center gap-1.5 w-fit">
                            <Hash className="w-3 h-3 text-text-secondary" />
                            {c.checkNumber}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-emerald-600 text-base">
                          {formatNumber(c.total)} {t.currency}
                        </td>
                        <td className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase">
                          {c.checkOwner || '---'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODALS ════════ */}
      <AnimatePresence>

        {/* ── DELETE CONFIRM MODAL ── */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-3xl shadow-2xl p-7 border border-border-subtle text-center"
            >
              <div className="w-14 h-14 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2">
                {language === 'ar' ? 'حذف المورد' : language === 'fr' ? 'Supprimer le fournisseur' : 'Delete Supplier'}
              </h3>
              <p className="text-sm text-text-secondary mb-6 font-medium">
                {language === 'ar' ? `هل أنت متأكد من حذف "${deleteConfirm.name}"؟` : language === 'fr' ? `Supprimer "${deleteConfirm.name}" définitivement ?` : `Delete "${deleteConfirm.name}"?`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-bg-base border border-border-subtle text-text-secondary font-black rounded-2xl text-xs uppercase tracking-wider hover:border-text-secondary/30 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 bg-rose-600 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-600/20 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {deleting ? '...' : (language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── SUPPLIER DETAIL & HISTORY MODAL ── */}
        {selectedSupplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-border-subtle/80 bg-bg-base/50 flex justify-between items-start gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0 ring-4 ring-emerald-500/10">
                    {getSupplierInitials(selectedSupplier.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black tracking-widest uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                        {t.supplierDetails}
                      </span>
                      {canViewDebtAmount && (
                        selectedSupplier.debt > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {language === 'ar' ? 'الرصيد المستحق' : 'Montant Dû'}: <span className="font-black">{formatNumber(selectedSupplier.debt)}</span> {t.currency}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {language === 'ar' ? 'الحساب مسوّى' : 'Compte soldé'}
                          </span>
                        )
                      )}
                    </div>
                    {isEditingProfile ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.supplierName}</label>
                        <input
                          className="text-xl font-black bg-bg-base border border-border-subtle rounded-xl px-3 py-1.5 w-full outline-none focus:ring-2 focus:ring-accent"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                    ) : (
                      <h3 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight truncate">
                        {selectedSupplier.name}
                      </h3>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canViewDebtAmount && !isEditingProfile && (
                    <button
                      onClick={() => generateStatementPDF({ entityName: selectedSupplier.name, remainingDebt: selectedSupplier.debt, transactions: supplierHistory, type: 'supplier' }, language, settings)}
                      className="p-2.5 rounded-2xl border border-border-subtle hover:bg-bg-base text-accent font-black text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                      title={t.generateStatement}
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.generateStatement}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingProfile(v => !v)}
                    className={cn(
                      'p-2.5 rounded-2xl border border-border-subtle transition-all flex items-center gap-1.5 text-xs font-black',
                      isEditingProfile ? 'bg-accent/15 text-accent ring-2 ring-accent/30' : 'hover:bg-bg-base text-text-secondary hover:text-text-main'
                    )}
                    title={isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}</span>
                  </button>
                  <button
                    onClick={() => { setSelectedSupplier(null); setHistorySearch(''); setHistoryFilter('all'); }}
                    className="p-2.5 hover:bg-bg-base rounded-2xl text-text-secondary hover:text-text-main transition-colors border border-transparent hover:border-border-subtle"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-5 bg-bg-base/70 p-6 rounded-3xl border border-border-subtle">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: t.phone,   field: 'phone'   as const, type: 'text',  icon: Phone },
                        { label: t.email,   field: 'email'   as const, type: 'email', icon: Mail },
                        { label: t.address, field: 'address' as const, type: 'text',  icon: MapPin },
                        { label: t.dueDate, field: 'due_date'as const, type: 'date',  icon: CalendarClock },
                      ].map(({ label, field, type, icon: Icon }) => (
                        <div key={field} className="space-y-1.5">
                          <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-accent" />
                            {label}
                          </label>
                          <input
                            type={type}
                            className="w-full bg-card border border-border-subtle rounded-2xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent"
                            value={editForm[field] || ''}
                            onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-3 border-t border-border-subtle">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-5 py-3 bg-bg-base hover:bg-card text-text-secondary font-black rounded-2xl transition-all uppercase text-xs tracking-wider">{t.cancel}</button>
                      <button type="submit" className="flex-1 px-5 py-3 bg-accent text-white font-black rounded-2xl hover:opacity-90 transition-all uppercase text-xs tracking-wider shadow-md shadow-accent/20 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t.saveChanges}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Contact Strip */}
                    <div className="bg-bg-base/60 border border-border-subtle rounded-3xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Phone */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.phone}</div>
                          {selectedSupplier.phone ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a href={`tel:${selectedSupplier.phone}`} className="text-sm font-black text-text-main hover:text-accent transition-colors font-mono">
                                {selectedSupplier.phone}
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedSupplier.phone) {
                                    navigator.clipboard.writeText(selectedSupplier.phone);
                                    setCopiedPhone(true);
                                    setTimeout(() => setCopiedPhone(false), 1800);
                                  }
                                }}
                                className="p-1 hover:bg-card rounded-lg text-text-secondary hover:text-text-main transition-colors"
                                title="Copier"
                              >
                                {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary italic">---</span>
                          )}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.address}</div>
                          <span className="text-xs font-bold text-text-main line-clamp-1" title={selectedSupplier.address || ''}>
                            {selectedSupplier.address || '---'}
                          </span>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.email}</div>
                          {selectedSupplier.email ? (
                            <a href={`mailto:${selectedSupplier.email}`} className="text-xs font-bold text-text-main hover:text-accent transition-colors truncate block">
                              {selectedSupplier.email}
                            </a>
                          ) : (
                            <span className="text-xs text-text-secondary italic">---</span>
                          )}
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarClock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.dueDate}</div>
                          {selectedSupplier.dueDate || selectedSupplier.due_date ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-text-main font-mono">
                                {new Date(selectedSupplier.dueDate || selectedSupplier.due_date).toLocaleDateString()}
                              </span>
                              {dueBadge(selectedSupplier.dueDate || selectedSupplier.due_date)}
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary italic">---</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial KPI Cards */}
                    {canViewDebtAmount && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        {/* Total Achats */}
                        <div className="p-4 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                              {language === 'ar' ? 'إجمالي السلع' : 'Total Achats'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono tracking-tight">
                              <span>{formatNumber(supplierStats.totalDebts)}</span> <span className="text-xs font-bold">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-blue-700/70 mt-1">
                              {language === 'ar' ? 'سلع ومشتريات' : 'Marchandises reçues'}
                            </div>
                          </div>
                        </div>

                        {/* Total Règlements */}
                        <div className="p-4 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              {language === 'ar' ? 'إجمالي الدفعات' : 'Total Règlements'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                              <span>{formatNumber(supplierStats.totalPayments)}</span> <span className="text-xs font-bold">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700/70 mt-1">
                              {language === 'ar' ? 'مجموع ما تم أداؤه' : 'Total payé au fournisseur'}
                            </div>
                          </div>
                        </div>

                        {/* Solde Restant Dû */}
                        <div className={cn(
                          "p-4 rounded-3xl border flex flex-col justify-between",
                          selectedSupplier.debt > 0 
                            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40" 
                            : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40"
                        )}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider", selectedSupplier.debt > 0 ? "text-rose-800 dark:text-rose-300" : "text-emerald-800 dark:text-emerald-300")}>
                              {language === 'ar' ? 'الرصيد المستحق' : 'Solde Restant Dû'}
                            </span>
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center",
                              selectedSupplier.debt > 0 ? "bg-rose-100/70 text-rose-600" : "bg-emerald-100/70 text-emerald-600"
                            )}>
                              {selectedSupplier.debt > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          <div>
                            <div className={cn("text-xl font-black font-mono tracking-tight", selectedSupplier.debt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                              <span>{formatNumber(selectedSupplier.debt)}</span> <span className="text-xs font-bold">{t.currency}</span>
                            </div>
                            <div className={cn("text-[10px] font-semibold mt-1", selectedSupplier.debt > 0 ? "text-rose-700/70" : "text-emerald-700/70")}>
                              {selectedSupplier.debt > 0 ? (language === 'ar' ? 'واجب الأداء' : 'Reste à régler') : (language === 'ar' ? 'لا يوجد أي دين' : 'Aucun impayé')}
                            </div>
                          </div>
                        </div>

                        {/* Nombre d'Opérations */}
                        <div className="p-4 rounded-3xl bg-card border border-border-subtle flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                              {language === 'ar' ? 'عدد العمليات' : 'Opérations'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-bg-base text-text-secondary flex items-center justify-center">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl font-black text-text-main font-mono tracking-tight">
                              <span>{supplierStats.count}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-text-secondary mt-1">
                              {language === 'ar' ? 'معاملة مسجلة' : 'Lignes d\'historique'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Action Buttons inside modal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => {
                          setAdjustModal({ type: 'pay', supplier: selectedSupplier });
                          setAdjustAmount('');
                        }}
                        className="bg-accent text-white py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>{language === 'ar' ? 'تسجيل أداء للمورد' : t.paySupplier}</span>
                      </button>
                      <button
                        onClick={() => {
                          setAdjustModal({ type: 'charge', supplier: selectedSupplier });
                          setAdjustAmount('');
                        }}
                        className="bg-card border-2 border-border-subtle hover:border-accent text-text-main hover:text-accent py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إضافة دين / سلعة جديدة' : t.newSupplierCharge}</span>
                      </button>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-bg-base rounded-2xl overflow-x-auto">
                          {[
                            { key: 'all' as const, label: language === 'ar' ? 'الكل' : 'Tous', count: historyCounts.all },
                            { key: 'payment' as const, label: language === 'ar' ? 'الدفعات' : 'Paiements', count: historyCounts.payment },
                            { key: 'debt' as const, label: language === 'ar' ? 'السلع' : 'Approvisionnements', count: historyCounts.debt },
                            { key: 'check' as const, label: language === 'ar' ? 'الشيكات' : 'Chèques', count: historyCounts.check },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setHistoryFilter(tab.key)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap",
                                historyFilter === tab.key 
                                  ? "bg-card text-text-main shadow-2xs" 
                                  : "text-text-secondary hover:text-text-main"
                              )}
                            >
                              <span>{tab.label}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                historyFilter === tab.key 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                                  : "bg-card text-text-secondary"
                              )}>
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Search Input in History */}
                        <div className="relative min-w-[200px]">
                          <Search className="w-4 h-4 text-text-secondary absolute top-1/2 -translate-y-1/2 left-3" />
                          <input
                            type="text"
                            placeholder={language === 'ar' ? 'بحث في العمليات...' : 'Rechercher opération...'}
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                            className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 pl-9 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-accent transition-all"
                          />
                        </div>
                      </div>

                      {/* History Content */}
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-16 opacity-40">
                          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredSupplierHistory.length === 0 ? (
                        <div className="text-center py-14 space-y-2 border-2 border-dashed border-border-subtle rounded-3xl bg-bg-base/30">
                          <p className="text-text-secondary text-xs font-black uppercase tracking-wider">{t.historyEmpty}</p>
                          {historySearch && <p className="text-[11px] text-text-secondary/70">Aucun résultat pour "{historySearch}"</p>}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Table Header */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 pb-1 text-[10px] font-black uppercase tracking-wider text-text-secondary border-b border-border-subtle">
                            <span>{t.details}</span>
                            <span className="text-right min-w-[110px]">{t.amount}</span>
                            <span className="text-right min-w-[110px]">{language === 'ar' ? 'الرصيد' : 'Solde'}</span>
                          </div>

                          {/* Rows */}
                          {filteredSupplierHistory.map(h => {
                            const isPayment = h.type === 'PAYMENT';
                            const isCheck = h.payment_method === 'CHECK' || h.description?.toLowerCase().includes('chèque') || h.description?.toLowerCase().includes('check');
                            const isReturn = (h.description || '').toLowerCase().includes('return') || (h.description || '').toLowerCase().includes('retour') || (h.description || '').toLowerCase().includes('إرجاع');

                            return (
                              <div
                                key={h.id}
                                className="group bg-bg-base/50 p-3.5 sm:p-4 rounded-2xl grid grid-cols-[1fr_auto_auto] gap-4 items-center border border-border-subtle hover:bg-card hover:border-accent/30 transition-all shadow-2xs"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                                    isReturn
                                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-900/40"
                                      : isPayment
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-900/40"
                                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200 dark:border-blue-900/40"
                                  )}>
                                    {isReturn ? (
                                      <ArrowRightLeft className="w-4 h-4" />
                                    ) : isPayment ? (
                                      isCheck ? <CreditCard className="w-4 h-4 text-amber-600" /> : <Wallet className="w-4 h-4" />
                                    ) : (
                                      <Package className="w-4 h-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-black text-text-main text-sm truncate">
                                        {h.description}
                                      </span>
                                      {isCheck && h.check_number && (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          <CreditCard className="w-3 h-3" /> #{h.check_number}
                                        </span>
                                      )}
                                      {isReturn && (
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                                          {language === 'ar' ? 'مرتجع' : 'Retour'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-semibold text-text-secondary/70 flex items-center gap-1.5">
                                      <CalendarClock className="w-3 h-3 text-text-secondary/50" />
                                      <span>
                                        {new Date(h.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {' · '}
                                        {new Date(h.date).toLocaleTimeString(language === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right min-w-[110px]">
                                  <span
                                    dir="ltr"
                                    className={cn(
                                      "font-mono font-black text-sm sm:text-base tabular-nums",
                                      isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                    )}
                                  >
                                    {isPayment ? '−' : '+'}{canViewDebtAmount ? formatNumber(h.amount) : '***'}
                                  </span>
                                  <span className="text-[10px] font-bold text-text-secondary ml-1 uppercase">{t.currency}</span>
                                </div>

                                <div className="text-right min-w-[110px]">
                                  <span
                                    dir="ltr"
                                    className={cn(
                                      "font-mono font-black text-sm sm:text-base tabular-nums",
                                      h.runningBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                    )}
                                  >
                                    {canViewDebtAmount ? formatNumber(Math.abs(h.runningBalance)) : '***'}
                                  </span>
                                  <span className="text-[10px] font-bold text-text-secondary ml-1 uppercase">{t.currency}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── PAY / CHARGE MODAL ── */}
        {adjustModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-card w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 border border-border-subtle"
            >
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-subtle/80">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center text-white",
                    adjustModal.type === 'pay' ? "bg-emerald-600" : "bg-rose-600"
                  )}>
                    {adjustModal.type === 'pay' ? <Wallet className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-text-main uppercase">
                      {adjustModal.type === 'pay' ? t.paySupplier : t.newSupplierCharge}
                    </h3>
                    <p className="text-xs font-semibold text-text-secondary">{adjustModal.supplier.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAdjustModal(null)}
                  className="p-2 text-text-secondary hover:text-text-main rounded-xl hover:bg-bg-base transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-2 block">
                    {t.amount} ({t.currency})
                  </label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="number"
                      step="any"
                      required
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-bg-base border border-border-subtle rounded-2xl py-4 px-6 text-3xl font-black font-mono focus:border-accent outline-none"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-text-secondary font-mono">
                      {t.currency}
                    </span>
                  </div>
                </div>

                {adjustModal.type === 'pay' && (
                  <>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-2 block">
                        {t.paymentMethod}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['CASH', 'CHECK'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAdjustMethod(m)}
                            className={cn(
                              'py-3.5 rounded-2xl text-xs font-black border transition-all uppercase tracking-wider flex items-center justify-center gap-2',
                              adjustMethod === m
                                ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                : 'bg-bg-base text-text-secondary border-border-subtle hover:border-text-secondary/40'
                            )}
                          >
                            {m === 'CASH' ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                            <span>{m === 'CASH' ? t.cash : t.check}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {adjustMethod === 'CHECK' && (
                      <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">
                            {language === 'ar' ? 'البنك' : 'Banque / Bank'}
                          </label>
                          <select
                            className="w-full bg-card border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none"
                            value={checkBankSupplier}
                            onChange={e => setCheckBankSupplier(e.target.value)}
                          >
                            <option value="">{language === 'ar' ? 'اختر البنك' : 'Sélectionner la banque'}</option>
                            {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">
                            {t.checkOwner}
                          </label>
                          <input
                            required
                            value={checkOwner}
                            onChange={e => setCheckOwner(e.target.value)}
                            placeholder={language === 'ar' ? 'اسم صاحب الشيك' : 'Nom de l\'émetteur'}
                            className="w-full bg-card border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">
                              {t.checkNumber}
                            </label>
                            <input
                              required
                              value={checkNum}
                              onChange={e => setCheckNum(e.target.value)}
                              placeholder="1234567"
                              className="w-full bg-card border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-mono font-bold focus:border-accent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">
                              {t.dueDate}
                            </label>
                            <input
                              type="date"
                              required
                              value={dueDate}
                              onChange={e => setDueDate(e.target.value)}
                              className="w-full bg-card border border-border-subtle rounded-xl py-2.5 px-3 text-sm font-bold focus:border-accent outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {adjustModal.type === 'charge' && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-2 block">
                      {t.note}
                    </label>
                    <input
                      value={adjustNote}
                      onChange={e => setAdjustNote(e.target.value)}
                      placeholder={language === 'ar' ? 'سبب الدين أو رقم الفاتورة / السلعة...' : 'Motif de la dette, N° bon de livraison...'}
                      className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setAdjustModal(null)}
                    className="flex-1 bg-bg-base border border-border-subtle text-text-secondary py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all hover:border-text-secondary/40"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-accent text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-accent/20 active:scale-95 transition-all hover:bg-accent/90"
                  >
                    {t.confirm}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
