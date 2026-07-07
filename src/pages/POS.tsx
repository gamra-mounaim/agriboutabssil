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

export default function POS() {
  const { products, categories, customers, settings, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();

  const t = translations[language];
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'debt' | 'check'>('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkOwner, setCheckOwner] = useState('');
  const [checkBank, setCheckBank] = useState('');
  const [checkDueDate, setCheckDueDate] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerDetail, setNewCustomerDetail] = useState({ name: '', phone: '' });
  const [isFlahActive, setIsFlahActive] = useState(false);
  const [originalPrices, setOriginalPrices] = useState<{[id: string]: number}>({});

  const handleQuickAddCustomer = async () => {
    if (!newCustomerDetail.name.trim()) return;
    try {
      await api.addCustomer({ 
        name: newCustomerDetail.name.trim(), 
        phone: newCustomerDetail.phone, 
        debt: 0,
        due_date: null 
      });
      setIsAddingNewCustomer(false);
      setNewCustomerDetail({ name: '', phone: '' });
      setMessage({ text: language === 'ar' ? "تمت إضافة الزبون بنجاح." : "Customer added successfully.", type: 'success' });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشل إضافة الزبون." : "Failed to add customer.", type: 'error' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategoryId || p.categoryId === selectedCategoryId;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.barcode && p.barcode.includes(search));
    
    const minP = parseFloat(minPrice);
    const maxP = parseFloat(maxPrice);
    const minQ = parseInt(minQty);

    const matchesMinPrice = isNaN(minP) || p.price >= minP;
    const matchesMaxPrice = isNaN(maxP) || p.price <= maxP;
    const matchesMinQty = isNaN(minQ) || p.qty >= minQ;

    let matchesStockStatus = true;
    if (stockStatusFilter === 'inStock') matchesStockStatus = p.qty > 0;
    else if (stockStatusFilter === 'outOfStock') matchesStockStatus = p.qty === 0;
    else if (stockStatusFilter === 'lowStock') matchesStockStatus = p.qty > 0 && p.qty <= (p.minStock ?? 5);

    return matchesCategory && matchesSearch && matchesMinPrice && matchesMaxPrice && matchesMinQty && matchesStockStatus;
  });

  // Auto-add if exact barcode match is found in search (scanner behavior)
  useEffect(() => {
    if (search.length >= 4) {
      const match = products.find(p => p.barcode === search);
      if (match && match.qty > 0) {
        addToCart(match);
        setSearch(''); // Clear for next scan
      }
    }
  }, [search, products]);

  const addToCart = (p: Product) => {
    const existing = cart.find(item => item.productId === p.id);
    if (existing) {
      if (existing.qty + 1 > p.qty) {
        setMessage({ text: language === 'ar' ? "الكمية المطلوبة تتجاوز المخزون" : "Requested quantity exceeds stock", type: 'error' });
        return;
      }
      setCart(cart.map(item => item.productId === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      if (p.qty <= 0) {
        setMessage({ text: language === 'ar' ? "المنتج غير متوفر" : "Product out of stock", type: 'error' });
        return;
      }
      const priceToUse = isFlahActive ? p.price * 1.1 : p.price;
      setCart([...cart, { productId: p.id, name: p.name, price: priceToUse, qty: 1 }]);
      setOriginalPrices(prev => ({ ...prev, [p.id]: p.price }));
    }
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const p = products.find(prod => prod.id === productId);
    if (p && newQty > p.qty) {
      setMessage({ text: language === 'ar' ? "الكمية المطلوبة تتجاوز المخزون" : "Requested quantity exceeds stock", type: 'error' });
      return;
    }
    setCart(cart.map(item => item.productId === productId ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const cashReceived = parseFloat(receivedAmount) || 0;
  const change = Math.max(0, cashReceived - total);

  const checkout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const saleResult = await api.createSale({
        total,
        subtotal,
        discount: discountVal,
        paymentMethod,
        customerId: selectedCustomerId || null,
        customerName: selectedCustomerId ? null : customerName,
        staffId: user?.id || user?.uid || 'anonymous',
        items: cart,
        checkNumber: paymentMethod === 'check' ? checkNumber : null,
        checkOwner: paymentMethod === 'check' ? (checkBank && checkBank !== 'بنك آخر...' ? `${checkBank} | ${checkOwner}` : checkOwner) : null,
        checkDueDate: paymentMethod === 'check' ? checkDueDate : null,
        checkAmount: paymentMethod === 'check' && checkAmount ? parseFloat(checkAmount) : null
      });

      if (saleResult.status === 'success') {
        const lastSaleData = {
          subtotal: subtotal,
          discount: discountVal,
          saleId: saleResult.id,
          invoiceNumber: saleResult.invoiceNumber,
          date: new Date().toISOString(),
          items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
          total: total,
          clientName: selectedCustomerId 
            ? customers.find(c => c.id === selectedCustomerId)?.name 
            : (customerName || t.walkingCustomer),
          staffName: user?.email || user?.username || '',
          paymentMethod: paymentMethod.toUpperCase(),
          checkNumber: paymentMethod === 'check' ? checkNumber : undefined,
          checkOwner: paymentMethod === 'check' ? (checkBank && checkBank !== 'بنك آخر...' ? `${checkBank} | ${checkOwner}` : checkOwner) : undefined,
          checkAmount: paymentMethod === 'check' && checkAmount ? parseFloat(checkAmount) : undefined
        };

        setCart([]);
        setSelectedCustomerId('');
        setCustomerName('');
        setDiscount('0');
        setReceivedAmount('');
        setCheckNumber('');
        setCheckOwner('');
        setCheckBank('');
        setCheckAmount('');
        setIsFlahActive(false);
        setOriginalPrices({});
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        generateInvoicePDF(lastSaleData, language, settings);
        onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: language === 'ar' ? 'فشلت العملية' : 'Checkout Failed', type: 'error' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col xl:flex-row gap-6 overflow-hidden -mt-2 relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-accent text-white px-10 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border-4 border-white/20 backdrop-blur-md">
               <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                 <ShieldCheck className="w-10 h-10" />
               </div>
               <div className="text-center">
                 <h2 className="text-2xl font-black uppercase tracking-widest leading-none mb-1">{t.saleSuccess}</h2>
                 <p className="text-[10px] font-bold opacity-80 uppercase tracking-[0.2em]">{language === 'ar' ? "تم تحديث المخزون والسجلات" : "INVENTORY & RECORDS UPDATED"}</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Left Column: Categories Vertical Sidebar (Desktop) --- */}
      <div className="hidden xl:flex w-64 flex-col bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border-subtle bg-bg-base/30">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{t.categories}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
          <button 
            onClick={() => setSelectedCategoryId('')}
            className={cn(
              "w-full px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between group",
              selectedCategoryId === '' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-secondary hover:bg-bg-base hover:text-accent"
            )}
          >
            {t.allCategories}
            <ChevronRight className={cn("w-3 h-3 transition-transform", selectedCategoryId === '' ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
          </button>
          {(categories || []).map(c => (
            <button 
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between group",
                selectedCategoryId === c.id ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-secondary hover:bg-bg-base hover:text-accent"
              )}
            >
              <span className="truncate">{c.name}</span>
              <ChevronRight className={cn("w-3 h-3 transition-transform", selectedCategoryId === c.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
            </button>
          ))}
        </div>
      </div>

      {/* --- Middle: Product Catalog --- */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden h-full">
        {/* Search and Filters Strip */}
        <div className="bg-card border border-border-subtle rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 transition-colors group-focus-within:text-accent", 
                language === 'ar' ? "right-4" : "left-4"
              )} />
              <input 
                placeholder={t.searchProducts} 
                className={cn(
                  "w-full bg-bg-base border border-border-subtle rounded-xl py-3 focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none transition-all text-sm font-medium",
                  language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
                )}
                value={search || ''} onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {/* Mobile Categories (Horizontal) */}
            <div className="flex xl:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setSelectedCategoryId('')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  selectedCategoryId === '' ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-bg-base text-text-secondary border-border-subtle hover:border-accent/40"
                )}
              >
                {t.allCategories}
              </button>
              {(categories || []).map(c => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                    selectedCategoryId === c.id ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-bg-base text-text-secondary border-border-subtle hover:border-accent/40"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center border-t border-border-subtle pt-4">
             <div className="flex items-center gap-3 bg-bg-base px-3 py-1.5 rounded-lg border border-border-subtle">
               <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">{t.price}:</span>
               <input 
                 type="number" placeholder="min"
                 className="w-16 bg-transparent text-xs font-bold outline-none border-b border-transparent focus:border-accent text-center"
                 value={minPrice || ''} onChange={e => setMinPrice(e.target.value)}
               />
               <span className="text-text-secondary text-[10px]">-</span>
               <input 
                 type="number" placeholder="max"
                 className="w-16 bg-transparent text-xs font-bold outline-none border-b border-transparent focus:border-accent text-center"
                 value={maxPrice || ''} onChange={e => setMaxPrice(e.target.value)}
               />
             </div>

             <div className="flex items-center gap-2 bg-bg-base px-3 py-1.5 rounded-lg border border-border-subtle">
               <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">{t.stockStatus}:</span>
               <select 
                 className="bg-transparent text-xs font-bold outline-none border-b border-transparent focus:border-accent text-center cursor-pointer"
                 value={stockStatusFilter || ''} onChange={e => setStockStatusFilter(e.target.value as any)}
               >
                 <option value="all">{language === 'ar' ? "الكل" : "All"}</option>
                 <option value="inStock">{t.inStock}</option>
                 <option value="lowStock">{t.lowStock}</option>
                 <option value="outOfStock">{t.outOfStock}</option>
               </select>
             </div>

             <button 
                onClick={() => { setMinPrice(''); setMaxPrice(''); setMinQty(''); setSearch(''); setSelectedCategoryId(''); setStockStatusFilter('all'); }}
                className="ml-auto text-[9px] font-black text-text-secondary hover:text-accent uppercase tracking-widest transition-colors flex items-center gap-1.5"
             >
                <X className="w-3 h-3" />
                {language === 'ar' ? "إعادة" : "Reset"}
             </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredProducts.map(p => (
              <motion.button 
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={p.qty <= 0}
                onClick={() => addToCart(p)}
                className={cn(
                  "group relative flex flex-col justify-between p-4 rounded-2xl border bg-card text-left transition-all hover:shadow-xl hover:-translate-y-1 hover:border-accent active:shadow-none",
                  p.qty <= 0 ? "bg-red-50/20 dark:bg-red-950/10 border-danger/30 opacity-75 cursor-not-allowed" : "border-border-subtle",
                  p.qty <= (p.minStock ?? 5) && p.qty > 0 && "border-orange-200/50 bg-orange-50/5",
                  language === 'ar' && "text-right"
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">
                        {categories.find(c => c.id === p.categoryId)?.name || t.noCategory}
                      </span>
                      <h4 className="font-bold text-[13px] text-text-main group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                    </div>
                    {p.qty <= 0 ? (
                      <span className="text-[9px] font-black bg-danger/15 text-danger px-2 py-0.5 rounded-md animate-pulse">
                        {language === 'ar' ? 'نفذت الكمية' : 'RUPTURE'}
                      </span>
                    ) : p.qty <= (p.minStock ?? 5) && p.qty > 0 && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-text-main tracking-tight">{formatNumber(p.price)}</span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                  </div>
                  
                  <div className={cn(
                    "flex items-center justify-between pt-3 border-t",
                    p.qty <= (p.minStock ?? 5) ? "border-orange-100" : "border-border-subtle/40"
                  )}>
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                      p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-secondary"
                    )}>
                      <Archive className="w-3 h-3" />
                      {p.qty}
                    </div>
                    {p.barcode && (
                      <div className="text-[9px] font-mono text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.barcode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Add Glow */}
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
              </motion.button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-text-secondary opacity-40 grayscale">
                <Search className="w-12 h-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">{language === 'ar' ? "لا توجد نتائج" : language === 'fr' ? "Aucun résultat" : "No matches found"}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Right: Checkout / Receipt Panel --- */}
      <div className="w-full lg:w-[420px] h-full flex flex-col bg-card border border-border-subtle rounded-3xl shadow-2xl relative z-10">
        <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-bg-base/20 rounded-t-3xl backdrop-blur-sm">
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{language === 'ar' ? "فاتورة" : language === 'fr' ? "TICKET" : "Receipt"}</span>
             <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">{language === 'ar' ? "سلة التسوق" : language === 'fr' ? "PANIER ACTUEL" : "Current Cart"}</h3>
           </div>
           <div className="flex items-center gap-3">
             <button 
                onClick={() => {
                  const newActive = !isFlahActive;
                  setIsFlahActive(newActive);
                  if (newActive) {
                    setCart(cart.map(item => ({ ...item, price: item.price * 1.1 })));
                  } else {
                    setCart(cart.map(item => ({ ...item, price: originalPrices[item.productId] || item.price })));
                  }
                }}
                className={cn(
                  "p-2 border rounded-lg transition-all flex items-center gap-2",
                  isFlahActive ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle"
                )}
             >
               <Sparkles className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">{isFlahActive ? (language === 'ar' ? 'فلاح نشط' : 'FLAH ON') : 'FLAH 10%'}</span>
             </button>
             <div className="bg-accent/10 text-accent p-2 rounded-xl">
               <ShoppingCart className="w-5 h-5" />
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <AnimatePresence initial={false}>
            {cart.map(item => (
              <motion.div 
                key={item.productId}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="group flex flex-col p-4 rounded-2xl bg-bg-base/30 hover:bg-bg-base/60 transition-colors border border-border-subtle/30"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                    <span className="font-bold text-[13px] text-text-main group-hover:text-accent transition-colors leading-tight">{item.name}</span>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mt-0.5 tracking-wider">
                      {formatNumber(item.price)} {t.currency} / {(item as any).unitLabel || (language === 'ar' ? 'وحدة' : language === 'fr' ? 'unité' : 'unit')}
                    </span>
                  </div>
                  <div className="font-black text-[14px] text-text-main tracking-tight">
                    {formatNumber((item.price * item.qty))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-white border border-border-subtle rounded-xl p-0.5 shadow-sm">
                    <button 
                      onClick={() => updateCartQty(item.productId, item.qty - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-base text-text-secondary transition-colors"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      min="1"
                      value={item.qty}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          updateCartQty(item.productId, val);
                        }
                      }}
                      className="w-10 text-center text-xs font-black text-text-main bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button 
                      onClick={() => updateCartQty(item.productId, item.qty + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-base text-text-secondary transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-text-secondary opacity-30 px-10 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-border-subtle mb-6 flex items-center justify-center rotate-12">
                <Package className="w-8 h-8 -rotate-12" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                {language === 'ar' ? "أضف منتجات للبدء بالعملية" : language === 'fr' ? "PRÊT POUR LA PROCHAINE TRANSACTION" : "Ready for next transaction"}
              </p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-border-subtle bg-bg-base/30 space-y-5 rounded-b-3xl">
          {/* Payment Method Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-2xl border border-border-subtle shadow-inner">
            {(['cash', 'card', 'debt', 'check'] as const).map(method => (
               <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  paymentMethod === method ? "bg-accent text-white shadow-md shadow-accent/20" : "text-text-secondary hover:bg-bg-base"
                )}
              >
                {t[method]}
              </button>
            ))}
          </div>

          <div className="space-y-4">
             {/* Customer Selection (Always Visible) */}
             <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="flex items-center justify-between px-1">
                 <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "ملف الزبون" : language === 'fr' ? "LIEN CLIENT" : "Customer Link"}</label>
                 <button 
                   onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                   className="text-[9px] font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-1"
                 >
                   {isAddingNewCustomer ? (language === 'ar' ? "إلغاء" : language === 'fr' ? "ANNULER" : "CANCEL") : (
                     <>
                       <UserPlus className="w-2.5 h-2.5" />
                       {t.quickAdd}
                     </>
                   )}
                 </button>
               </div>
               
               {isAddingNewCustomer ? (
                 <div className="space-y-3 p-4 bg-bg-base/50 rounded-2xl border border-dashed border-accent/30 animate-in zoom-in-95 duration-200">
                    <div className="space-y-1">
                      <input 
                        placeholder={t.customerName}
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-accent"
                        value={newCustomerDetail.name}
                        onChange={e => setNewCustomerDetail({...newCustomerDetail, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <input 
                        placeholder={language === 'ar' ? "رقم الهاتف" : language === 'fr' ? "Téléphone" : "Phone"}
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-accent"
                        value={newCustomerDetail.phone}
                        onChange={e => setNewCustomerDetail({...newCustomerDetail, phone: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleQuickAddCustomer}
                      disabled={!newCustomerDetail.name.trim()}
                      className="w-full bg-accent text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      {t.save}
                    </button>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <div className="relative group">
                      <Users className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary transition-colors group-focus-within:text-accent",
                        language === 'ar' ? "right-3.5" : "left-3.5"
                      )} />
                      <select 
                        className={cn(
                          "w-full bg-white border border-border-subtle rounded-2xl py-3 px-10 text-xs font-bold text-text-main focus:border-accent focus:ring-4 focus:ring-accent/5 outline-none transition-all shadow-sm appearance-none",
                          language === 'ar' && "text-right"
                        )}
                        value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setCustomerName(''); }}
                      >
                        <option value="">{language === 'ar' ? "إختر زبون..." : language === 'fr' ? "Lier à un compte..." : "Link to Account..."}</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.debt > 0 ? `(${language === 'ar' ? 'دين' : language === 'fr' ? 'Dette' : 'Debt'}: ${formatNumber(c.debt)})` : ''}</option>)}
                      </select>
                      <ChevronDown className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none opacity-50",
                        language === 'ar' ? "left-3.5" : "right-3.5"
                      )} />
                   </div>
                   
                   {!selectedCustomerId && (
                      <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                        <User className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary opacity-50 transition-colors group-focus-within:text-accent", language === 'ar' ? "right-3.5" : "left-3.5")} />
                        <input 
                          placeholder={t.walkingCustomer}
                          className={cn("w-full bg-white border border-border-subtle rounded-xl py-3 px-10 text-xs font-bold text-text-main focus:border-accent outline-none shadow-sm", language === 'ar' && "text-right")}
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                        />
                      </div>
                   )}
                 </div>
               )}
             </div>

             {paymentMethod === 'cash' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{t.received}</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                      value={receivedAmount || ''} onChange={e => setReceivedAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{t.change}</label>
                    <div className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-accent shadow-inner text-center">
                      {formatNumber(change)}
                    </div>
                  </div>
                </div>
             )}

             {paymentMethod === 'check' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{language === 'ar' ? 'البنك' : 'Bank'}</label>
                    <select 
                      className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                      value={checkBank || ''} onChange={e => setCheckBank(e.target.value)}
                    >
                      <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                      {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{t.checkNumber}</label>
                      <input 
                        placeholder="XXXX-XXXX"
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                        value={checkNumber || ''} onChange={e => setCheckNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{t.checkOwner}</label>
                      <input 
                        placeholder={t.customerName}
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                        value={checkOwner || ''} onChange={e => setCheckOwner(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{language === 'ar' ? 'المبلغ بالدرهم' : 'Montant du Chèque'}</label>
                      <input 
                        type="number"
                        placeholder={total.toString()}
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                        value={checkAmount || ''} onChange={e => setCheckAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{language === 'ar' ? 'تاريخ الدفع' : 'Due Date'}</label>
                      <input 
                        type="date"
                        className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-black text-text-main focus:border-accent outline-none shadow-sm"
                        value={checkDueDate || ''} onChange={e => setCheckDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
             )}
          </div>

          {/* Pricing Summary */}
          <div className="space-y-3 pt-2 border-t border-border-subtle/50">
            <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">{t.subtotal}</span>
               <span className="text-xs font-bold text-text-main">{formatNumber(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">{t.discount}</span>
               <input 
                  type="number" 
                  className="w-20 bg-transparent text-right text-xs font-black text-danger outline-none border-b border-transparent focus:border-danger"
                  value={discount || ''} onChange={e => setDiscount(e.target.value)}
                />
            </div>

            <div className="flex flex-wrap items-baseline justify-between py-2 border-t border-border-subtle/30 mt-2 gap-2">
              <span className="text-3xl md:text-4xl font-black text-text-main tracking-tighter break-all">{formatNumber(total)}</span>
              <span className="text-sm font-bold text-text-secondary uppercase">{t.currency}</span>
            </div>

            <div className="flex gap-3">
               <button 
                onClick={() => { setCart([]); setDiscount('0'); setReceivedAmount(''); setSelectedCustomerId(''); }}
                className="bg-white border border-border-subtle text-text-secondary font-black text-[10px] uppercase tracking-widest p-4 rounded-2xl hover:bg-danger hover:text-white hover:border-danger transition-all"
              >
                {t.clear || 'Clear'}
              </button>
              <button 
                disabled={cart.length === 0 || (paymentMethod === 'debt' && !selectedCustomerId) || isCheckingOut}
                onClick={checkout}
                className="flex-1 bg-accent text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-30 disabled:grayscale disabled:translate-y-0 disabled:shadow-none"
              >
                {t.checkout}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

