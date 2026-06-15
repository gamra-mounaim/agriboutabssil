import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Store, Plus, Edit2, Trash2, Printer, X, Hash,
  CreditCard, ChevronDown, ChevronUp, AlertTriangle,
  Phone, Mail, MapPin, Calendar, TrendingDown, TrendingUp,
  ArrowUpDown, CheckCircle2
} from 'lucide-react';
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
      setDueDateModal(''); setCheckOwner(''); setCheckBankSupplier(''); setDueDate(''); setAdjustNote('');
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
                        <h4 className="font-black text-sm text-text-main group-hover:text-accent transition-colors leading-tight">{s.name}</h4>
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

                    {/* Debt amount */}
                    <div className={cn('p-3.5 rounded-xl mb-4', s.debt > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10')}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-0.5">{t.youOweSupplier}</p>
                      <div className="flex items-baseline gap-1">
                        <span className={cn('text-2xl font-black tracking-tighter', s.debt > 0 ? 'text-danger' : 'text-emerald-600')}>
                          {canViewDebtAmount ? formatNumber(s.debt) : '***'}
                        </span>
                        <span className="text-[10px] font-bold text-text-secondary">{t.currency}</span>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-subtle flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.supplierDetails}</div>
                  {isEditingProfile ? (
                    <input className="text-2xl font-black bg-bg-base border border-border-subtle rounded-lg px-3 py-1 outline-none focus:border-accent w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  ) : (
                    <h3 className="text-2xl font-black tracking-tight">{selectedSupplier.name}</h3>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingProfile(v => !v)} className={cn('p-2 rounded-xl transition-colors', isEditingProfile ? 'bg-accent/10 text-accent' : 'hover:bg-bg-base text-text-secondary')}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {canViewDebtAmount && !isEditingProfile && (
                    <button onClick={() => generateStatementPDF({ entityName: selectedSupplier.name, remainingDebt: selectedSupplier.debt, transactions: supplierHistory, type: 'supplier' }, language, settings)}
                      className="flex items-center gap-2 text-xs font-bold text-accent hover:bg-accent/5 px-3 py-2 rounded-xl transition-all">
                      <Printer className="w-4 h-4" />{t.generateStatement}
                    </button>
                  )}
                  <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-bg-base rounded-xl transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-auto space-y-6">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: t.phone,   field: 'phone'   as const, type: 'text'  },
                        { label: t.email,   field: 'email'   as const, type: 'email' },
                        { label: t.address, field: 'address' as const, type: 'text'  },
                        { label: t.dueDate, field: 'due_date'as const, type: 'date'  },
                      ].map(({ label, field, type }) => (
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">{label}</label>
                          <input type={type} className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-2 text-sm outline-none focus:border-accent" value={editForm[field] || ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-border-subtle">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-3 bg-bg-base text-text-secondary font-bold rounded-xl text-xs uppercase tracking-widest border border-border-subtle hover:border-text-secondary/30 transition-all">{t.cancel}</button>
                      <button type="submit" className="flex-1 py-3 bg-accent text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:opacity-90 transition-all">{t.saveChanges}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* ── RUNNING BALANCE HISTORY ── */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-4 flex items-center justify-between">
                        <span>{t.paymentHistory}</span>
                        {canViewDebtAmount && (
                          <span className={cn('text-xs font-black px-3 py-1 rounded-full', selectedSupplier.debt > 0 ? 'bg-danger/10 text-danger' : 'bg-emerald-100 text-emerald-600')}>
                            {t.youOweSupplier}: {formatNumber(selectedSupplier.debt)} {t.currency}
                          </span>
                        )}
                      </h4>

                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-10 opacity-40">
                          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : historyWithBalance.length === 0 ? (
                        <p className="text-center text-text-secondary text-xs py-8 opacity-40 uppercase tracking-widest">{t.historyEmpty}</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Table header */}
                          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 pb-1 border-b border-border-subtle/60">
                            <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">{t.details}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary text-right">{t.amount}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary text-right min-w-[80px]">
                              {language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance'}
                            </span>
                          </div>

                          {historyWithBalance.map(h => (
                            <div key={h.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-3 bg-bg-base/40 rounded-xl border border-border-subtle/40 hover:border-border-subtle transition-colors">
                              <div>
                                <p className="text-[11px] font-bold text-text-main leading-tight">
                                  {h.description}
                                  {h.payment_method === 'CHECK' && (
                                    <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                      <CreditCard className="w-2.5 h-2.5" />#{h.check_number}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[9px] text-text-secondary mt-0.5">{new Date(h.date).toLocaleString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US')}</p>
                              </div>
                              <p className={cn('text-sm font-black text-right', h.type === 'PAYMENT' ? 'text-emerald-500' : 'text-danger')}>
                                {h.type === 'PAYMENT' ? '−' : '+'}{canViewDebtAmount ? formatNumber(h.amount) : '***'}
                              </p>
                              <p className={cn('text-sm font-black text-right min-w-[80px]', h.runningBalance > 0 ? 'text-danger' : 'text-emerald-500')}>
                                {canViewDebtAmount ? formatNumber(Math.abs(h.runningBalance)) : '***'}
                              </p>
                            </div>
                          ))}
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
