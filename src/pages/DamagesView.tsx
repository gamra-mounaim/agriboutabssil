/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Search,
  Download,
  Calendar,
  Package,
  TrendingDown,
  User,
  RefreshCw,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/apiService';
import { generateDamagesReportPDF } from '../services/invoiceService';
import { useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatNumber(val: any) {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

type Filter = 'all' | 'month' | 'last';

interface DamageRecord {
  id: string | number;
  timestamp?: string;
  date?: string;
  productName?: string;
  product_name?: string;
  quantity?: number;
  qty?: number;
  reason?: string;
  notes?: string;
  type?: string;
  actor?: string;
  actorName?: string;
  costPrice?: number;
  cost_price?: number;
}

export default function DamagesView() {
  const { language } = useAuthStore();
  const t = translations[language] as any;
  const isRtl = language === 'ar';

  const [records, setRecords] = useState<DamageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await api.getDamagesReport();
      setRecords(Array.isArray(data) ? data : (data?.damages || data?.data || []));
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // ---- Filtering helpers ----
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const filtered = useMemo(() => {
    let rows = records;

    // Date filter
    if (filter !== 'all') {
      rows = rows.filter(r => {
        const d = new Date(r.timestamp || r.date || '');
        if (isNaN(d.getTime())) return false;
        if (filter === 'month')  return d >= thisMonthStart;
        if (filter === 'last')   return d >= lastMonthStart && d <= lastMonthEnd;
        return true;
      });
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        (r.productName || r.product_name || '').toLowerCase().includes(q) ||
        (r.reason || r.notes || '').toLowerCase().includes(q) ||
        (r.actor || r.actorName || '').toLowerCase().includes(q)
      );
    }

    return rows;
  }, [records, filter, search]);

  const totalLoss = useMemo(() =>
    filtered.reduce((acc, r) => {
      const qty  = r.quantity ?? r.qty ?? 0;
      const cost = r.costPrice ?? r.cost_price ?? 0;
      return acc + qty * cost;
    }, 0),
  [filtered]);

  const handleExport = () => {
    setExporting(true);
    try {
      generateDamagesReportPDF(filtered, totalLoss, language);
    } finally {
      setExporting(false);
    }
  };

  // ---- Skeleton ----
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-bg-base rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-bg-base rounded-2xl" />)}
        </div>
        <div className="h-72 bg-bg-base rounded-2xl" />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-danger">
        <AlertTriangle className="w-12 h-12" />
        <p className="text-sm font-semibold">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 text-xs font-bold bg-danger/10 rounded-xl hover:bg-danger/20 transition-colors"
        >
          {isRtl ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  }

  const filterLabels: Record<Filter, string> = {
    all:   t.damagesFilterAll,
    month: t.damagesFilterMonth,
    last:  t.damagesFilterLast,
  };

  return (
    <div className={cn('space-y-6 pb-8', isRtl && 'text-right')} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-text-main">{t.damagesTitle}</h1>
            <p className="text-xs text-text-secondary font-semibold mt-0.5">
              {filtered.length} {isRtl ? 'سجل' : language === 'fr' ? 'enregistrement(s)' : 'record(s)'}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total records */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border-subtle rounded-2xl p-5 flex items-center gap-4 shadow-sm"
        >
          <div className="p-3 rounded-xl bg-red-500/10">
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
              {isRtl ? 'عدد السجلات' : language === 'fr' ? 'Nb. Enregistrements' : 'Total Records'}
            </p>
            <p className="text-2xl font-black text-text-main">{filtered.length}</p>
          </div>
        </motion.div>

        {/* Total qty lost */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border-subtle rounded-2xl p-5 flex items-center gap-4 shadow-sm"
        >
          <div className="p-3 rounded-xl bg-orange-500/10">
            <TrendingDown className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
              {isRtl ? 'إجمالي الكميات' : language === 'fr' ? 'Qté Totale Perdue' : 'Total Qty Lost'}
            </p>
            <p className="text-2xl font-black text-text-main">
              {formatNumber(filtered.reduce((a, r) => a + (r.quantity ?? r.qty ?? 0), 0))}
            </p>
          </div>
        </motion.div>

        {/* Total loss value */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-red-500/30 rounded-2xl p-5 flex items-center gap-4 shadow-sm bg-red-500/5"
        >
          <div className="p-3 rounded-xl bg-red-500/15">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-600/80">
              {t.damagesTotal}
            </p>
            <p className="text-2xl font-black text-red-600">
              {formatNumber(totalLoss)} <span className="text-base font-bold">{t.currency}</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Toolbar: Search + Filter + Export ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary', isRtl ? 'right-3' : 'left-3')} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.damagesSearch}
            className={cn(
              'w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 text-sm font-medium text-text-main placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors',
              isRtl ? 'pr-9 text-right' : 'pl-9'
            )}
          />
        </div>

        {/* Date filter pills */}
        <div className="flex gap-1.5">
          {(['all', 'month', 'last'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 text-[11px] font-black uppercase rounded-xl transition-all tracking-wider',
                filter === f
                  ? 'bg-accent text-white shadow-sm shadow-accent/30'
                  : 'bg-bg-base border border-border-subtle text-text-secondary hover:text-text-main'
              )}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl border border-border-subtle bg-bg-base hover:border-accent transition-colors text-text-secondary hover:text-accent disabled:opacity-50"
          title={isRtl ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>

        {/* Export PDF */}
        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-red-500/20"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:block">{t.damagesExport}</span>
        </button>
      </div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden"
      >
        {filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
            <AlertTriangle className="w-14 h-14 text-text-secondary" />
            <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">
              {t.damagesEmpty}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    { key: 'date',  label: t.damagesDate     },
                    { key: 'prod',  label: t.damagesProduct   },
                    { key: 'qty',   label: t.damagesQty       },
                    { key: 'cost',  label: t.damagesUnitCost  },
                    { key: 'loss',  label: t.damagesLoss      },
                    { key: 'rsn',   label: t.damagesReason    },
                    { key: 'actor', label: t.damagesActor     },
                  ].map(col => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-5 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary bg-bg-base/50',
                        isRtl ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((r, i) => {
                    const qty      = r.quantity ?? r.qty ?? 0;
                    const cost     = r.costPrice ?? r.cost_price ?? 0;
                    const loss     = qty * cost;
                    const dateStr  = r.timestamp || r.date
                      ? new Date(r.timestamp || r.date || '').toLocaleDateString(
                          language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB'
                        )
                      : '—';
                    const product  = r.productName || r.product_name || '—';
                    const reason   = (r.reason || r.notes || '').replace('[DAMAGE] ', '').replace('[damage]', '');
                    const actor    = r.actor || r.actorName || '—';

                    return (
                      <motion.tr
                        key={r.id ?? i}
                        initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                        className="border-b border-border-subtle last:border-0 hover:bg-red-500/5 transition-colors group"
                      >
                        <td className="px-5 py-3.5 text-xs font-semibold text-text-secondary whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-text-secondary/50" />
                            {dateStr}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-text-main">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            {product}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-text-main">
                          <span className="px-2.5 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-xs font-black">
                            {qty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary font-semibold text-xs whitespace-nowrap">
                          {cost > 0 ? `${formatNumber(cost)} ${t.currency}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 font-black text-red-600 whitespace-nowrap">
                          {loss > 0 ? `${formatNumber(loss)} ${t.currency}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary text-xs max-w-[200px]">
                          {reason || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-text-secondary/40" />
                            {actor}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Footer total ── */}
      {filtered.length > 0 && (
        <div className={cn('flex', isRtl ? 'justify-start' : 'justify-end')}>
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-4 flex items-center gap-4">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70">
                {t.damagesTotal}
              </p>
              <p className="text-xl font-black text-red-600">
                {formatNumber(totalLoss)} {t.currency}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
