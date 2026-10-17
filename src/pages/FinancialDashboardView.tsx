import { Logo } from '../components/Logo';
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
  generateStockReportPDF,
  generateDamagesReportPDF
} from '../services/invoiceService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReChartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';

// Destructure common icons to avoid TS errors
const { Search, Archive, ArrowRightLeft, Hash, User, CalendarClock, FolderOpen, Eye, CheckCircle, Sparkles, UserCog, Store, ChevronRight, ShieldAlert, Cloud, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image: ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe, TrendingDown, UserCheck, Tag, BarChart3 } = LucideIcons;

export default function FinancialDashboardView({ permissions, currency }: { permissions: any, currency?: string }) {
  const { products, categories, customers, suppliers, sales, payments, checks, stats, settings, setMessage, fetchData: onRefresh } = useStore();
  const { language, user } = useAuthStore();

  const t = translations[language];
  const isAr = language === 'ar';

    const totalRevenue = stats?.totalSales || 0;
  const netProfit = stats?.expectedProfit || 0;
  const totalCustomerDebt = stats?.outstandingDebt || 0;
  const dailyProfit = stats?.dailyProfit || 0;
  const weeklyProfit = stats?.weeklyProfit || 0;
  const monthlyProfit = stats?.monthlyProfit || 0;
  const yearlyProfit = stats?.yearlyProfit || 0;
  const totalSupplierDebt = stats?.supplierDebt || 0;
  const inventoryAssetValue = stats?.inventoryValue || 0;

  const [damagesData, setDamagesData] = useState<{ totalLoss: number, count: number, totalQty: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getDamagesReport().then((data: any) => {
      if (!isMounted) return;
      const records = Array.isArray(data) ? data : (data?.damages || data?.data || []);
      const count = records.length;
      let totalQty = 0;
      let totalLoss = 0;
      records.forEach((r: any) => {
        const q = Number(r.quantity ?? r.qty) || 0;
        const c = Number(r.costPrice ?? r.cost_price) || 0;
        totalQty += q;
        totalLoss += q * c;
      });
      setDamagesData({ totalLoss, count, totalQty });
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const totalDamagesLoss = damagesData ? damagesData.totalLoss : (stats?.totalDamagesLoss || 0);
  const damagesCount = damagesData ? damagesData.count : (stats?.damagesCount || 0);
  const damagesTotalQty = damagesData ? damagesData.totalQty : (stats?.damagesTotalQty || 0);

  // Pending Checks Calculation
  const customerChecks = useMemo(() => {
    return (checks || []).filter((c: any) => c.partyRole === 'customer');
  }, [checks]);

  const pendingChecks = useMemo(() => {
    return customerChecks.filter((c: any) => c.checkStatus === 'PENDING' || c.status === 'PENDING');
  }, [customerChecks]);

  const pendingChecksTotal = useMemo(() => {
    return pendingChecks.reduce((sum: number, c: any) => sum + (Number(c.total || c.amount) || 0), 0);
  }, [pendingChecks]);

  const debtorCustomersCount = useMemo(() => {
    return (customers || []).filter(c => Number(c.debt) > 0).length;
  }, [customers]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        onRefresh(),
        api.getDamagesReport().then((data: any) => {
          const records = Array.isArray(data) ? data : (data?.damages || data?.data || []);
          const count = records.length;
          let totalQty = 0;
          let totalLoss = 0;
          records.forEach((r: any) => {
            const q = Number(r.quantity ?? r.qty) || 0;
            const c = Number(r.costPrice ?? r.cost_price) || 0;
            totalQty += q;
            totalLoss += q * c;
          });
          setDamagesData({ totalLoss, count, totalQty });
        }).catch(console.error)
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExportDamages = async () => {
    try {
      const damages = await api.getDamagesReport();
      generateDamagesReportPDF(damages, totalDamagesLoss, language, settings);
    } catch (e) {
      console.error(e);
      setMessage({ text: language === 'ar' ? 'فشل تصدير تقرير التلف' : language === 'fr' ? "Échec de l'export du rapport" : 'Failed to export damages report', type: 'error' });
    }
  };

  const lowStock = products.filter(p => p.qty <= (p.minStock ?? settings?.lowStockThreshold ?? 5));
  const topProductsList = stats?.topProductsList || [];
  const dormantStockList = stats?.dormantStockList || [];
  const topDebtorsList = useMemo(() => {
    return [...(customers || [])].filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 5);
  }, [customers]);

    // Upcoming Debts Logic from DashboardStats
  const upcomingDebts = (customers || []).filter(c => {
    const cDueDate = c.dueDate || c.due_date;
    if (!cDueDate || c.debt <= 0) return false;
    const dueDate = new Date(cDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  const upcomingSupplierDebts = (suppliers || []).filter(s => {
    const sDueDate = s.dueDate || s.due_date;
    if (!sDueDate || s.debt <= 0) return false;
    const dueDate = new Date(sDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  // Trend Data (Last 7 Days)
  const trendData = stats?.last7Days || [];
  const totalTrend7 = trendData.reduce((acc: number, d: any) => acc + d.amount, 0);
  const avgTrend = trendData.length > 0 ? Math.round(totalTrend7 / trendData.length) : 0;
  const prev7DaysTotal = stats?.prev7DaysTotal || 0;
  const pctChange = prev7DaysTotal > 0 ? ((totalTrend7 - prev7DaysTotal) / prev7DaysTotal) * 100 : null;

  const categoryValueData = useMemo(() => {
    return (categories || []).map(cat => {
      const value = products
        .filter(p => p.categoryId === cat.id)
        .reduce((acc, p) => acc + ((p.costPrice || 0) * p.qty), 0);
      return { name: cat.name, value };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [categories, products]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const paymentStats = useMemo(() => {
    if (stats?.paymentMethodsBreakdown) {
      const b = stats.paymentMethodsBreakdown;
      return {
        total: b.total,
        cash: b.cash,
        cashPct: b.total > 0 ? Math.round((b.cash / b.total) * 100) : 0,
        card: b.card,
        cardPct: b.total > 0 ? Math.round((b.card / b.total) * 100) : 0,
        wallet: b.check,
        walletPct: b.total > 0 ? Math.round((b.check / b.total) * 100) : 0,
        debt: b.debt,
        debtPct: b.total > 0 ? Math.round((b.debt / b.total) * 100) : 0,
      };
    }
    return {
      total: 0,
      cash: 0, cashPct: 0,
      card: 0, cardPct: 0,
      wallet: 0, walletPct: 0,
      debt: 0, debtPct: 0,
    };
  }, [stats]);

  const renderPaymentMethodsWidget = () => {
    const paymentMethodsList = [
      {
        id: 'cash',
        label: t.cash,
        pct: paymentStats.cashPct,
        amount: paymentStats.cash,
        icon: '💰',
        wrapperClass: 'hover:border-emerald-500/20',
        iconClass: 'text-emerald-600',
        amountClass: 'text-emerald-600',
      },
      {
        id: 'card',
        label: t.card,
        pct: paymentStats.cardPct,
        amount: paymentStats.card,
        icon: '💳',
        wrapperClass: 'hover:border-blue-500/20',
        iconClass: 'text-blue-600',
        amountClass: 'text-blue-600',
      },
      {
        id: 'check',
        label: (t as any).check,
        pct: paymentStats.walletPct,
        amount: paymentStats.wallet,
        icon: '📝',
        wrapperClass: 'hover:border-amber-500/20',
        iconClass: 'text-amber-600',
        amountClass: 'text-amber-600',
      },
      {
        id: 'debt',
        label: t.debt,
        pct: paymentStats.debtPct,
        amount: paymentStats.debt,
        icon: '📒',
        wrapperClass: 'hover:border-red-500/20',
        iconClass: 'text-red-600',
        amountClass: 'text-red-600',
      }
    ].sort((a, b) => b.amount - a.amount);

    return (
      <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
            {(t as any).usedPaymentMethods}
          </h3>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
              3
            </span>
          </div>
        </div>
        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
          {paymentMethodsList.map(method => (
            <div key={method.id} className={`flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent transition-all ${method.wrapperClass}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-card border border-border-subtle flex items-center justify-center ${method.iconClass}`}>
                  <span className="font-bold text-lg">{method.icon}</span>
                </div>
                <div>
                  <div className="flex-1 min-w-0 overflow-hidden"><div className="text-sm font-bold text-text-main truncate" dir="auto">{method.label}</div><div className="text-xs text-text-secondary font-medium uppercase tracking-tight">{method.pct}%</div></div>
                </div>
              </div>
              <div className="text-right shrink-0 whitespace-nowrap ml-2">
                <div className={`text-lg font-black ${method.amountClass}`}>{formatNumber(method.amount)}</div>
                <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, subtext, color = "text-text-main", bg = "bg-card", icon: Icon, showCurrency = true, onClick, danger, badgeText, badgeColor }: any) => {
    const valueStr = String(value);
    const valueSize = valueStr.length > 12 ? 'text-xl xl:text-2xl' : valueStr.length > 8 ? 'text-2xl xl:text-3xl' : 'text-3xl xl:text-4xl';
    
    return (
      <div 
        onClick={onClick}
        className={cn(
          bg, 
          "p-5 sm:p-6 rounded-3xl border shadow-xs flex flex-col justify-between min-h-[175px] transition-all relative overflow-hidden group",
          onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-accent/40 active:scale-98" : "hover:border-border-subtle/80",
          danger ? "border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20" : "border-border-subtle"
        )}
      >
        {/* Top Row: Title + Icon */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary truncate">
            {title}
          </span>
          {Icon && (
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border transition-transform group-hover:scale-105",
              danger 
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50" 
                : "bg-bg-base text-accent border-border-subtle/60"
            )}>
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Middle Value */}
        <div className="my-auto py-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span dir="ltr" className={`${valueSize} font-black ${color} font-mono tracking-tight`}>
              {value}
            </span>
            {showCurrency && (
              <span className="text-xs font-black text-text-secondary/70 uppercase font-mono">
                {t.currency}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Subtext / Badge */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-subtle/50 text-[11px]">
          <span className="text-text-secondary font-medium truncate">
            {subtext}
          </span>
          {badgeText && (
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 font-mono uppercase tracking-wider",
              badgeColor || "bg-accent/10 text-accent border border-accent/20"
            )}>
              {badgeText}
            </span>
          )}
        </div>
      </div>
    );
  };

  const ProfitBreakdown = ({ breakdown }: { breakdown: any }) => {
    if (!breakdown) return null;
    return (
      <div className="mt-3 pt-3 border-t border-border-subtle/60 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            <span className="opacity-80 text-[10px]">{t.cash}</span>
            <span dir="ltr" className="font-mono font-black">{formatNumber(breakdown.cash)}</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            <span className="opacity-80 text-[10px]">{t.card}</span>
            <span dir="ltr" className="font-mono font-black">{formatNumber(breakdown.card)}</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <span className="opacity-80 text-[10px]">{t.check}</span>
            <span dir="ltr" className="font-mono font-black">{formatNumber(breakdown.check)}</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
            <span className="opacity-80 text-[10px]">{t.debt}</span>
            <span dir="ltr" className="font-mono font-black">{formatNumber(breakdown.debt)}</span>
          </div>
        </div>
        {Number(breakdown.remise) > 0 && (
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100/60 dark:border-indigo-900/30">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-500" />
              <span>{(t as any).remiseTotal || t.discount}</span>
            </span>
            <span dir="ltr" className="font-mono font-black">{formatNumber(breakdown.remise)} {t.currency}</span>
          </div>
        )}
      </div>
    );
  };

  // Check if no dashboard elements are permitted
  if (!permissions.financialsSales && !permissions.financialsDebts && !permissions.financialsProfits && !permissions.financialsInventory && !permissions.supplierDebt && !permissions.financialsRestricted && !permissions.financialsPaymentMethods) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4 opacity-75">
        <ShieldCheck className="w-16 h-16 text-text-secondary animate-pulse" />
        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest text-center">
          {t.noFinancialPermissions}
        </p>
      </div>
    );
  }

  if (permissions.financialsRestricted && !permissions.financials) {
    const debtorCustomers = customers.filter(c => c.debt > 0);
    const debtorCustomersCount = debtorCustomers.length;
    
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Simplified Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Profit Card */}
          <div className="bg-card p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[180px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t.todayProfit}</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
            </div>
            <div className={cn(isAr && "text-right")}>
              <span className="text-2xl xl:text-3xl font-black text-emerald-600 whitespace-nowrap tracking-tighter">{formatNumber(dailyProfit)}</span>
              <span className="text-xs font-bold text-text-secondary ml-1">{t.currency}</span>
            </div>
            <ProfitBreakdown breakdown={stats?.dailyProfitBreakdown} />
          </div>

          {/* Debtor Customers Card */}
          <div className="bg-card p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              {t.debtorCustomers}
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-black text-text-main font-mono">{formatNumber(debtorCustomersCount)}</div>
              <div className="text-sm font-bold text-text-secondary mt-1">{t.customerCountUnit}</div>
            </div>
            <div className="text-xs text-text-secondary/60 font-medium mt-4">
              {t.customersWithBalance}
            </div>
          </div>
        </div>

        {/* Simplified Charts & Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                {t.salesTrend7Days}
              </h3>
              <div className="flex items-center gap-2 min-w-0">
                {pctChange !== null && (
                  <div className={cn(
                    "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full",
                    pctChange >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                  )}>
                    {pctChange >= 0
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(pctChange).toFixed(1)}%
                    <span className="opacity-60 font-medium">
                      {language === 'ar' ? 'vs أسبوع' : language === 'fr' ? 'vs sem. préc.' : 'vs last wk'}
                    </span>
                  </div>
                )}
                <div className="text-lg font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                  {formatNumber(totalTrend7)} {t.currency}
                </div>
              </div>
            </div>
            <div className="h-[250px] w-full">
              {trendData.every((d: any) => d.amount === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.noSalesInPeriod || "NO SALES"}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSalesRestricted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} width={72} />
                    <ReChartsTooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#6366f1' }}
                      formatter={(value: number) => [
                        `${formatNumber(value)} ${t.currency}`,
                        language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales'
                      ]}
                    />
                    {avgTrend > 0 && (
                      <ReferenceLine
                        y={avgTrend}
                        stroke="#94a3b8"
                        strokeDasharray="6 3"
                        strokeOpacity={0.6}
                        label={{
                          value: language === 'ar' ? `متوسط: ${formatNumber(avgTrend)}` : language === 'fr' ? `Moy: ${formatNumber(avgTrend)}` : `Avg: ${formatNumber(avgTrend)}`,
                          position: 'insideTopRight',
                          fontSize: 9,
                          fontWeight: 700,
                          fill: '#94a3b8',
                          dy: -6,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSalesRestricted)"
                      activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }}
                      dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Critical Stock Alerts */}
          <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
                {t.stockAlerts}
              </h3>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">
                  {lowStock.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
              {lowStock.length > 0 ? (
                lowStock.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-card border border-border-subtle flex items-center justify-center text-accent shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="text-xs font-bold text-text-main truncate" title={p.name} dir="auto">{p.name}</div>
                        <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{categories.find(c => c.id === p.categoryId)?.name || p.barcode || (language === 'ar' ? 'عام' : 'Général')}</div>
                      </div>
                    </div>
                    <div className="text-right pl-2 shrink-0">
                      <div className="text-base font-black text-danger">{p.qty}</div>
                      <div className="text-[8px] font-bold text-text-secondary uppercase">{t.inStock}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-3xl bg-success/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-sm font-bold text-text-secondary">
                    {t.noStockAlerts}
                  </p>
                </div>
              )}
            </div>
          </div>
          {permissions.financialsPaymentMethods && renderPaymentMethodsWidget()}
        </div>
      </div>
    );
  }

  // Count visible stats cards to dynamically calculate responsive layout columns
  const visibleCardsCount = [
    permissions.financialsDebts, // Pending Debts
    permissions.financialsDebts, // Debtor Customers
    permissions.financialsProfits, // Expected Profit
    permissions.financialsInventory, // Inventory Value
    permissions.financialsInventory, // Damaged Goods
    permissions.financialsSales // Total Revenue (Black Card)
  ].filter(Boolean).length;

  const gridColsClass = 
    visibleCardsCount >= 6 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-6" :
    visibleCardsCount === 5 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" :
    visibleCardsCount === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    visibleCardsCount === 3 ? "grid-cols-1 md:grid-cols-3" :
    visibleCardsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-7 pb-24 px-1 sm:px-2 md:px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── EXECUTIVE FINANCIAL DASHBOARD HEADER ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card/60 border border-border-subtle/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm">
        
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
                {t.financialDashboard}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {language === 'ar' ? 'مباشر' : 'Temps Réel'}
              </span>
            </div>
            <p className="text-xs font-semibold text-text-secondary mt-0.5">
              {isAr 
                ? 'نظرة شاملة ومفصلة على المداخيل، الأرباح، السيولة، والديون'
                : 'Vue d\'ensemble de la rentabilité, trésorerie, valorisation des stocks et créances'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Quick Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-bg-base border border-border-subtle text-text-secondary hover:text-text-main hover:border-accent transition-all shadow-xs active:scale-95"
            title={language === 'ar' ? 'تحديث البيانات' : 'Actualiser'}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-accent")} />
          </button>

          {/* Damages Report Quick PDF */}
          {permissions.financialsInventory && (
            <button
              onClick={handleExportDamages}
              className="px-4 py-2.5 rounded-2xl bg-bg-base border border-border-subtle text-text-secondary hover:text-text-main hover:border-accent transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs active:scale-95"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{language === 'ar' ? 'تقرير التلف' : 'Rapport Avaries'}</span>
            </button>
          )}

          {/* Global Statement / Financial Print */}
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-2xl bg-accent text-white hover:bg-accent/90 transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-accent/20 active:scale-95"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'ar' ? 'طباعة التقرير' : 'Imprimer Synthèse'}</span>
          </button>

        </div>
      </div>
            {permissions.financialsDebts && upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {upcomingDebts.map(c => {
                const cDueDate = c.dueDate || c.due_date;
                const isOverdue = new Date(cDueDate!) < new Date();
                return (
                  <div key={c.id} className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-2",
                    isOverdue ? "bg-red-500 text-white border-red-600" : "bg-card border-border-subtle text-text-main"
                  )}>
                    <span>{c.name}</span>
                    <span className="opacity-60">{cDueDate}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {permissions.supplierDebt && upcomingSupplierDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-amber-600 overflow-hidden relative shadow-sm"
        >
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingSupplierDebtDueDates}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {upcomingSupplierDebts.map(s => {
                const sDueDate = s.dueDate || s.due_date;
                const isOverdue = new Date(sDueDate!) < new Date();
                return (
                  <div key={s.id} className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-2",
                    isOverdue ? "bg-amber-500 text-white border-amber-600" : "bg-card border-border-subtle text-text-main"
                  )}>
                    <span>{s.name}</span>
                    <span className="opacity-60">{sDueDate}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

            {/* ── TOP STATS: ROW 1 (STRATEGIC PILLARS) & ROW 2 (OPERATIONS & LIQUIDITY) ── */}
      <div className="space-y-5">
        
        {/* Row 1: High Level Revenue, Profit, Stock & Customer Debts (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 1: Chiffre d'Affaires Global (Ventes Totales) */}
          {permissions.financialsSales && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/20 shadow-xl shadow-emerald-950/20 flex flex-col justify-between min-h-[175px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-12 translate-x-12 pointer-events-none" />
              
              <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  {t.totalSales}
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <div className="my-auto py-1 relative z-10">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span dir="ltr" className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                    {formatNumber(totalRevenue)}
                  </span>
                  <span className="text-xs font-black uppercase text-emerald-400 font-mono">
                    {t.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10 text-[11px] relative z-10">
                <span className="text-white/60 font-medium">
                  {settings?.shop_name || 'AGRI BOUTABSSIL'}
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {sales.length} {language === 'ar' ? 'فاتورة' : 'ventes'}
                </span>
              </div>
            </div>
          )}

          {/* Card 2: Bénéfice Prévisionnel */}
          {permissions.financialsProfits && (
            <StatCard 
              title={t.expectedProfit} 
              value={formatNumber(netProfit)} 
              subtext={language === 'ar' ? 'هامش الربح المتوقع' : 'Marge nette prévisionnelle'}
              color="text-emerald-600 dark:text-emerald-400"
              icon={TrendingUp}
              badgeText={totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : undefined}
              badgeColor="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            />
          )}

          {/* Card 3: Valeur du Stock Réel */}
          {permissions.financialsInventory && (
            <StatCard 
              title={t.inventoryValue} 
              value={formatNumber(inventoryAssetValue)} 
              subtext={language === 'ar' ? 'سعر التكلفة الإجمالي' : 'Valorisation au coût d\'achat'}
              color="text-blue-600 dark:text-blue-400"
              icon={Package}
              badgeText={`${products.length} ${language === 'ar' ? 'مادة' : 'articles'}`}
              badgeColor="bg-blue-500/10 text-blue-600 border border-blue-500/20"
            />
          )}

          {/* Card 4: Créances Clients (Dettes en attente) */}
          {permissions.financialsDebts && (
            <StatCard 
              title={t.pendingDebts} 
              value={formatNumber(totalCustomerDebt)} 
              subtext={language === 'ar' ? 'مجموع ديون الزبائن' : 'Encours global des clients'}
              color={totalCustomerDebt > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}
              icon={Users}
              badgeText={`${debtorCustomersCount} ${language === 'ar' ? 'مدين' : 'débiteurs'}`}
              badgeColor="bg-amber-500/10 text-amber-600 border border-amber-500/20"
            />
          )}

        </div>

        {/* Row 2: Secondary Operational Indicators (Balanced 4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 5: Dette Totale Fournisseurs */}
          {permissions.supplierDebt && (
            <StatCard 
              title={t.totalSupplierDebt} 
              value={formatNumber(totalSupplierDebt)} 
              subtext={t.amountOwedToSuppliers}
              color={totalSupplierDebt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}
              icon={Store}
              danger={totalSupplierDebt > 0}
              badgeText={`${suppliers.filter(s => s.debt > 0).length} ${language === 'ar' ? 'مورد' : 'fournisseurs'}`}
              badgeColor="bg-rose-500/10 text-rose-600 border border-rose-500/20"
            />
          )}

          {/* Card 6: Chèques Clients en Portefeuille */}
          <StatCard 
            title={language === 'ar' ? 'شيكات في الانتظار' : 'Chèques en Portefeuille'} 
            value={formatNumber(pendingChecksTotal)} 
            subtext={language === 'ar' ? 'شيكات زبائن قيد التحصيل' : 'Règlements chèques à encaisser'}
            color="text-indigo-600 dark:text-indigo-400"
            icon={CreditCard}
            badgeText={`${pendingChecks.length} ${language === 'ar' ? 'شيك' : 'chèques'}`}
            badgeColor="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
          />

          {/* Card 7: Clients Endettés */}
          {permissions.financialsDebts && (
            <StatCard 
              title={t.debtorCustomers} 
              value={formatNumber(debtorCustomersCount, 0)} 
              subtext={t.customersWithBalance}
              color="text-text-main"
              icon={UserCheck}
              showCurrency={false}
              badgeText={upcomingDebts.length > 0 ? `${upcomingDebts.length} ${language === 'ar' ? 'متأخر' : 'retard'}` : undefined}
              badgeColor={upcomingDebts.length > 0 ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : undefined}
            />
          )}

          {/* Card 8: Pertes & Marchandises Endommagées */}
          {permissions.financialsInventory && (
            <StatCard 
              title={t.damages} 
              value={formatNumber(totalDamagesLoss)} 
              subtext={
                damagesTotalQty > 0 
                  ? `${damagesTotalQty} ${language === 'ar' ? 'قطع تالفة • تصدير PDF' : 'articles perdus • Export PDF'}` 
                  : (language === 'ar' ? 'انقر لتصدير PDF' : 'Cliquez pour exporter le PDF')
              } 
              color={totalDamagesLoss > 0 ? "text-rose-600 dark:text-rose-400" : "text-text-main"}
              icon={AlertTriangle}
              onClick={handleExportDamages}
              danger={totalDamagesLoss > 0}
              badgeText={
                damagesCount > 0 
                  ? `${damagesCount} ${language === 'ar' ? (damagesCount === 1 ? 'حالة' : 'حالات') : (damagesCount === 1 ? 'enregistrement' : 'enregistrements')}` 
                  : (language === 'ar' ? 'PDF' : 'Rapport')
              }
              badgeColor={totalDamagesLoss > 0 ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-slate-500/10 text-slate-600 border border-slate-500/20"}
            />
          )}

        </div>

      </div>

      {permissions.financialsProfits && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className={cn("text-xs font-black uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-2", isAr && "text-right")}>
            {t.realizedSalesProfits}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Aujourd'hui */}
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t.todayProfit}</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <CalendarClock className="w-4 h-4 stroke-[2.2]" />
                  </span>
                </div>
                <div className={cn("my-1", isAr && "text-right")}>
                  <div className="flex items-baseline gap-1.5">
                    <span dir="ltr" className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      {formatNumber(dailyProfit)}
                    </span>
                    <span className="text-xs font-black text-text-secondary uppercase font-mono">{t.currency}</span>
                  </div>
                </div>
              </div>
              <ProfitBreakdown breakdown={stats?.dailyProfitBreakdown} />
            </div>

            {/* Cette Semaine */}
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t.weeklyProfit}</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <TrendingUp className="w-4 h-4 stroke-[2.2]" />
                  </span>
                </div>
                <div className={cn("my-1", isAr && "text-right")}>
                  <div className="flex items-baseline gap-1.5">
                    <span dir="ltr" className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      {formatNumber(weeklyProfit)}
                    </span>
                    <span className="text-xs font-black text-text-secondary uppercase font-mono">{t.currency}</span>
                  </div>
                </div>
              </div>
              <ProfitBreakdown breakdown={stats?.weeklyProfitBreakdown} />
            </div>

            {/* Ce Mois */}
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t.monthlyProfit}</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <Activity className="w-4 h-4 stroke-[2.2]" />
                  </span>
                </div>
                <div className={cn("my-1", isAr && "text-right")}>
                  <div className="flex items-baseline gap-1.5">
                    <span dir="ltr" className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      {formatNumber(monthlyProfit)}
                    </span>
                    <span className="text-xs font-black text-text-secondary uppercase font-mono">{t.currency}</span>
                  </div>
                </div>
              </div>
              <ProfitBreakdown breakdown={stats?.monthlyProfitBreakdown} />
            </div>

            {/* Cette Année */}
            <div className="bg-card p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xs flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{t.yearlyProfit}</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="w-4 h-4 stroke-[2.2]" />
                  </span>
                </div>
                <div className={cn("my-1", isAr && "text-right")}>
                  <div className="flex items-baseline gap-1.5">
                    <span dir="ltr" className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      {formatNumber(yearlyProfit)}
                    </span>
                    <span className="text-xs font-black text-text-secondary uppercase font-mono">{t.currency}</span>
                  </div>
                </div>
              </div>
              <ProfitBreakdown breakdown={stats?.yearlyProfitBreakdown} />
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        {/* Main Content Area */}
        <div className="space-y-8 w-full">
          {(permissions.financialsSales || permissions.financialsInventory) && (
            <div className={cn("grid grid-cols-1 gap-6", 
              permissions.financialsSales && permissions.financialsInventory ? "lg:grid-cols-3" : "grid-cols-1"
            )}>
               {/* Sales Trend Chart */}
               {permissions.financialsSales && (
                 <div className={cn(permissions.financialsInventory ? "lg:col-span-2" : "col-span-1", "bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm relative overflow-hidden group")}>
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-accent" />
                         {t.salesTrend7Days}
                       </h3>
                       <div className="flex items-center gap-2 min-w-0">
                         {pctChange !== null && (
                           <div className={cn(
                             "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full",
                             pctChange >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                           )}>
                             {pctChange >= 0
                               ? <ArrowUpRight className="w-3.5 h-3.5" />
                               : <ArrowDownRight className="w-3.5 h-3.5" />}
                             {Math.abs(pctChange).toFixed(1)}%
                             <span className="opacity-60 font-medium">
                               {language === 'ar' ? 'vs أسبوع' : language === 'fr' ? 'vs sem. préc.' : 'vs last wk'}
                             </span>
                           </div>
                         )}
                         <div className="text-lg font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                           {formatNumber(totalTrend7)} {t.currency}
                         </div>
                       </div>
                    </div>
                    <div className="h-[250px] w-full">
                      {trendData.every((d: any) => d.amount === 0) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                          <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-widest">{t.noSalesInPeriod}</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                          <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                            <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} width={72} />
                            <ReChartsTooltip
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                              itemStyle={{ color: '#6366f1' }}
                              formatter={(value: number) => [
                                `${formatNumber(value)} ${t.currency}`,
                                language === 'ar' ? 'المبيعات' : language === 'fr' ? 'Ventes' : 'Sales'
                              ]}
                            />
                            {avgTrend > 0 && (
                              <ReferenceLine
                                y={avgTrend}
                                stroke="#94a3b8"
                                strokeDasharray="6 3"
                                strokeOpacity={0.6}
                                label={{
                                  value: language === 'ar' ? `متوسط: ${formatNumber(avgTrend)}` : language === 'fr' ? `Moy: ${formatNumber(avgTrend)}` : `Avg: ${formatNumber(avgTrend)}`,
                                  position: 'insideTopRight',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  fill: '#94a3b8',
                                  dy: -6,
                                }}
                              />
                            )}
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#6366f1"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorSales)"
                              activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }}
                              dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                 </div>
               )}

               {/* Category Distribution Pie Chart */}
               {permissions.financialsInventory && (
                 <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm relative overflow-hidden flex flex-col h-full min-h-[400px]">
                   <h4 className="text-xs font-black uppercase text-text-main tracking-widest mb-6 flex items-center gap-2">
                     <LayoutGrid className="w-5 h-5 text-blue-500" />
                     {t.inventoryValueByCategory}
                   </h4>
                   <div className="flex-1 w-full min-h-[220px]">
                     {categoryValueData.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                         <LayoutGrid className="w-8 h-8" />
                         <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
                       </div>
                     ) : (
                       <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={1}>
                         <PieChart>
                           <Pie
                             data={categoryValueData}
                             cx="50%"
                             cy="45%"
                             innerRadius={45}
                             outerRadius={70}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             {categoryValueData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <ReChartsTooltip 
                             formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'القيمة' : language === 'fr' ? 'Valeur' : 'Value']}
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                             itemStyle={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}
                           />
                           <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                         </PieChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                 </div>
               )}
            </div>
          )}
          {(permissions.financialsPaymentMethods || permissions.financialsTopProducts || permissions.financialsTopDebtors || permissions.financialsInventory) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 mt-8">
              {permissions.financialsInventory && (
                 <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm flex flex-col h-full min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">{t.stockAlerts}</h3>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">{lowStock.length}</span>
                        <button 
                          onClick={() => {
                            const criticalItems = products.filter(p => p.qty <= (p.minStock ?? 5));
                            generateStockReportPDF({
                              items: criticalItems,
                              generatedAt: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US'),
                              language: language
                            });
                          }}
                          className="p-2 hover:bg-bg-base rounded-full transition-colors"
                          title={language === 'ar' ? "تصدير" : language === 'fr' ? "Exporter" : "Export"}
                        >
                          <Download className="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
                      {lowStock.length > 0 ? (
                        lowStock.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-card border border-border-subtle flex items-center justify-center text-accent shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden flex-1 min-w-0">
                                <div className="text-xs font-bold text-text-main truncate" title={p.name} dir="auto">{p.name}</div>
                                <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{categories.find(c => c.id === p.categoryId)?.name || p.barcode || (language === 'ar' ? 'عام' : 'Général')}</div>
                              </div>
                            </div>
                            <div className="text-right pl-2 shrink-0">
                              <div className="text-base font-black text-danger">{p.qty}</div>
                              <div className="text-[8px] font-bold text-text-secondary uppercase">{t.inStock}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-success/10 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-success" />
                          </div>
                          <p className="text-sm font-bold text-text-secondary">{t.noStockAlerts}</p>
                        </div>
                      )}
                    </div>
                 </div>
              )}
              {permissions.financialsPaymentMethods && renderPaymentMethodsWidget()}
              {permissions.financialsTopProducts && (
                 <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                  <h4 className="text-xs font-black uppercase text-text-main tracking-widest mb-6 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-accent" />
                    {(t as any).topSellingProducts}
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {topProductsList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                        <ShoppingCart className="w-8 h-8" />
                        <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
                      </div>
                    ) : (
                      topProductsList.map((tp: any, idx: number) => (
                        <div key={tp.id} className="flex items-center justify-between p-3 bg-bg-base/50 border border-transparent rounded-2xl hover:border-accent/20 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-black text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex-1 min-w-0 overflow-hidden"><div className="text-sm font-bold text-text-main truncate" dir="auto">{tp.name}</div><div className="text-xs text-text-secondary font-medium tracking-tight uppercase truncate">{formatNumber(tp.qty, 0)} {(t as any).unitLabel || (language === 'ar' ? 'وحدة' : 'unités')} • {formatNumber(tp.avg_price || tp.price)} {t.currency}/u</div></div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 whitespace-nowrap ml-2">
                             <div className="text-lg font-black text-emerald-600 font-mono">{formatNumber(tp.total_revenue || tp.price * tp.qty)}</div>
                             <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                 </div>
              )}
              {permissions.financialsTopDebtors && (
                 <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                  <h4 className="text-xs font-black uppercase text-text-main tracking-widest mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    {(t as any).topDebtors}
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {topDebtorsList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                        <Users className="w-8 h-8" />
                        <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
                      </div>
                    ) : (
                      topDebtorsList.map((c: any, idx: number) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-bg-base/50 border border-transparent rounded-2xl hover:border-red-500/20 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-black text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex-1 min-w-0 overflow-hidden"><div className="text-sm font-bold text-text-main truncate" dir="auto">{c.name}</div><div className="text-xs text-text-secondary font-medium tracking-tight uppercase truncate">{c.phone || '-'}</div></div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 whitespace-nowrap ml-2">
                             <div className="text-lg font-black text-red-600">{formatNumber(c.debt)}</div>
                             <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                 </div>
              )}
              {permissions.financialsInventory && (
                 <div className="bg-card p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-border-subtle shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                  <h4 className="text-xs font-black uppercase text-text-main tracking-widest mb-6 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-500" />
                    {language === 'ar' ? 'السلع غير المباعة (أكثر من 3 أشهر)' : language === 'fr' ? 'Stock dormant (> 3 mois)' : 'Dormant Stock (> 3 months)'}
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {dormantStockList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                        <Archive className="w-8 h-8" />
                        <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
                      </div>
                    ) : (
                      dormantStockList.map((tp: any, idx: number) => (
                        <div key={tp.id} className="flex items-center justify-between p-3 bg-bg-base/50 border border-transparent rounded-2xl hover:border-amber-500/20 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-text-main line-clamp-1" title={tp.name}>{tp.name}</div>
                              <div className="text-xs text-text-secondary font-medium tracking-tight uppercase">{tp.qty} {t.inStock}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 whitespace-nowrap ml-2">
                             <div className="text-lg font-black text-amber-600">{formatNumber(tp.totalValue)}</div>
                             <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                 </div>
              )}
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}

