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
  generateStockReportPDF
} from '../services/invoiceService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReChartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Destructure common icons to avoid TS errors
const { Search, Archive, ArrowRightLeft, Hash, User, CalendarClock, FolderOpen, Eye, CheckCircle, Sparkles, UserCog, Store, ChevronRight, ShieldAlert, Cloud, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image: ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe } = LucideIcons;

export default function FinancialDashboardView({ permissions, currency }: { permissions: any, currency?: string }) {
  const { products, customers, suppliers, sales, payments, stats, settings } = useStore();
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

  const lowStock = products.filter(p => p.qty <= (p.minStock ?? settings?.lowStockThreshold ?? 5));

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
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const trendData = last7Days.map(date => {
    const total = sales
      .filter(s => s.date && typeof s.date === 'string' && s.date.startsWith(date))
      .reduce((sum, s) => sum + s.total, 0);
    return {
      date: date.split('-').reverse().slice(0, 2).reverse().join('/'),
      amount: total
    };
  });

  const paymentStats = useMemo(() => {
    let cash = 0, card = 0, wallet = 0, debt = 0, total = 0;
    sales.forEach(s => {
      const amount = s.total || 0;
      total += amount;
      const m = (s.paymentMethod || 'cash').toLowerCase();
      if (m === 'cash') cash += amount;
      else if (m === 'card') card += amount;
      else if (m === 'debt') debt += amount;
      else if (m === 'check') wallet += amount; // We'll map check/other to digital wallet/checks
      else wallet += amount; 
    });
    return {
      total,
      cash, cashPct: total > 0 ? Math.round((cash / total) * 100) : 0,
      card, cardPct: total > 0 ? Math.round((card / total) * 100) : 0,
      wallet, walletPct: total > 0 ? Math.round((wallet / total) * 100) : 0,
      debt, debtPct: total > 0 ? Math.round((debt / total) * 100) : 0,
    };
  }, [sales]);

  const renderPaymentMethodsWidget = () => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
          {(t as any).usedPaymentMethods}
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
            3
          </span>
        </div>
      </div>
      <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
        {/* Cash */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-emerald-600">
              <span className="font-bold text-lg">💰</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.cash}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.cashPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-emerald-600">{formatNumber(paymentStats.cash)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Card */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-blue-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-blue-600">
              <span className="font-bold text-lg">💳</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.card}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.cardPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-blue-600">{formatNumber(paymentStats.card)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Check */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-amber-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-amber-600">
              <span className="font-bold text-lg">📝</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{(t as any).check}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.walletPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-amber-600">{formatNumber(paymentStats.wallet)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Debt */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-red-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-red-600">
              <span className="font-bold text-lg">📒</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.debt}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.debtPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-red-600">{formatNumber(paymentStats.debt)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ title, value, subtext, color = "text-text-main", bg = "bg-card", showCurrency = true }: any) => (
    <div className={`${bg} p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]`}>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{title}</div>
      <div className="flex flex-col items-center">
        <div className={`text-4xl font-black ${color}`}>{value}</div>
        {showCurrency && <div className={`text-sm font-bold mt-1 ${color}`}>{isAr ? 'درهم' : currency}</div>}
      </div>
      <div className="text-[10px] text-text-secondary/60 font-medium mt-4">{subtext}</div>
    </div>
  );

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
          <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[180px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.todayProfit}</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
            </div>
            <div className={cn(isAr && "text-right")}>
              <span className="text-3xl font-black text-emerald-600">{formatNumber(dailyProfit)}</span>
              <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
            </div>
          </div>

          {/* Debtor Customers Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
              {t.debtorCustomers}
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-black text-text-main font-mono">{formatNumber(debtorCustomersCount)}</div>
              <div className="text-sm font-bold text-text-secondary mt-1">{t.customerCountUnit}</div>
            </div>
            <div className="text-[10px] text-text-secondary/60 font-medium mt-4">
              {t.customersWithBalance}
            </div>
          </div>
        </div>

        {/* Simplified Charts & Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                {t.salesTrend7Days}
              </h3>
              <div className="text-sm font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                {formatNumber(trendData.reduce((acc: number, curr: any) => acc + curr.amount, 0))} {t.currency}
              </div>
            </div>
            <div className="h-[250px] w-full">
              {trendData.every((d: any) => d.amount === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.noSalesInPeriod || "NO SALES"}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorSalesRestricted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} />
                    <ReChartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#6366f1' }}
                      formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'المبيعات' : 'Sales']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#6366f1" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorSalesRestricted)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                      dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Critical Stock Alerts */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
                {t.stockAlerts}
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">
                  {lowStock.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
              {lowStock.length > 0 ? (
                lowStock.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white border border-border-subtle flex items-center justify-center text-accent shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-text-main truncate" title={p.name}>{p.name}</div>
                        <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{p.categoryId}</div>
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
    permissions.financialsSales // Total Revenue (Black Card)
  ].filter(Boolean).length;

  const gridColsClass = 
    visibleCardsCount === 5 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" :
    visibleCardsCount === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    visibleCardsCount === 3 ? "grid-cols-1 md:grid-cols-3" :
    visibleCardsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingDebts.map(c => `${c.name} (${c.dueDate || c.due_date})`).join(', ')}
            </p>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingSupplierDebtDueDates}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingSupplierDebts.map(s => `${s.name} (${s.dueDate || s.due_date})`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}

            {/* Top Stats Grid */}
      {visibleCardsCount > 0 && (
        <div className={`grid ${gridColsClass} gap-6`}>
          {permissions.financialsDebts && (
            <>
              <StatCard 
                title={t.pendingDebts} 
                value={formatNumber(totalCustomerDebt)} 
                subtext={t.debtWallet}
              />
              <StatCard 
                title={t.debtorCustomers} 
                value={formatNumber(customers.filter(c => c.debt > 0).length)} 
                subtext={t.customersWithBalance}
                color="text-text-main"
                showCurrency={false}
              />
            </>
          )}
          {permissions.financialsProfits && (
            <StatCard 
              title={t.expectedProfit} 
              value={formatNumber(netProfit)} 
              subtext={t.expectedProfit}
            />
          )}
          {permissions.financialsInventory && (
            <StatCard 
              title={t.inventoryValue} 
              value={formatNumber(inventoryAssetValue)} 
              subtext={t.totalInventoryValue}
            />
          )}
                    {permissions.financialsSales && (
            /* Black Card */
            <div className="bg-black p-6 rounded-[2.5rem] flex flex-col items-center text-center justify-between min-h-[180px] shadow-xl shadow-black/10">
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">AGRI BOUTABSSIL</div>
              <div className="flex flex-col items-center">
                 <Logo className="w-12 h-12 mb-2 p-1" />
                                <div className="text-3xl font-black text-white">{formatNumber(totalRevenue)}</div>
                <div className="text-sm font-bold mt-1 text-white">{t.currency}</div>
              </div>
              <div className="text-[10px] text-white/50 font-medium mt-4">{t.totalSales}</div>
            </div>
          )}
        </div>
      )}

      {permissions.financialsProfits && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className={cn("text-xs font-black uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-2", isAr && "text-right")}>
            {t.realizedSalesProfits}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.todayProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(dailyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.weeklyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(weeklyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.monthlyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(monthlyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.yearlyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Sparkles className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(yearlyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className={cn(permissions.supplierDebt ? "lg:col-span-3" : "lg:col-span-4", "space-y-6")}>
          {(permissions.financialsInventory || permissions.financialsSales) && (
            <div className={cn("grid grid-cols-1 gap-6", 
              permissions.financialsInventory && permissions.financialsSales ? "md:grid-cols-2" : "grid-cols-1"
            )}>
               {/* Critical Stock Alerts */}
               {permissions.financialsInventory && (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">{t.stockAlerts}</h3>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">{lowStock.length}</span>
                        <button 
                          onClick={() => {
                            const criticalItems = products.filter(p => p.qty <= (p.minStock ?? 5));
                            generateStockReportPDF({
                              items: criticalItems,
                              generatedAt: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                              language: language
                            });
                          }}
                          className="p-2 hover:bg-bg-base rounded-full transition-colors"
                          title={language === 'ar' ? "تصدير" : "Export"}
                        >
                          <Download className="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
                      {lowStock.length > 0 ? (
                        lowStock.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white border border-border-subtle flex items-center justify-center text-accent shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-xs font-bold text-text-main truncate" title={p.name}>{p.name}</div>
                                <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{p.categoryId}</div>
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

               {/* Sales Trend Chart */}
               {permissions.financialsSales && (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-accent" />
                         {isAr ? 'اتجاه المبيعات (7 أيام)' : 'SALES TREND (7 DAYS)'}
                       </h3>
                       <div className="text-sm font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                         {formatNumber(trendData.reduce((acc: number, curr: any) => acc + curr.amount, 0))} {t.currency}
                       </div>
                    </div>
                    <div className="h-[250px] w-full">
                      {trendData.every((d: any) => d.amount === 0) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                          <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-widest">{isAr ? "لا توجد مبيعات" : "NO SALES"}</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                              dy={10}
                            />
                            <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} />
                            <ReChartsTooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                              itemStyle={{ color: '#6366f1' }}
                              formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, isAr ? 'المبيعات' : 'Sales']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="#6366f1" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorSales)" 
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                              dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                 </div>
               )}
            </div>
          )}
          {permissions.financialsPaymentMethods && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {renderPaymentMethodsWidget()}
            </div>
          )}
        </div>

        {/* Sidebar Space */}
        {permissions.supplierDebt && (
          <div className="lg:col-span-1 space-y-6">
             {/* Supplier Debt Card */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-6">{t.totalSupplierDebt}</div>
                  <div className="text-5xl font-black text-text-main my-8">{formatNumber(totalSupplierDebt)}</div>
                  <div className="text-2xl font-black text-text-main">{t.currency}</div>
                  <div className="mt-8 pt-8 border-t border-border-subtle">
                    <div className="text-[11px] font-bold text-danger uppercase tracking-tighter">{t.amountOwedToSuppliers}</div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

