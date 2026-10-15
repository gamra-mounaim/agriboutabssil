import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Store, Plus, Edit2, Trash2, Printer, X, Hash,
  CreditCard, ChevronDown, ChevronUp, AlertTriangle,
  Phone, Mail, MapPin, Calendar, TrendingDown, TrendingUp,
  ArrowUpDown, CheckCircle2, Copy, Check, Package, Receipt,
  Wallet, CalendarClock, ArrowRightLeft, ShieldCheck, FileText
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

type SortKey = 'name_asc' | 'name_desc' | 'debt_desc' | 'debt_asc';

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

  // ── Add supplier form ──
  const [name, setName]                     = useState('');
  const [initialDebt, setInitialDebt]       = useState('0');
  const [phone, setPhone]                   = useState('');
  const [email, setEmail]                   = useState('');
  const [address, setAddress]               = useState('');
  const [supplierDueDate, setSupplierDueDate] = useState('');

  // ── List controls ──
  const [searchSupplier, setSearchSupplier] = useState('');
  const [sortKey, setSortKey]               = useState<SortKey>('debt_desc');
  const [showSortMenu, setShowSortMenu]     = useState(false);

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

  // ── Derived data ──
  const supplierChecks = checks.filter(c => c.partyRole === 'supplier');

  const sortLabels: Record<SortKey, string> = {
    name_asc:  language === 'ar' ? 'الاسم أ → ي' : language === 'fr' ? 'Nom A → Z'       : 'Name A → Z',
    name_desc: language === 'ar' ? 'الاسم ي → أ' : language === 'fr' ? 'Nom Z → A'       : 'Name Z → A',
    debt_desc: language === 'ar' ? 'الدين الأعلى' : language === 'fr' ? 'Dette ↑'        : 'Debt High → Low',
    debt_asc:  language === 'ar' ? 'الدين الأدنى' : language === 'fr' ? 'Dette ↓'        : 'Debt Low → High',
  };

  const filteredSuppliers = useMemo(() => {
    const q = searchSupplier.toLowerCase();
    return suppliers
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone   && s.phone.toLowerCase().includes(q)) ||
        (s.email   && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (sortKey === 'name_asc')  return a.name.localeCompare(b.name);
        if (sortKey === 'name_desc') return b.name.localeCompare(a.name);
        if (sortKey === 'debt_desc') return b.debt - a.debt;
        return a.debt - b.debt;
      });
  }, [suppliers, searchSupplier, sortKey]);

  const totalDebt = useMemo(() => suppliers.reduce((s, x) => s + (x.debt || 0), 0), [suppliers]);

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
    try {
      await api.addSupplier({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), debt: parseFloat(initialDebt) || 0, due_date: supplierDueDate || null });
      setName(''); setInitialDebt('0'); setPhone(''); setEmail(''); setAddress(''); setSupplierDueDate('');
      onRefresh();
      setMessage({ text: language === 'ar' ? 'تمت إضافة المورد.' : language === 'fr' ? 'Fournisseur ajouté.' : 'Supplier added.', type: 'success' });
    } catch { setMessage({ text: language === 'ar' ? 'فشل الإضافة.' : language === 'fr' ? "Échec de l'ajout." : 'Failed to add.', type: 'error' }); }
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
        setMessage({ text: language === 'ar' ? 'تم تسجيل الدفع.' : language === 'fr' ? 'Paiement enregistré.' : 'Payment posted.', type: 'success' });
      } else {
        await api.addSupplierCharge(adjustModal.supplier.id, amt, adjustNote);
        setMessage({ text: language === 'ar' ? 'تمت إضافة الدين.' : language === 'fr' ? 'Dette ajoutée.' : 'Debt added.', type: 'success' });
      }
      setAdjustModal(null); setAdjustAmount(''); setAdjustMethod('CASH');
      setCheckNum('');
      setCheckOwner(''); setCheckBankSupplier(''); setDueDate(''); setAdjustNote('');
      onRefresh();
    } catch { setMessage({ text: language === 'ar' ? 'فشلت العملية.' : language === 'fr' ? 'Opération échouée.' : 'Operation failed.', type: 'error' }); }
  };

  // ── Helpers ──
  const dueBadge = (dateStr?: string) => {
    const status = getDueDateStatus(dateStr);
    if (!status || status === 'ok') return null;
    const label = status === 'overdue'
      ? (language === 'ar' ? 'متأخر' : language === 'fr' ? 'En retard' : 'Overdue')
      : (language === 'ar' ? 'قريباً' : language === 'fr' ? 'Bientôt' : 'Due soon');
    return (
      <span className={cn('inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border', status === 'overdue' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800')}>
        <AlertTriangle className="w-2.5 h-2.5" />{label}
      </span>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 pb-20">

      {/* ── TABS ── */}
      <div className="flex gap-2 p-1.5 bg-white/90 dark:bg-slate-800/90 border border-border-subtle rounded-2xl w-fit shadow-sm backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            'px-5 py-2 rounded-xl font-black text-[11px] tracking-widest transition-all duration-200 uppercase flex items-center gap-2',
            activeTab === 'suppliers'
              ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
              : 'text-text-secondary hover:text-text-main hover:bg-slate-100/60 dark:hover:bg-white/5'
          )}
        >
          <Store className="w-3.5 h-3.5" />
          {t.suppliers}
        </button>
        <button
          onClick={() => setActiveTab('checks')}
          className={cn(
            'px-5 py-2 rounded-xl font-black text-[11px] tracking-widest transition-all duration-200 uppercase flex items-center gap-2',
            activeTab === 'checks'
              ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
              : 'text-text-secondary hover:text-text-main hover:bg-slate-100/60 dark:hover:bg-white/5'
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          {t.supplierChecks}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <>
          {/* ── SUMMARY HEADER ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Store className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.suppliers}</p>
                <p className="text-2xl font-black text-text-main">{suppliers.length}</p>
              </div>
            </div>
            <div className="bg-card border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-danger/10">
                <TrendingDown className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.totalSupplierDebt}</p>
                <p className="text-2xl font-black text-danger">
                  {canViewDebtAmount ? `${formatNumber(totalDebt)} ${t.currency}` : '***'}
                </p>
              </div>
            </div>
          </div>

          {/* ── ADD FORM ── */}
          <section className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-5 flex items-center justify-between">
              <span>{t.addSupplier}</span>
              <Store className="w-4 h-4 text-accent" />
            </h3>
            <form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              {[
                { label: t.supplierName, value: name,            setter: setName,            placeholder: t.supplierName, type: 'text', span: 2 },
                { label: t.phone,        value: phone,           setter: setPhone,           placeholder: '06XXXXXXXX',    type: 'text', span: 1 },
                { label: t.email,        value: email,           setter: setEmail,           placeholder: 'email@...',     type: 'email',span: 1 },
                { label: t.supplierDebt, value: initialDebt,     setter: setInitialDebt,     placeholder: '0',             type: 'number',span: 1 },
                { label: t.dueDate,      value: supplierDueDate, setter: setSupplierDueDate, placeholder: '',              type: 'date', span: 1 },
              ].map(({ label, value, setter, placeholder, type, span }) => (
                <div key={label} className={`md:col-span-${span}`}>
                  <label className="text-[10px] uppercase font-bold text-text-secondary mb-1 block">{label}</label>
                  <input
                    type={type} value={value || ''}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-3 text-sm focus:border-accent outline-none font-bold"
                  />
                </div>
              ))}
              <button className="md:col-span-6 mt-1 bg-accent text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4" />{t.confirm}
              </button>
            </form>
          </section>

          {/* ── SEARCH + SORT ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors', language === 'ar' ? 'right-4' : 'left-4')} />
              <input
                placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف أو الإيميل...' : language === 'fr' ? 'Rechercher...' : 'Search by name, phone, email...'}
                className={cn('w-full bg-white/80 dark:bg-white/5 border border-border-subtle rounded-xl py-3 text-sm font-bold focus:border-accent outline-none backdrop-blur-sm', language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4')}
                value={searchSupplier}
                onChange={e => setSearchSupplier(e.target.value)}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 dark:bg-white/5 border border-border-subtle rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main hover:border-accent transition-all backdrop-blur-sm whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortLabels[sortKey]}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showSortMenu && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    className="absolute top-full mt-2 right-0 z-30 bg-white dark:bg-slate-800 border border-border-subtle rounded-2xl shadow-xl overflow-hidden min-w-[180px]"
                  >
                    {(Object.keys(sortLabels) as SortKey[]).map(k => (
                      <button
                        key={k}
                        onClick={() => { setSortKey(k); setShowSortMenu(false); }}
                        className={cn('w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors', sortKey === k ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-base')}
                      >
                        {sortLabels[k]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── SUPPLIER CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center opacity-30 gap-3">
                <Store className="w-12 h-12" />
                <p className="text-xs font-black uppercase tracking-widest">{t.suppliers}</p>
              </div>
            ) : filteredSuppliers.map(s => {
              const due = s.dueDate || s.due_date;
              const dueStatus = getDueDateStatus(due);
              return (
                <div key={s.id} className="bg-card border border-border-subtle rounded-2xl shadow-sm hover:shadow-lg transition-all group overflow-hidden relative flex flex-col">
                  {/* Top accent line based on debt */}
                  <div className={cn('h-1 w-full', s.debt > 0 ? 'bg-gradient-to-r from-danger/60 to-orange-400/60' : 'bg-gradient-to-r from-emerald-400/60 to-teal-400/60')} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn('flex flex-col gap-1', language === 'ar' && 'text-right')}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-text-main group-hover:text-accent transition-colors leading-tight">{s.name}</h4>
                          {canViewDebtAmount && s.debt !== 0 && (
                            <span className={cn("text-sm font-black px-2.5 py-1 rounded-md", s.debt > 0 ? "text-danger bg-danger/10" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20")}>
                              {formatNumber(Math.abs(s.debt))} DH
                            </span>
                          )}
                        </div>
                        {s.phone && (
                          <p className="text-[10px] text-text-secondary font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3" />{s.phone}
                          </p>
                        )}
                        {s.email && (
                          <p className="text-[10px] text-text-secondary font-bold flex items-center gap-1 truncate max-w-[160px]">
                            <Mail className="w-3 h-3" />{s.email}
                          </p>
                        )}
                        {s.address && (
                          <p className="text-[10px] text-text-secondary font-bold flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="w-3 h-3" />{s.address}
                          </p>
                        )}
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => setDeleteConfirm(s)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Due date badge */}
                    {due && (
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-3 h-3 text-text-secondary" />
                        <span className="text-[10px] text-text-secondary font-bold">{new Date(due).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                        {dueBadge(due)}
                      </div>
                    )}

                    {/* Debt / Paid / Profit amounts */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">{language === 'ar' ? 'ما تم بيعه' : 'Vendu'}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black tracking-tighter text-emerald-600">
                            {canViewDebtAmount ? formatNumber(s.soldValue || 0) : '***'}
                          </span>
                        </div>
                      </div>
                      <div className={cn('p-3 rounded-xl bg-red-50 dark:bg-red-900/10')}>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5 text-danger")}>{language === 'ar' ? 'بالمخزون' : 'En stock'}</p>
                        <div className="flex items-baseline gap-1">
                          <span className={cn('text-base font-black tracking-tighter text-danger')}>
                            {canViewDebtAmount ? formatNumber(s.stockValue || 0) : '***'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-0.5">{language === 'ar' ? 'الربح' : 'Bénéfice'}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black tracking-tighter text-blue-600">
                            {canViewDebtAmount ? formatNumber(s.profit || 0) : '***'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canViewDebtAmount && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button onClick={() => setAdjustModal({ type: 'pay', supplier: s })} className="bg-accent text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-accent/10 active:scale-95 transition-all hover:bg-accent/90">
                          {t.paySupplier}
                        </button>
                        <button onClick={() => setAdjustModal({ type: 'charge', supplier: s })} className="bg-bg-base dark:bg-white/5 border border-border-subtle text-text-main py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:border-accent transition-all">
                          {t.newSupplierCharge}
                        </button>
                      </div>
                    )}

                    {/* Footer links */}
                    <div className="flex gap-2 pt-2 border-t border-border-subtle/60 mt-auto">
                      <button onClick={() => openDetails(s)} className="flex-1 py-1.5 text-[9px] font-bold text-text-secondary hover:text-accent uppercase tracking-widest transition-colors text-center">
                        {t.view} {t.supplierDetails}
                      </button>
                      {canViewDebtAmount && (
                        <button
                          onClick={async () => {
                            const history = await api.getSupplierHistory(s.id);
                            generateStatementPDF({ entityName: s.name, remainingDebt: s.debt, transactions: history, type: 'supplier' }, language, settings);
                          }}
                          className="flex-1 py-1.5 text-[9px] font-bold text-accent hover:underline uppercase tracking-widest flex items-center justify-center gap-1"
                        >
                          <Printer className="w-3 h-3" />PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── CHECKS TAB ── */
        <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-base/50 border-b border-border-subtle">
                {[t.date, t.supplierName, t.checkNumber, t.amount, t.checkOwner].map(h => (
                  <th key={h} className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supplierChecks.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-text-secondary">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t.noChecks}</p>
                </td></tr>
              ) : supplierChecks.map(c => (
                <tr key={c.id} className="border-b border-border-subtle hover:bg-bg-base transition-colors group">
                  <td className="p-5 text-sm font-medium">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="p-5 text-sm font-black text-text-main group-hover:text-accent">{c.partyName}</td>
                  <td className="p-5 text-sm font-mono flex items-center gap-2"><Hash className="w-3.5 h-3.5 opacity-40" />{c.checkNumber}</td>
                  <td className="p-5 text-sm font-black text-success">{formatNumber(c.total)} {t.currency}</td>
                  <td className="p-5 text-[11px] font-bold text-text-secondary uppercase">{c.checkOwner || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════ MODALS ════════ */}
      <AnimatePresence>

        {/* ── DELETE CONFIRM ── */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-8 border border-border-subtle text-center"
            >
              <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-danger" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-2">
                {language === 'ar' ? 'حذف المورد' : language === 'fr' ? 'Supprimer le fournisseur' : 'Delete Supplier'}
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                {language === 'ar' ? `هل أنت متأكد من حذف "${deleteConfirm.name}"؟` : language === 'fr' ? `Supprimer "${deleteConfirm.name}" ?` : `Delete "${deleteConfirm.name}"?`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-bg-base border border-border-subtle text-text-secondary font-black rounded-xl text-xs uppercase tracking-widest hover:border-text-secondary/30 transition-all">
                  {t.cancel}
                </button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-danger text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-danger/20 disabled:opacity-60 active:scale-95 transition-all">
                  {deleting ? '...' : (language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── SUPPLIER DETAIL ── */}
        {selectedSupplier && (
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
                    {getSupplierInitials(selectedSupplier.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black tracking-widest uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                        {t.supplierDetails}
                      </span>
                      {canViewDebtAmount && (
                        selectedSupplier.debt > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {language === 'ar' ? 'الرصيد المستحق' : language === 'fr' ? 'Montant Dû' : 'Amount Due'}: <span dir="ltr" className="font-mono font-black">{formatNumber(selectedSupplier.debt)}</span> {t.currency}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {language === 'ar' ? 'الحساب مسوّى' : language === 'fr' ? 'Compte soldé' : 'Account Settled'}
                          </span>
                        )
                      )}
                    </div>
                    {isEditingProfile ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.supplierName}</label>
                        <input
                          className="text-xl font-black bg-bg-base border border-border-subtle rounded-xl px-3 py-1.5 w-full outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="p-2.5 rounded-xl border border-border-subtle hover:bg-slate-100 dark:hover:bg-slate-800 text-accent font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      title={t.generateStatement}
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.generateStatement}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingProfile(v => !v)}
                    className={cn(
                      'p-2.5 rounded-xl border border-border-subtle transition-all flex items-center gap-1.5 text-xs font-bold',
                      isEditingProfile ? 'bg-accent/15 text-accent ring-2 ring-accent/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary hover:text-text-main'
                    )}
                    title={isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{isEditingProfile ? t.cancel : (language === 'ar' ? 'تعديل' : 'Modifier')}</span>
                  </button>
                  <button
                    onClick={() => { setSelectedSupplier(null); setHistorySearch(''); setHistoryFilter('all'); }}
                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-secondary hover:text-text-main transition-colors border border-transparent hover:border-border-subtle"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-5 bg-slate-50/70 dark:bg-slate-800/30 p-6 rounded-2xl border border-border-subtle">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: t.phone,   field: 'phone'   as const, type: 'text',  icon: Phone },
                        { label: t.email,   field: 'email'   as const, type: 'email', icon: Mail },
                        { label: t.address, field: 'address' as const, type: 'text',  icon: MapPin },
                        { label: t.dueDate, field: 'due_date'as const, type: 'date',  icon: CalendarClock },
                      ].map(({ label, field, type, icon: Icon }) => (
                        <div key={field} className="space-y-1.5">
                          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-accent" />
                            {label}
                          </label>
                          <input
                            type={type}
                            className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent"
                            value={editForm[field] || ''}
                            onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}
                          />
                        </div>
                      ))}
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
                    {/* Contact & Info Strip */}
                    <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-border-subtle rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Phone */}
                      <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.phone}</div>
                          {selectedSupplier.phone ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a href={`tel:${selectedSupplier.phone}`} className="text-sm font-black text-text-main hover:text-accent transition-colors font-mono tracking-tight">
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
                                className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md text-text-secondary hover:text-text-main transition-colors"
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
                      <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
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
                      <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
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
                      <div className={cn("flex items-start gap-3", language === 'ar' && "text-right")}>
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                          <CalendarClock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-text-secondary font-black uppercase tracking-wider mb-0.5">{t.dueDate}</div>
                          {selectedSupplier.dueDate || selectedSupplier.due_date ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-text-main font-mono">
                                {new Date(selectedSupplier.dueDate || selectedSupplier.due_date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                              </span>
                              {(() => {
                                const st = getDueDateStatus(selectedSupplier.dueDate || selectedSupplier.due_date);
                                if (st === 'overdue') return <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 animate-pulse">{language === 'ar' ? 'متأخر' : 'En retard'}</span>;
                                if (st === 'soon') return <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{language === 'ar' ? 'قريب' : 'Bientôt'}</span>;
                                return null;
                              })()}
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
                        {/* Card 1: Total Achats */}
                        <div className={cn("p-4.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 flex flex-col justify-between hover:border-blue-300 transition-all shadow-xs", language === 'ar' && "text-right")}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
                              {language === 'ar' ? 'إجمالي السلع' : language === 'fr' ? 'Total Achats' : 'Total Purchases'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 tabular-nums tracking-tight">
                              <span dir="ltr">{formatNumber(supplierStats.totalDebts)}</span> <span className="text-xs font-bold opacity-80">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-blue-700/70 mt-1">
                              {language === 'ar' ? 'سلع ومشتريات بالكريدي' : 'Marchandises reçues'}
                            </div>
                          </div>
                        </div>

                        {/* Card 2: Total Règlements */}
                        <div className={cn("p-4.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs", language === 'ar' && "text-right")}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              {language === 'ar' ? 'إجمالي الدفعات' : language === 'fr' ? 'Total Règlements' : 'Total Payments'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                              <span dir="ltr">{formatNumber(supplierStats.totalPayments)}</span> <span className="text-xs font-bold opacity-80">{t.currency}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-emerald-700/70 mt-1">
                              {language === 'ar' ? 'مجموع ما تم أداؤه' : 'Total payé au fournisseur'}
                            </div>
                          </div>
                        </div>

                        {/* Card 3: Solde Restant Dû */}
                        <div className={cn(
                          "p-4.5 rounded-2xl border flex flex-col justify-between transition-all shadow-xs",
                          selectedSupplier.debt > 0 
                            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 hover:border-rose-300" 
                            : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40",
                          language === 'ar' && "text-right"
                        )}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider", selectedSupplier.debt > 0 ? "text-rose-800 dark:text-rose-300" : "text-emerald-800 dark:text-emerald-300")}>
                              {language === 'ar' ? 'الرصيد المستحق' : language === 'fr' ? 'Solde Restant Dû' : 'Balance Due'}
                            </span>
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              selectedSupplier.debt > 0 ? "bg-rose-100/70 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400" : "bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {selectedSupplier.debt > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          <div>
                            <div className={cn("text-xl sm:text-2xl font-black tabular-nums tracking-tight", selectedSupplier.debt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                              <span dir="ltr">{formatNumber(selectedSupplier.debt)}</span> <span className="text-xs font-bold opacity-80">{t.currency}</span>
                            </div>
                            <div className={cn("text-[10px] font-semibold mt-1", selectedSupplier.debt > 0 ? "text-rose-700/70" : "text-emerald-700/70")}>
                              {selectedSupplier.debt > 0 ? (language === 'ar' ? 'واجب الأداء للمورد' : 'Reste à régler') : (language === 'ar' ? 'لا يوجد أي دين' : 'Aucun impayé')}
                            </div>
                          </div>
                        </div>

                        {/* Card 4: Nombre d'Opérations */}
                        <div className={cn("p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-border-subtle flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs", language === 'ar' && "text-right")}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                              {language === 'ar' ? 'عدد العمليات' : language === 'fr' ? 'Opérations' : 'Transactions'}
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-700/60 text-text-secondary flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black text-text-main tabular-nums tracking-tight">
                              <span dir="ltr">{supplierStats.count}</span>
                            </div>
                            <div className="text-[10px] font-semibold text-text-secondary/70 mt-1">
                              {language === 'ar' ? 'معاملة مسجلة' : 'Lignes d\'historique'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
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
                        className="bg-white dark:bg-card border-2 border-border-subtle hover:border-accent text-text-main hover:text-accent py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{language === 'ar' ? 'إضافة دين / سلعة جديدة' : t.newSupplierCharge}</span>
                      </button>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl overflow-x-auto">
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
                                  ? "bg-white dark:bg-card text-text-main shadow-xs" 
                                  : "text-text-secondary hover:text-text-main"
                              )}
                            >
                              <span>{tab.label}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                historyFilter === tab.key 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                                  : "bg-slate-200/70 dark:bg-slate-700 text-text-secondary"
                              )}>
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[200px]">
                          <Search className={cn("w-4 h-4 text-text-secondary absolute top-1/2 -translate-y-1/2", language === 'ar' ? 'right-3' : 'left-3')} />
                          <input
                            type="text"
                            placeholder={language === 'ar' ? 'بحث في العمليات...' : 'Rechercher opération...'}
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                            className={cn(
                              "w-full bg-slate-50 dark:bg-slate-800/50 border border-border-subtle rounded-xl py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent transition-all",
                              language === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
                            )}
                          />
                        </div>
                      </div>

                      {/* History Content */}
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-16 opacity-40">
                          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredSupplierHistory.length === 0 ? (
                        <div className="text-center py-14 space-y-2 border-2 border-dashed border-border-subtle rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                          <p className="text-text-secondary text-xs font-black uppercase tracking-wider">{t.historyEmpty}</p>
                          {historySearch && <p className="text-[11px] text-text-secondary/70">Aucun résultat pour "{historySearch}"</p>}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Table Header */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 pb-1 text-[10px] font-black uppercase tracking-wider text-text-secondary/70 border-b border-border-subtle/50">
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
                                className="group bg-slate-50/60 dark:bg-slate-800/30 p-3.5 sm:p-4 rounded-2xl grid grid-cols-[1fr_auto_auto] gap-4 items-center border border-border-subtle/60 hover:bg-white dark:hover:bg-slate-800 hover:border-accent/30 transition-all shadow-xs"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
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

                                  <div className={cn("min-w-0 flex flex-col gap-0.5", language === 'ar' && "text-right")}>
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-8 border border-border-subtle"
            >
              <h3 className="text-xl font-black tracking-tight mb-6 uppercase">
                {adjustModal.type === 'pay' ? t.paySupplier : t.newSupplierCharge}
              </h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.amount}</label>
                  <input autoFocus type="number" step="any" required value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-bg-base border border-border-subtle rounded-xl py-4 px-6 text-2xl font-black focus:border-accent outline-none" />
                </div>

                {adjustModal.type === 'pay' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.paymentMethod}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['CASH', 'CHECK'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setAdjustMethod(m)}
                            className={cn('py-3 rounded-xl text-xs font-black border transition-all uppercase tracking-widest', adjustMethod === m ? 'bg-accent text-white border-accent shadow-md shadow-accent/20' : 'bg-bg-base text-text-secondary border-border-subtle hover:border-text-secondary/30')}>
                            {m === 'CASH' ? t.cash : t.check}
                          </button>
                        ))}
                      </div>
                    </div>
                    {adjustMethod === 'CHECK' && (
                      <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">{language === 'ar' ? 'البنك' : 'Banque / Bank'}</label>
                          <select className="w-full bg-white dark:bg-slate-800 border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" value={checkBankSupplier} onChange={e => setCheckBankSupplier(e.target.value)}>
                            <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                            {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">{t.checkOwner}</label>
                          <input required value={checkOwner} onChange={e => setCheckOwner(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">{t.checkNumber}</label>
                            <input required value={checkNum} onChange={e => setCheckNum(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1.5 block">{t.dueDate}</label>
                            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {adjustModal.type === 'charge' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.note}</label>
                    <input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder={language === 'ar' ? 'سبب الدين...' : 'Reason...'} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-sm font-bold focus:border-accent outline-none" />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 bg-bg-base border border-border-subtle text-text-secondary py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:border-text-secondary/30">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all hover:bg-accent/90">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
