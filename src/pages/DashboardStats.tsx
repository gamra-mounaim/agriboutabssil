import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReChartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Package, Users, Wallet, AlertTriangle, TrendingUp, PieChart as PieChartIcon, Calendar, DollarSign, Activity, CreditCard, ShoppingCart, LayoutGrid, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Customer, Sale } from '../types';
import { Language, translations } from '../translations';
import { useStore, useAuthStore } from '../store/useStore';
import { generateStockReportPDF, generateDamagesReportPDF } from '../services/invoiceService';
import api from '../services/apiService';

export default // --- Component: Dashboard Highlights ---
function DashboardStats({ products, categories, customers, sales, language, stats, permissions }: { products: Product[], categories: Category[], customers: Customer[], sales: Sale[], language: Language, stats: any, permissions: any }) {
  const t = translations[language];
  
  const upcomingDebts = (customers || []).filter(c => {
    const cDueDate = c.dueDate || c.due_date;
    if (!cDueDate || c.debt <= 0) return false;
    const dueDate = new Date(cDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    // Near if overdue or within next 3 days
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  const totalSalesLifetime = stats?.totalSales || 0;
  const totalStockUnits = stats?.totalStock || 0;
  const totalInventoryValue = stats?.inventoryValue || 0;
  const totalExpectedProfit = stats?.expectedProfit || 0;
  const customersWithDebtCount = (customers || []).filter(c => c.debt > 0).length;
  const totalDebtValue = stats?.outstandingDebt || 0;
  const totalSupplierDebtValue = stats?.supplierDebt || 0;
  const totalDamagesLoss = stats?.totalDamagesLoss || 0;

  const handleExportDamages = async () => {
    try {
      const damages = await api.getDamagesReport();
      generateDamagesReportPDF(damages, totalDamagesLoss, language, undefined);
    } catch (e) {
      console.error(e);
      alert("Failed to export damages report");
    }
  };

  const lowStockCount = products.filter(p => p.qty <= (p.minStock ?? 5) && p.qty > 0).length;
  const outOfStockCount = products.filter(p => p.qty === 0).length;
  
  const todayDateStr = new Date().toLocaleDateString();
  const salesToday = sales.filter(s => new Date(s.date).toLocaleDateString() === todayDateStr);
  const revenueTodayValue = salesToday.reduce((acc, curr) => acc + curr.total, 0);

  // Chart Data
  const categoryValueData = (categories || []).map(cat => {
    const value = products
      .filter(p => p.categoryId === cat.id)
      .reduce((acc, p) => acc + ((p.costPrice || 0) * p.qty), 0);
    return { name: cat.name, value };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  const last7Days = stats?.last7Days || [];
  const topProductsList = stats?.topProductsList || [];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];


  return (
    <div className="space-y-8 mb-8">
      {upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-[13px] font-semibold opacity-90">
              {`${upcomingDebts.length} ${t.upcomingDebtsCount}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingDebts.slice(0, 3).map(c => {
              const cDueDate = c.dueDate || c.due_date;
              const isOverdue = new Date(cDueDate!) < new Date();
              return (
                <div key={c.id} className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-2",
                  isOverdue ? "bg-red-500 text-white border-red-600" : "bg-bg-base border-border-subtle text-text-main"
                )}>
                  <span>{c.name}</span>
                  <span className="opacity-60">{cDueDate}</span>
                </div>
              );
            })}
            {upcomingDebts.length > 3 && <span className="text-xs items-center flex font-bold">+ {upcomingDebts.length - 3}</span>}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 group/stats">
        <StatCard 
          label={t.totalSales} 
          value={`${formatNumber(totalSalesLifetime)} ${t.currency}`} 
          sub={t.lifetimeEarnings} 
          highlights
        />
        {permissions.profits && (
          <>
            <StatCard 
              label={t.inventoryValue} 
              value={`${formatNumber(totalInventoryValue)} ${t.currency}`} 
              sub={t.currentAssetValue} 
            />
            <StatCard 
              label={t.expectedProfit} 
              value={`${formatNumber(totalExpectedProfit)} ${t.currency}`} 
              sub={t.projectedGain} 
            />
          </>
        )}
        <StatCard 
          label={t.customersWithDebt} 
          value={formatNumber(customersWithDebtCount)} 
          sub={t.customersWithBalance} 
        />
        <StatCard 
          label={t.outstandingDebt}
          value={`${formatNumber(totalDebtValue)} ${t.currency}`} 
          sub={t.debtPortfolio} 
          danger={totalDebtValue > 500} 
        />
        <StatCard 
          label={t.totalSupplierDebt} 
          value={`${formatNumber(totalSupplierDebtValue)} ${t.currency}`} 
          sub={t.youOweSupplier} 
          danger={totalSupplierDebtValue > 0}
        />
        <StatCard 
          label={language === 'ar' ? 'السلع التالفة' : 'Damaged Goods'} 
          value={`${formatNumber(totalDamagesLoss)} ${t.currency}`} 
          sub={language === 'ar' ? 'انقر لتصدير PDF' : 'Click to export PDF'} 
          danger={totalDamagesLoss > 0}
          onClick={handleExportDamages}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-card border border-border-subtle p-6 rounded-2xl shadow-sm relative overflow-hidden group h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold text-text-main flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 text-accent" />
              {t.salesTrend7Days}
            </h4>
            <div className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-full">
              {formatNumber(last7Days.reduce((acc, curr) => acc + curr.amount, 0))} {t.currency}
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            {last7Days.every(d => d.amount === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-bold uppercase tracking-widest">{language === 'ar' ? "لا توجد مبيعات" : "NO SALES"}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" strokeOpacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-secondary)' }} dy={10} />
                  <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-secondary)' }} tickFormatter={(val) => formatNumber(val)} />
                  <ReChartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border-subtle)', background: 'var(--color-card)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-main)' }}
                    itemStyle={{ color: 'var(--color-accent)' }}
                    formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'المبيعات' : 'Sales']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="var(--color-accent)" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-accent)' }}
                    dot={{ r: 3, fill: 'var(--color-bg-base)', stroke: 'var(--color-accent)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[350px]">
          <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-6 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-accent" />
            {language === 'ar' ? "أفضل المنتجات مبيعاً" : "TOP SELLING PRODUCTS"}
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {topProductsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <ShoppingCart className="w-8 h-8" />
                <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
              </div>
            ) : (
              topProductsList.map((tp, idx) => (
                <div key={tp.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-xl hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-text-main line-clamp-1">{tp.name}</div>
                      <div className="text-[10px] text-text-secondary">{tp.qty} {language === 'ar' ? 'وحدة مباعة' : 'Units Sold'}</div>
                    </div>
                  </div>
                  <div className="text-[12px] font-bold text-success">{formatNumber(tp.price * tp.qty)} {t.currency}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm relative overflow-hidden h-[350px] flex flex-col">
          <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-2 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            {language === 'ar' ? "توزيع قيمة المخزون" : "INVENTORY VALUE BY CATEGORY"}
          </h4>
          <div className="flex-1 w-full min-h-0 mt-2">
            {categoryValueData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <LayoutGrid className="w-8 h-8" />
                <p className="text-xs font-bold uppercase">{t.noData || "No Data"}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                <PieChart>
                  <Pie
                    data={categoryValueData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryValueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReChartsTooltip 
                    formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'القيمة' : 'Value']}
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border-subtle)', background: 'var(--color-card)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="lg:col-span-2 bg-card border border-border-subtle p-6 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[350px]">
          <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-6 flex items-center justify-between w-full">
            <span>{t.stockAlerts}</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const criticalItems = products.filter(p => p.qty <= (p.minStock ?? 5));
                  generateStockReportPDF({
                    items: criticalItems,
                    generatedAt: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                    language: language
                  });
                }}
                className="bg-bg-base hover:bg-white text-text-secondary hover:text-accent border border-border-subtle hover:border-accent p-1.5 rounded-lg transition-all"
                title={language === 'ar' ? "تصدير" : "Export"}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <span className="bg-danger/10 text-danger px-2 py-0.5 rounded text-[10px] font-black">
                {products.filter(p => p.qty <= (p.minStock ?? 5)).length}
              </span>
            </div>
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {products.filter(p => p.qty <= (p.minStock ?? 5)).sort((a, b) => a.qty - b.qty).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-xl hover:border-danger/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                    p.qty === 0 ? "bg-orange-500 text-white" : "bg-danger text-white"
                  )}>
                    {p.qty}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-text-main group-hover:text-danger transition-colors">{p.name}</div>
                    <div className="text-[10px] text-text-secondary flex items-center gap-2">
                       <span>Min: {p.minStock ?? 5}</span>
                       {p.supplier && <span className="font-bold text-accent">• {p.supplier}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    p.qty === 0 ? "text-orange-600" : "text-danger"
                  )}>
                    {p.qty === 0 ? t.outOfStock : t.lowStock}
                  </div>
                </div>
              </div>
            ))}
            {products.filter(p => p.qty <= (p.minStock ?? 5)).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 py-10">
                <ShieldCheck className="w-10 h-10 text-success" />
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t.noStockAlerts}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlights, danger, onClick }: { label: string, value: string | number, sub: string, highlights?: boolean, danger?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn(
      "p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group/card hover:-translate-y-1",
      highlights ? "bg-accent text-white border-accent shadow-[0_15px_30px_-10px_rgba(79,70,229,0.3)]" : "bg-card border-border-subtle hover:border-accent/30 hover:shadow-xl",
      onClick ? "cursor-pointer" : ""
    )}>
      {highlights && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full mix-blend-screen filter blur-2xl -mr-10 -mt-10"></div>}
      <div className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10", highlights ? "text-white/70" : "text-text-secondary")}>{label}</div>
      <div className="text-3xl font-black tracking-tighter mb-2 font-mono relative z-10">{value}</div>
      <div className={cn("text-[11px] font-bold relative z-10 tracking-wide", highlights ? "text-white/90" : danger ? "text-danger" : "text-text-secondary/80")}>{sub}</div>
    </div>
  );
}

