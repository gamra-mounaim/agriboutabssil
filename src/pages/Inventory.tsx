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

export default function Inventory({ permissions }: { permissions: any }) {
  const { products, categories, suppliers, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();

  const t = translations[language];
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [qty, setQty] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<'in' | 'out'>('in');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSupplierId, setAdjSupplierId] = useState('');
  const [adjCostPrice, setAdjCostPrice] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    costPrice: '',
    qty: '',
    minStock: '',
    barcode: '',
    categoryId: '',
    supplier: ''
  });

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setMessage({ text: language === 'ar' ? "تمت إضافة الفئة." : "Category added.", type: 'success' });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشل إضافة الفئة." : "Failed to add category.", type: 'error' });
    }
  };

  const addQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;
    try {
      await api.addSupplier({ name: quickSupplierName.trim(), debt: 0 });
      setSupplier(quickSupplierName.trim());
      setQuickSupplierName('');
      setShowQuickSupplierModal(false);
      setMessage({ text: language === 'ar' ? "تمت إضافة المورد بنجاح." : "Supplier added successfully.", type: 'success' });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to add supplier.", type: 'error' });
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      { en: "Peinture", ar: "الصباغة" },
      { en: "Visserie", ar: "الفيس و البراغي" },
      { en: "Outillage", ar: "الأدوات" },
      { en: "Électricité", ar: "الكهرباء" },
      { en: "Plomberie", ar: "الترصيص / الما" },
      { en: "Matériaux", ar: "مواد البناء" },
      { en: "Quincaillerie", ar: "خردوات متنوعة" }
    ];

    try {
      for (const cat of defaults) {
        const name = language === 'ar' ? `${cat.ar} (${cat.en})` : `${cat.en} (${cat.ar})`;
        if (!categories.find(c => c.name.includes(cat.en) || c.name.includes(cat.ar))) {
          await api.addCategory(name);
        }
      }
      onRefresh();
      setMessage({ text: language === 'ar' ? "تم تحديث الفئات الافتراضية." : "Default categories seeded.", type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error seeding categories.", type: 'error' });
    }
  };

  const deleteCategory = async (id: string) => {
    if(!window.confirm(language === 'ar' ? "هل أنت متأكد من حذف هذه الفئة؟" : "Delete this category?")) return;
    try {
      await api.deleteCategory(id);
      onRefresh();
      setMessage({ text: language === 'ar' ? "تم حذف الفئة." : "Category deleted.", type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشل الحذف." : "Delete failed.", type: 'error' });
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !qty) return;
    try {
      await api.addProduct({
        name,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice) || 0,
        qty: parseFloat(qty),
        minStock: parseFloat(minStock) || 0,
        barcode: barcode || null,
        categoryId: categoryId || null,
        supplier: supplier || null,
        supplierId: suppliers.find(s => s.name === supplier)?.id || null
      });
      setName(''); setPrice(''); setCostPrice(''); setQty(''); setBarcode(''); setMinStock('5'); setCategoryId(''); setSupplier('');
      setMessage({ text: language === 'ar' ? "تمت إضافة المنتج." : "Product added to inventory.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `${language === 'ar' ? 'فشل' : 'Failed'}: ${err.message}`, type: 'error' });
    }
  };

  const updateStock = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    try {
      await api.updateProduct(id, { ...p, qty: newQty });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "تم رفض التعديل." : "Adjustment rejected.", type: 'error' });
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.updateProduct(editingProduct.id, {
        ...editingProduct,
        name: editForm.name,
        price: parseFloat(editForm.price),
        costPrice: parseFloat(editForm.costPrice) || 0,
        qty: parseFloat(editForm.qty),
        minStock: parseFloat(editForm.minStock) || 0,
        barcode: editForm.barcode || null,
        categoryId: editForm.categoryId || null,
        supplier: editForm.supplier || null,
        supplierId: suppliers.find(s => s.name === editForm.supplier)?.id || null
      });
      setEditingProduct(null);
      setMessage({ text: language === 'ar' ? "تم تحديث المنتج." : "Product updated.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: `${language === 'ar' ? 'فشل' : 'Failed'}: ${err.message}`, type: 'error' });
    }
  };

  const startEditing = (p: Product) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name,
      price: p.price.toString(),
      costPrice: (p.costPrice || 0).toString(),
      qty: p.qty.toString(),
      minStock: (p.minStock ?? 5).toString(),
      barcode: p.barcode || '',
      categoryId: p.categoryId || '',
      supplier: p.supplier || ''
    });
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct || !adjQty) return;
    try {
      // Get current user from local storage
      const stored = localStorage.getItem('pos_user');
      const actor = stored ? JSON.parse(stored).username : 'system';

      await api.adjustStock(adjProduct.id, {
        type: adjType,
        quantity: parseFloat(adjQty),
        reason: adjReason,
        actor: actor,
        supplierId: adjSupplierId || null,
        costPrice: adjCostPrice ? parseFloat(adjCostPrice) : undefined
      });
      setShowAdjModal(false);
      setAdjQty('');
      setAdjReason('');
      setAdjSupplierId('');
      setMessage({ text: language === 'ar' ? "تم تعديل المخزون." : "Stock adjusted successfully.", type: 'success' });
      onRefresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: "Adjustment failed.", type: 'error' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !filterCategoryId || (filterCategoryId === 'none' ? !p.categoryId : p.categoryId === filterCategoryId);
    
    let matchesStockStatus = true;
    if (filterStockStatus === 'inStock') matchesStockStatus = p.qty > 0;
    else if (filterStockStatus === 'outOfStock') matchesStockStatus = p.qty === 0;
    else if (filterStockStatus === 'lowStock') matchesStockStatus = p.qty > 0 && p.qty <= (p.minStock ?? 5);

    return matchesCategory && matchesStockStatus;
  });

  const [showGrouped, setShowGrouped] = useState(false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Product Form */}
        <section className="lg:col-span-2 bg-card border border-border-subtle p-8 rounded-xl shadow-sm h-full">
          <h3 className="section-title text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-text-secondary">
            <Plus className="w-4 h-4 text-accent" />
            {t.addProduct}
          </h3>
          <form onSubmit={addProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.productName}</label>
              <input 
                placeholder={t.productName} 
                className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                value={name || ''} onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.category}</label>
              <select 
                className={cn("w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none", language === 'ar' && "text-right")}
                value={categoryId || ''} onChange={e => setCategoryId(e.target.value)}
              >
                <option value="">{t.noCategory}</option>
                {(categories || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.barcode}</label>
                <input 
                  placeholder={t.barcode} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                  value={barcode || ''} onChange={e => setBarcode(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 overflow-visible">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1 flex justify-between items-center">
                  <span>{t.supplier}</span>
                  <button 
                    type="button"
                    onClick={() => setShowQuickSupplierModal(true)}
                    className="text-accent hover:underline text-[9px] font-black"
                  >
                    + {language === 'ar' ? "مورد جديد" : "NEW"}
                  </button>
                </label>
                <select 
                  className={cn("w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none", language === 'ar' && "text-right")}
                  value={supplier || ''} 
                  onChange={e => setSupplier(e.target.value)}
                >
                  <option value="">{language === 'ar' ? "اختر مورد" : "Select Supplier"}</option>
                  {(suppliers || []).map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={cn("grid gap-4", permissions.viewCostPrice ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}>
              {permissions.viewCostPrice && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.costPrice}</label>
                  <input 
                    type="number" step="0.01" placeholder={t.costPrice} 
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                    value={costPrice || ''} onChange={e => setCostPrice(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.price}</label>
                <input 
                  type="number" step="0.01" placeholder={t.price} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                  value={price || ''} onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.qty}</label>
                <input 
                  type="number" placeholder={t.qty} 
                  disabled={!permissions.editStock}
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none disabled:opacity-50" 
                  value={qty || ''} onChange={e => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{language === 'ar' ? "تنبيه" : "Alert"}</label>
                <input 
                  type="number" placeholder={language === 'ar' ? "تنبيه" : "Alert"} 
                  className="w-full bg-bg-base border border-border-subtle rounded-lg px-2.5 py-2.5 text-sm focus:border-accent outline-none" 
                  value={minStock || ''} onChange={e => setMinStock(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="md:col-span-2 bg-accent text-white font-bold rounded-lg py-3 hover:opacity-90 transition-opacity text-sm uppercase tracking-widest shadow-md">
              {t.save}
            </button>
          </form>
        </section>

        {/* Add Category Section */}
        <section className="bg-card border border-border-subtle p-8 rounded-xl shadow-sm h-full">
          <h3 className="section-title text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-text-secondary">
            <Package className="w-4 h-4 text-accent" />
            {t.addCategory}
          </h3>
          <form onSubmit={addCategory} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.categoryName}</label>
              <input 
                placeholder={t.categoryName} 
                className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" 
                value={newCategoryName || ''} onChange={e => setNewCategoryName(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-white border border-border-subtle text-text-main font-bold rounded-lg py-3 hover:bg-bg-base transition-colors text-sm uppercase tracking-widest">
              {t.save}
            </button>
          </form>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">{t.categories}</h4>
              <button 
                onClick={seedDefaults}
                className="text-[9px] font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-1"
              >
                <Plus className="w-2.5 h-2.5" />
                {language === 'ar' ? "إعداد افتراضي" : "SETUP DEFAULTS"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(categories || []).map(c => (
                <div key={c.id} className="group/cat flex items-center gap-2 bg-bg-base border border-border-subtle px-3 py-1.5 rounded-xl text-[11px] font-bold text-text-main hover:border-accent/40 transition-colors">
                  <span>{c.name}</span>
                  <button 
                    onClick={() => deleteCategory(c.id)}
                    className="text-text-secondary hover:text-danger opacity-0 group-hover/cat:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && <div className="text-[11px] text-text-secondary italic">{language === 'ar' ? "لا توجد فئات حالياً" : "No categories yet"}</div>}
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h3 className="text-xl font-bold tracking-tight text-text-main">{t.inventory}</h3>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowGrouped(!showGrouped)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                  showGrouped ? "bg-accent text-white border-accent" : "bg-card text-text-secondary border-border-subtle hover:bg-bg-base"
                )}
             >
                <LayoutGrid className="w-3.5 h-3.5" />
                {language === 'ar' ? "عرض حسب الفئة" : "Show Stock"}
             </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t.filters}:</span>
                <select 
                   className={cn("bg-card border border-border-subtle rounded-lg px-4 py-2 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
                   value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}
                 >
                   <option value="">{t.allCategories}</option>
                   <option value="none">{t.noCategory}</option>
                   {(categories || []).map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                 </select>

                 <select 
                  className={cn("bg-card border border-border-subtle rounded-lg px-4 py-2 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
                  value={filterStockStatus} onChange={e => setFilterStockStatus(e.target.value as any)}
                >
                  <option value="all">{language === 'ar' ? "كل الحالات" : "All Status"}</option>
                  <option value="inStock">{t.inStock}</option>
                  <option value="lowStock">{t.lowStock}</option>
                  <option value="outOfStock">{t.outOfStock}</option>
                </select>
              </div>
          </div>
        </div>

        {showGrouped ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(categories || []).map(c => {
               const catProducts = filteredProducts.filter(p => p.categoryId === c.id);
               if (catProducts.length === 0) return null;
               
               return (
                 <div key={c.id} className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm hover:border-accent/30 transition-colors">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-accent mb-4 border-b border-border-subtle pb-3">
                      <FolderOpen className="w-4 h-4" />
                      {c.name}
                      <span className="ml-auto bg-accent/10 text-accent px-2 py-0.5 rounded-md text-[10px]">{catProducts.length}</span>
                    </h4>
                      <div className="space-y-3">
                        {catProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center group">
                            <div className={cn(language === 'ar' && "text-right")}>
                              <div className="text-[13px] font-semibold text-text-main group-hover:text-accent transition-colors">{p.name}</div>
                              <div className="text-[10px] text-text-secondary font-mono">
                                #{p.id.slice(0, 6).toUpperCase()}
                                {p.supplier && <span className="ml-2 font-bold opacity-60 text-accent">/ {p.supplier}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="text-right">
                                 <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                                 <div className={cn(
                                   "text-[10px] font-black uppercase",
                                   p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-secondary"
                                 )}>
                                   {language === 'ar' ? "الكمية" : "Qty"}: {p.qty}
                                 </div>
                               </div>
                               {permissions.editStock && (
                                 <button 
                                   onClick={() => startEditing(p)}
                                   className="p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                 >
                                   <Edit2 className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>
                          </div>
                        ))}
                      </div>
                 </div>
               );
            })}
            {/* Uncategorized */}
            {(() => {
                const uncategorizedProducts = filteredProducts.filter(p => !p.categoryId);
                if (uncategorizedProducts.length === 0) return null;

                return (
                  <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-text-secondary mb-4 border-b border-border-subtle pb-3">
                        <Archive className="w-4 h-4" />
                        {t.noCategory}
                        <span className="ml-auto bg-bg-base text-text-secondary px-2 py-0.5 rounded-md text-[10px]">{uncategorizedProducts.length}</span>
                      </h4>
                      <div className="space-y-3">
                        {uncategorizedProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center group">
                            <div className={cn(language === 'ar' && "text-right")}>
                              <div className="text-[13px] font-semibold text-text-main group-hover:text-accent transition-colors">{p.name}</div>
                              <div className="text-[10px] text-text-secondary font-mono">
                                #{p.id.slice(0, 6).toUpperCase()}
                                {p.supplier && <span className="ml-2 font-bold opacity-60 text-accent">/ {p.supplier}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                                <div className={cn(
                                  "text-[10px] font-black uppercase",
                                  p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-secondary"
                                )}>
                                  {language === 'ar' ? "الكمية" : "Qty"}: {p.qty}
                                </div>
                              </div>
                              {permissions.editStock && (
                                <button 
                                  onClick={() => startEditing(p)}
                                  className="p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                );
            })()}
          </div>
        ) : (
          <div className="section-container bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fafafa] border-b border-border-subtle">
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                   {permissions.viewCostPrice && <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.costPrice}</th>}
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.price}</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.inventory}</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.supplier}</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const category = categories.find(c => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className={cn(
                      "border-b border-border-subtle last:border-0 transition-colors group text-[13px]",
                      p.qty === 0 ? "bg-red-50/30 hover:bg-red-50/50" : 
                      p.qty <= (p.minStock ?? 5) ? "bg-orange-50/30 hover:bg-orange-50/50" : 
                      "hover:bg-bg-base/30"
                    )}>
                      <td className="p-4">
                        <div className="font-semibold text-text-main">{p.name}</div>
                        <div className="text-[10px] text-text-secondary font-mono flex items-center gap-2">
                          <span>#{p.id.slice(0, 8).toUpperCase()}</span>
                          {category && (
                            <span className="opacity-50 text-accent font-bold">• {category.name}</span>
                          )}
                        </div>
                      </td>
                      {permissions.viewCostPrice && <td className="p-4 text-text-secondary italic">{formatNumber(p.costPrice || 0)} {t.currency}</td>}
                      <td className="p-4 text-text-main font-bold">{formatNumber(p.price)} {t.currency}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {permissions.editStock ? (
                            <>
                              <button onClick={() => updateStock(p.id, p.qty - 1)} className="w-6 h-6 border border-border-subtle rounded-md flex items-center justify-center hover:bg-bg-base hover:border-text-secondary transition-colors text-text-secondary">-</button>
                              <span className={cn("font-bold w-10 text-center text-sm", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-main")}>{p.qty}</span>
                              <button onClick={() => updateStock(p.id, p.qty + 1)} className="w-6 h-6 border border-border-subtle rounded-md flex items-center justify-center hover:bg-bg-base hover:border-text-secondary transition-colors text-text-secondary">+</button>
                              <button 
                                onClick={() => {
                                  setAdjProduct(p);
                                  setAdjCostPrice(p.costPrice?.toString() || '0');
                                  setAdjSupplierId(p.supplierId || '');
                                  setShowAdjModal(true);
                                }}
                                className="ml-2 w-6 h-6 border border-accent/20 rounded-md flex items-center justify-center hover:bg-accent/10 text-accent transition-colors"
                                title={t.stockAdjustment}
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className={cn("font-bold text-sm", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-main")}>{p.qty}</span>
                          )}
                          {p.qty <= (p.minStock ?? 5) && (
                            <span className={cn(
                              "badge text-[9px] ml-2 font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                              p.qty === 0 ? "bg-red-100 text-danger" : "bg-orange-100 text-orange-600"
                            )}>
                              {p.qty === 0 ? (language === 'ar' ? 'نفذت' : 'Out') : (language === 'ar' ? 'منخفض' : 'Low')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[11px] font-medium text-text-secondary">{p.supplier || '-'}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => startEditing(p)}
                            className="text-accent hover:bg-accent/10 p-2 rounded-lg transition-colors"
                            title={language === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={async () => {
                            if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف المنتج؟' : 'Remove product from inventory?')) {
                              try {
                                await api.deleteProduct(p.id);
                                setMessage({ text: language === 'ar' ? "تم الحذف." : "Product removed.", type: 'success' });
                                onRefresh();
                              } catch (err) {
                                setMessage({ text: language === 'ar' ? "فشل الحذف." : "Delete failed.", type: 'error' });
                                console.error(err);
                              }
                            }
                          }} className="text-text-secondary hover:text-danger p-2 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdjModal && adjProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border-subtle rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-main">{t.stockAdjustment}: {adjProduct.name}</h3>
              <button onClick={() => setShowAdjModal(false)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="space-y-6">
              <div className="grid grid-cols-2 gap-2 bg-bg-base p-1 rounded-xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setAdjType('in')}
                  className={cn(
                    "py-2 px-4 rounded-lg font-bold transition-all text-xs uppercase tracking-widest",
                    adjType === 'in' ? "bg-accent text-white shadow-lg" : "text-text-secondary hover:bg-white"
                  )}
                >
                  {t.stockIn}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType('out')}
                  className={cn(
                    "py-2 px-4 rounded-lg font-bold transition-all text-xs uppercase tracking-widest",
                    adjType === 'out' ? "bg-danger text-white shadow-lg" : "text-text-secondary hover:bg-white"
                  )}
                >
                  {t.stockOut}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.qty}</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main focus:border-accent outline-none font-mono" 
                  value={adjQty} 
                  onChange={(e) => setAdjQty(e.target.value)} 
                />
              </div>

              {adjType === 'in' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.supplier}</label>
                    <select 
                      className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main focus:border-accent outline-none"
                      value={adjSupplierId}
                      onChange={(e) => setAdjSupplierId(e.target.value)}
                    >
                      <option value="">{language === 'ar' ? "اختر مورد (اختياري)" : "Select Supplier (Optional)"}</option>
                      {(suppliers || []).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  {adjSupplierId && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">
                        {language === 'ar' ? "تكلفة الوحدة (لإضافتها لدين المورد)" : "Unit Cost (Added to Supplier Debt)"}
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main focus:border-accent outline-none font-mono" 
                        value={adjCostPrice} 
                        onChange={(e) => setAdjCostPrice(e.target.value)} 
                      />
                      <p className="text-[10px] text-accent font-bold px-1 italic">
                        {language === 'ar' ? "* ستتم إضافة إجمالي التكلفة إلى دين المورّد" : "* Total cost will be added to supplier debt"}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.reason}</label>
                <input 
                  type="text" 
                  placeholder="e.g. New shipment, Damage..." 
                  className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main focus:border-accent outline-none" 
                  value={adjReason} 
                  onChange={(e) => setAdjReason(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className={cn(
                  "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all text-white uppercase tracking-widest text-sm",
                  adjType === 'in' ? "bg-accent hover:opacity-90" : "bg-danger hover:opacity-90"
                )}
              >
                <Save className="w-4 h-4" /> 
                {t.confirm}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border-subtle rounded-2xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-main">{language === 'ar' ? "تعديل المنتج" : "Edit Product"}</h3>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.productName}</label>
                  <input required className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.price}</label>
                  <input required type="number" step="0.01" className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                </div>
                {permissions.viewCostPrice && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.costPrice}</label>
                    <input type="number" step="0.01" className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.costPrice || ''} onChange={e => setEditForm({...editForm, costPrice: e.target.value})} />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.inventory}</label>
                  <input required type="number" disabled={!permissions.editStock} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main disabled:opacity-50" value={editForm.qty || ''} onChange={e => setEditForm({...editForm, qty: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.minStock}</label>
                  <input type="number" className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.minStock || ''} onChange={e => setEditForm({...editForm, minStock: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.barcode}</label>
                  <input className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.barcode || ''} onChange={e => setEditForm({...editForm, barcode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.category}</label>
                  <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main" value={editForm.categoryId || ''} onChange={e => setEditForm({...editForm, categoryId: e.target.value})}>
                    <option value="">{t.noCategory}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.supplier}</label>
                  <select 
                    className={cn("w-full bg-bg-base border border-border-subtle rounded-xl py-2 px-4 text-text-main", language === 'ar' && "text-right")}
                    value={editForm.supplier || ''} 
                    onChange={e => setEditForm({...editForm, supplier: e.target.value})}
                  >
                    <option value="">{language === 'ar' ? "اختر مورد" : "Select Supplier"}</option>
                    {(suppliers || []).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-accent text-white rounded-xl font-bold shadow-xl hover:opacity-90 transition-opacity uppercase tracking-widest text-sm mt-4">
                {t.saveChanges}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showQuickSupplierModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl p-8 border border-border-subtle shadow-2xl"
            >
              <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Store className="w-5 h-5 text-accent" />
                {t.addSupplier}
              </h4>
              <form onSubmit={addQuickSupplier} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.supplierName}</label>
                  <input 
                    autoFocus
                    required 
                    value={quickSupplierName} 
                    onChange={e => setQuickSupplierName(e.target.value)} 
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-bg-base border border-border-subtle rounded-xl py-4 px-6 text-sm font-bold focus:border-accent outline-none shadow-inner"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowQuickSupplierModal(false)} className="flex-1 bg-white border border-border-subtle text-text-secondary py-4 rounded-2xl font-black text-xs tracking-widest active:scale-95 transition-all uppercase">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all uppercase">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- View: POS ---
