import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Archive, ArrowRightLeft, FolderOpen, Plus, Edit2, Trash2, 
  AlertTriangle, Store, X, Package, LayoutGrid, Save, Download, Upload, ArrowUpDown, ChevronDown,
  History
} from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Supplier } from '../types';
import { translations } from '../translations';
import { useStore, useAuthStore } from '../store/useStore';
import { api } from '../services/apiService';

type SortKey = 'name' | 'price' | 'costPrice' | 'qty' | 'supplier' | 'soldQty';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

const historyTranslations = {
  en: {
    productHistory: "Product Stock History",
    quantityReduced: "Quantity Change",
    soldTo: "Sold To / Ref",
    date: "Date",
    employee: "Staff",
    reason: "Details / Reason",
    noHistory: "No movement history found for this product.",
    type: "Type",
    sale: "Sale",
    stockIn: "Stock In",
    stockOut: "Stock Out",
    create: "Initial Stock",
    update: "Modification",
  },
  fr: {
    productHistory: "Historique des mouvements du produit",
    quantityReduced: "Variation Qté",
    soldTo: "Vendu À / Réf",
    date: "Date",
    employee: "Employé",
    reason: "Détails / Raison",
    noHistory: "Aucun historique trouvé pour ce produit.",
    type: "Type",
    sale: "Vente",
    stockIn: "Entrée",
    stockOut: "Sortie",
    create: "Stock Initial",
    update: "Modification",
  },
  ar: {
    productHistory: "سجل حركات المنتج",
    quantityReduced: "تغير الكمية",
    soldTo: "بيع لـ / المرجع",
    date: "التاريخ",
    employee: "الموظف",
    reason: "التفاصيل / السبب",
    noHistory: "لم يتم العثور على أي حركات لهذا المنتج.",
    type: "النوع",
    sale: "بيع",
    stockIn: "إدخال مخزون",
    stockOut: "إخراج مخزون",
    create: "مخزون أولي",
    update: "تعديل",
  }
};

const getTypeLabel = (type: string, lang: 'en' | 'fr' | 'ar') => {
  const t = historyTranslations[lang];
  const typeLower = type.toLowerCase();
  if (typeLower === 'sale') return t.sale;
  if (typeLower === 'in') return t.stockIn;
  if (typeLower === 'out') return t.stockOut;
  if (typeLower === 'create') return t.create;
  if (typeLower === 'update') return t.update;
  return type;
};

const getTypeBadgeClass = (type: string) => {
  const typeLower = type.toLowerCase();
  if (typeLower === 'sale') return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800";
  if (typeLower === 'in' || typeLower === 'create') return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
  if (typeLower === 'out') return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800";
  if (typeLower === 'update') return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800";
};

export default function Inventory({ permissions }: { permissions: any }) {
  const { products, categories, suppliers, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();
  const t = translations[language];

  // --- Add/Edit Product State ---
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [qty, setQty] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplier, setSupplier] = useState('');

  // --- Category & Supplier Modals ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');

  // --- View Controls ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [showGrouped, setShowGrouped] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // --- Stock Adjustment State ---
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<'in' | 'out'>('in');
  const [adjOutReason, setAdjOutReason] = useState<'damage' | 'return'>('damage');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSupplierId, setAdjSupplierId] = useState('');
  const [adjCostPrice, setAdjCostPrice] = useState('');

  // --- Edit Modal State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', price: '', costPrice: '', qty: '', minStock: '', barcode: '', categoryId: '', supplier: ''
  });

  // --- Product History State ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- CSV Import/Export ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // --- Low Stock Alert ---
  const [hasDismissedLowStock, setHasDismissedLowStock] = useState(false);
  const lowStockProductsAlert = useMemo(() => {
    return products.filter(p => p.qty <= (p.minStock ?? 5));
  }, [products]);
  const showLowStockAlert = lowStockProductsAlert.length > 0 && !hasDismissedLowStock;

  // ============================================================================
  // Handlers
  // ============================================================================

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setMessage({ text: language === 'ar' ? "تمت إضافة الفئة." : language === 'fr' ? "Catégorie ajoutée." : "Category added.", type: 'success' });
      onRefresh();
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل إضافة الفئة." : language === 'fr' ? "Échec de l'ajout de la catégorie." : "Failed to add category.", type: 'error' });
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
      setMessage({ text: language === 'ar' ? "تمت إضافة المورد بنجاح." : language === 'fr' ? "Fournisseur ajouté avec succès." : "Supplier added successfully.", type: 'success' });
      onRefresh();
    } catch (err) {
      setMessage({ text: "Failed to add supplier.", type: 'error' });
    }
  };

  const seedDefaults = async () => {
    const defaults = [
      { en: "Peinture", ar: "الصباغة" }, { en: "Visserie", ar: "الفيس و البراغي" },
      { en: "Outillage", ar: "الأدوات" }, { en: "Électricité", ar: "الكهرباء" },
      { en: "Plomberie", ar: "الترصيص / الما" }, { en: "Matériaux", ar: "مواد البناء" },
      { en: "Quincaillerie", ar: "خردوات متنوعة" }
    ];
    try {
      for (const cat of defaults) {
        const n = language === 'ar' ? `${cat.ar} (${cat.en})` : `${cat.en} (${cat.ar})`;
        if (!categories.find(c => c.name.includes(cat.en) || c.name.includes(cat.ar))) {
          await api.addCategory(n);
        }
      }
      onRefresh();
      setMessage({ text: language === 'ar' ? "تم تحديث الفئات الافتراضية." : language === 'fr' ? "Catégories par défaut configurées." : "Default categories seeded.", type: 'success' });
    } catch (err) {
      setMessage({ text: "Error seeding categories.", type: 'error' });
    }
  };

  const deleteCategory = async (id: string) => {
    if(!window.confirm(language === 'ar' ? "هل أنت متأكد من حذف هذه الفئة؟" : language === 'fr' ? "Voulez-vous supprimer cette catégorie ?" : "Delete this category?")) return;
    try {
      await api.deleteCategory(id);
      onRefresh();
      setMessage({ text: language === 'ar' ? "تم حذف الفئة." : language === 'fr' ? "Catégorie supprimée." : "Category deleted.", type: 'success' });
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل الحذف." : language === 'fr' ? "Échec de la suppression." : "Delete failed.", type: 'error' });
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
        supplierId: suppliers.find(s => s.name === supplier)?.id || null,
        actor: user?.username || 'system'
      });
      setName(''); setPrice(''); setCostPrice(''); setQty(''); setBarcode(''); setMinStock('5'); setCategoryId(''); setSupplier('');
      setMessage({ text: language === 'ar' ? "تمت إضافة المنتج." : language === 'fr' ? "Produit ajouté au stock." : "Product added to inventory.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setMessage({ text: `${language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed'}: ${err.message}`, type: 'error' });
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
      setMessage({ text: language === 'ar' ? "تم رفض التعديل." : language === 'fr' ? "Ajustement rejeté." : "Adjustment rejected.", type: 'error' });
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
        supplierId: suppliers.find(s => s.name === editForm.supplier)?.id || null,
        actor: user?.username || 'system'
      });
      setEditingProduct(null);
      setMessage({ text: language === 'ar' ? "تم تحديث المنتج." : language === 'fr' ? "Produit mis à jour." : "Product updated.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setMessage({ text: `${language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed'}: ${err.message}`, type: 'error' });
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
      const stored = localStorage.getItem('pos_user');
      const actor = stored ? JSON.parse(stored).username : 'system';

      // Determine final supplier ID based on selection
      // If IN -> use adjSupplierId if provided
      // If OUT -> only use adjSupplierId if reason is 'return'
      const finalSupplierId = adjType === 'in' ? adjSupplierId : (adjType === 'out' && adjOutReason === 'return' ? adjSupplierId : null);

      const finalReason = adjType === 'out' && adjOutReason === 'damage' ? `[DAMAGE] ${adjReason}` : adjReason;

      await api.adjustStock(adjProduct.id, {
        type: adjType,
        quantity: parseFloat(adjQty),
        reason: finalReason,
        actor: actor,
        supplierId: finalSupplierId || null,
        costPrice: adjCostPrice ? parseFloat(adjCostPrice) : undefined
      });
      setShowAdjModal(false);
      setAdjQty(''); setAdjReason(''); setAdjSupplierId('');
      setMessage({ text: language === 'ar' ? "تم تعديل المخزون." : language === 'fr' ? "Stock ajusté avec succès." : "Stock adjusted successfully.", type: 'success' });
      onRefresh();
    } catch (err) {
      setMessage({ text: "Adjustment failed.", type: 'error' });
    }
  };

  const viewProductHistory = async (p: Product) => {
    setHistoryProduct(p);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await api.getProductHistory(p.id);
      setProductHistory(data);
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل تحميل تاريخ المنتج." : language === 'fr' ? "Échec du chargement de l'historique." : "Failed to load product history.", type: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 opacity-30 inline ml-1" />;
    return <ArrowUpDown className={cn("w-3 h-3 inline ml-1 text-accent", sortConfig.direction === 'desc' && "rotate-180")} />;
  };

  const exportToCSV = () => {
    const headers = language === 'ar' 
      ? ['الاسم', 'الباركود', 'الفئة', 'سعر البيع', 'سعر الشراء', 'الكمية', 'التنبيه', 'المورد']
      : language === 'fr'
      ? ['Nom', 'Code-barres', 'Catégorie', 'Prix de Vente', "Prix d'Achat", 'Quantité', 'Stock Min', 'Fournisseur']
      : ['Name', 'Barcode', 'Category', 'Price', 'Cost Price', 'Qty', 'Min Stock', 'Supplier'];
    
    const rows = processedProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`, 
      p.barcode ? `"${p.barcode}"` : '', 
      `"${categories.find(c => c.id === p.categoryId)?.name || ''}"`, 
      p.price, 
      p.costPrice || 0, 
      p.qty, 
      p.minStock || 5, 
      p.supplier ? `"${p.supplier}"` : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) throw new Error("File empty or missing headers");

        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('اسم') || h.includes('nom'));
        const barcodeIdx = headers.findIndex(h => h.includes('barcode') || h.includes('باركود') || h.includes('code-barres'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('ثمن') || h.includes('prix'));
        const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('تكلفة') || h.includes('achat'));
        const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('كمية') || h.includes('quantité'));
        const minStockIdx = headers.findIndex(h => h.includes('min') || h.includes('تنبيه'));
        const supplierIdx = headers.findIndex(h => h.includes('supplier') || h.includes('مورد') || h.includes('fournisseur'));
        
        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Basic CSV parsing handling quotes
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === separator && !inQuotes) { cols.push(current); current = ''; }
            else current += char;
          }
          cols.push(current);
          
          const name = nameIdx >= 0 ? cols[nameIdx]?.replace(/^"|"$/g, '').trim() : '';
          if (!name) continue;
          
          await api.addProduct({
            name,
            barcode: barcodeIdx >= 0 ? cols[barcodeIdx]?.replace(/^"|"$/g, '').trim() : null,
            price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
            costPrice: costIdx >= 0 ? parseFloat(cols[costIdx]) || 0 : 0,
            qty: qtyIdx >= 0 ? parseFloat(cols[qtyIdx]) || 0 : 0,
            minStock: minStockIdx >= 0 ? parseFloat(cols[minStockIdx]) || 5 : 5,
            supplier: supplierIdx >= 0 ? cols[supplierIdx]?.replace(/^"|"$/g, '').trim() : null,
            categoryId: null
          });
          importedCount++;
        }
        setMessage({ text: language === 'ar' ? `تم استيراد ${importedCount} منتج.` : language === 'fr' ? `${importedCount} produits importés.` : `Imported ${importedCount} products.`, type: 'success' });
        onRefresh();
      } catch (err) {
        setMessage({ text: language === 'ar' ? "فشل الاستيراد." : language === 'fr' ? "Échec de l'importation." : "Import failed.", type: 'error' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // Derived Data
  // ============================================================================

  const processedProducts = useMemo(() => {
    let result = products;

    // 1. Filter Category & Stock Status
    result = result.filter(p => {
      const matchesCategory = !filterCategoryId || (filterCategoryId === 'none' ? !p.categoryId : p.categoryId === filterCategoryId);
      let matchesStockStatus = true;
      if (filterStockStatus === 'inStock') matchesStockStatus = p.qty > 0;
      else if (filterStockStatus === 'outOfStock') matchesStockStatus = p.qty === 0;
      else if (filterStockStatus === 'lowStock') matchesStockStatus = p.qty > 0 && p.qty <= (p.minStock ?? 5);
      return matchesCategory && matchesStockStatus;
    });

    // 2. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q)) || 
        (p.supplier && p.supplier.toLowerCase().includes(q))
      );
    }

    // 3. Sort
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: sort by soldQty descending
      result.sort((a, b) => (b.soldQty || 0) - (a.soldQty || 0));
    }

    return result;
  }, [products, filterCategoryId, filterStockStatus, searchQuery, sortConfig]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-8 pb-10">
      
      {/* --- FORMS SECTION --- */}
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
              <input placeholder={t.productName} className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" value={name || ''} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.category}</label>
              <select className={cn("w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none", language === 'ar' && "text-right")} value={categoryId || ''} onChange={e => setCategoryId(e.target.value)}>
                <option value="">{t.noCategory}</option>
                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.barcode}</label>
                <input placeholder={t.barcode} className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" value={barcode || ''} onChange={e => setBarcode(e.target.value)} />
              </div>
              <div className="space-y-1.5 overflow-visible">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1 flex justify-between items-center">
                  <span>{t.supplier}</span>
                  <button type="button" onClick={() => setShowQuickSupplierModal(true)} className="text-accent hover:underline text-[9px] font-black">+ {language === 'ar' ? "مورد جديد" : language === 'fr' ? "NOUVEAU" : "NEW"}</button>
                </label>
                <select className={cn("w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none", language === 'ar' && "text-right")} value={supplier || ''} onChange={e => setSupplier(e.target.value)}>
                  <option value="">{language === 'ar' ? "اختر مورد" : language === 'fr' ? "Sélectionner Fournisseur" : "Select Supplier"}</option>
                  {(suppliers || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className={cn("grid gap-5", permissions.viewCostPrice ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}>
              {permissions.viewCostPrice && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.costPrice}</label>
                  <input type="number" step="0.01" placeholder={t.costPrice} className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-medium focus:border-accent outline-none" value={costPrice || ''} onChange={e => setCostPrice(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.price}</label>
                <input type="number" step="0.01" placeholder={t.price} className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-medium focus:border-accent outline-none" value={price || ''} onChange={e => setPrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{t.qty}</label>
                <input type="number" placeholder={t.qty} disabled={!permissions.editStock} className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-medium focus:border-accent outline-none disabled:opacity-50" value={qty || ''} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-text-secondary px-1">{language === 'ar' ? "تنبيه" : language === 'fr' ? "Alerte" : "Alert"}</label>
                <input type="number" placeholder={language === 'ar' ? "تنبيه" : language === 'fr' ? "Alerte" : "Alert"} className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm font-medium focus:border-accent outline-none" value={minStock || ''} onChange={e => setMinStock(e.target.value)} />
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
              <input placeholder={t.categoryName} className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent outline-none" value={newCategoryName || ''} onChange={e => setNewCategoryName(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-white border border-border-subtle text-text-main font-bold rounded-lg py-3 hover:bg-bg-base transition-colors text-sm uppercase tracking-widest">
              {t.save}
            </button>
          </form>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">{t.categories}</h4>
              <button onClick={seedDefaults} className="text-[9px] font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-1">
                <Plus className="w-2.5 h-2.5" />{language === 'ar' ? "إعداد افتراضي" : language === 'fr' ? "CONFIG PAR DÉFAUT" : "SETUP DEFAULTS"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(categories || []).map(c => (
                <div key={c.id} className="group/cat flex items-center gap-2 bg-bg-base border border-border-subtle px-3 py-1.5 rounded-xl text-[11px] font-bold text-text-main hover:border-accent/40 transition-colors">
                  <span>{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="text-text-secondary hover:text-danger opacity-0 group-hover/cat:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {categories.length === 0 && <div className="text-[11px] text-text-secondary italic">{language === 'ar' ? "لا توجد فئات حالياً" : language === 'fr' ? "Aucune catégorie pour le moment" : "No categories yet"}</div>}
            </div>
          </div>
        </section>
      </div>

      {/* --- INVENTORY LIST SECTION --- */}
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold tracking-tight text-text-main">{t.inventory}</h3>
            {/* Search Bar */}
            <div className="relative w-full xl:w-96">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary", language === 'ar' ? 'right-3' : 'left-3')} />
              <input 
                type="text"
                placeholder={language === 'ar' ? "بحث باسم، باركود، مورد..." : language === 'fr' ? "Rechercher par nom, code-barres, fournisseur..." : "Search name, barcode, supplier..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={cn("w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-2.5 text-sm font-bold focus:border-accent outline-none transition-all shadow-sm", language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4')}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Export / Import CSV */}
            <div className="flex bg-card border border-border-subtle rounded-lg overflow-hidden shadow-sm">
               <button onClick={exportToCSV} className="px-4 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors border-r border-border-subtle">
                 <Download className="w-3.5 h-3.5 text-emerald-500" /> {language === 'ar' ? "تصدير" : language === 'fr' ? "Exporter" : "Export"}
               </button>
               <label className={cn("px-4 py-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors cursor-pointer", isImporting && "opacity-50 pointer-events-none")}>
                 <Upload className="w-3.5 h-3.5 text-accent" /> {isImporting ? "..." : (language === 'ar' ? "استيراد" : language === 'fr' ? "Importer" : "Import")}
                 <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
               </label>
            </div>

            <button onClick={() => setShowGrouped(!showGrouped)} className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border shadow-sm flex items-center gap-2", showGrouped ? "bg-accent text-white border-accent" : "bg-card text-text-secondary border-border-subtle hover:bg-bg-base")}>
              <LayoutGrid className="w-3.5 h-3.5" />
              {language === 'ar' ? "عرض حسب الفئة" : language === 'fr' ? "Afficher par catégorie" : "Show By Category"}
            </button>
            <div className="flex items-center gap-2">
              <select className={cn("bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-xs focus:border-accent outline-none font-bold shadow-sm", language === 'ar' && "text-right")} value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}>
                <option value="">{t.allCategories}</option>
                <option value="none">{t.noCategory}</option>
                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className={cn("bg-card border border-border-subtle rounded-lg px-4 py-2.5 text-xs focus:border-accent outline-none font-bold shadow-sm", language === 'ar' && "text-right")} value={filterStockStatus} onChange={e => setFilterStockStatus(e.target.value as any)}>
                <option value="all">{language === 'ar' ? "كل الحالات" : language === 'fr' ? "Tous les statuts" : "All Status"}</option>
                <option value="inStock">{t.inStock}</option>
                <option value="lowStock">{t.lowStock}</option>
                <option value="outOfStock">{t.outOfStock}</option>
              </select>
            </div>
          </div>
        </div>

        {showGrouped ? (
          /* GROUPED VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(categories || []).map(c => {
               const catProducts = processedProducts.filter(p => p.categoryId === c.id);
               if (catProducts.length === 0) return null;
               return (
                 <div key={c.id} className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm hover:border-accent/30 transition-colors">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-accent mb-4 border-b border-border-subtle pb-3">
                      <FolderOpen className="w-4 h-4" />{c.name}
                      <span className="ml-auto bg-accent/10 text-accent px-2 py-0.5 rounded-md text-[10px]">{catProducts.length}</span>
                    </h4>
                      <div className="space-y-3">
                        {catProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center group">
                            <div className={cn(language === 'ar' && "text-right")}>
                              <div className="text-[13px] font-semibold text-text-main group-hover:text-accent transition-colors">{p.name}</div>
                              <div className="text-[10px] text-text-secondary font-mono">#{p.id.slice(0, 6).toUpperCase()} {p.supplier && <span className="ml-2 font-bold opacity-60 text-accent">/ {p.supplier}</span>}</div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="text-right">
                                 <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                                 <div className={cn("text-[10px] font-black uppercase", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-secondary")}>{language === 'ar' ? "الكمية" : language === 'fr' ? "Qté" : "Qty"}: {p.qty}</div>
                               </div>
                               {permissions.editStock && <button onClick={() => startEditing(p)} className="p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
                             </div>
                          </div>
                        ))}
                      </div>
                 </div>
               );
            })}
            {/* Uncategorized */}
            {(() => {
                const uncategorizedProducts = processedProducts.filter(p => !p.categoryId);
                if (uncategorizedProducts.length === 0) return null;
                return (
                  <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-text-secondary mb-4 border-b border-border-subtle pb-3">
                        <Archive className="w-4 h-4" />{t.noCategory}
                        <span className="ml-auto bg-bg-base text-text-secondary px-2 py-0.5 rounded-md text-[10px]">{uncategorizedProducts.length}</span>
                      </h4>
                      <div className="space-y-3">
                        {uncategorizedProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center group">
                            <div className={cn(language === 'ar' && "text-right")}>
                              <div className="text-[13px] font-semibold text-text-main group-hover:text-accent transition-colors">{p.name}</div>
                              <div className="text-[10px] text-text-secondary font-mono">#{p.id.slice(0, 6).toUpperCase()} {p.supplier && <span className="ml-2 font-bold opacity-60 text-accent">/ {p.supplier}</span>}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                                <div className={cn("text-[10px] font-black uppercase", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-secondary")}>{language === 'ar' ? "الكمية" : language === 'fr' ? "Qté" : "Qty"}: {p.qty}</div>
                              </div>
                              {permissions.editStock && <button onClick={() => startEditing(p)} className="p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>}
                            </div>
                          </div>
                        ))}
                      </div>
                  </div>
                );
            })()}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="section-container bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#fafafa] dark:bg-slate-800/50 border-b border-border-subtle">
                    <th onClick={() => handleSort('name')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                      {language === 'ar' ? 'المنتج' : language === 'fr' ? 'Produit' : 'Product'} {getSortIcon('name')}
                    </th>
                    {permissions.viewCostPrice && (
                      <th onClick={() => handleSort('costPrice')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                        {t.costPrice} {getSortIcon('costPrice')}
                      </th>
                    )}
                    <th onClick={() => handleSort('price')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                      {t.price} {getSortIcon('price')}
                    </th>
                    <th onClick={() => handleSort('qty')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                      {t.qty} {getSortIcon('qty')}
                    </th>
                    <th onClick={() => handleSort('soldQty')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                      {t.soldQty} {getSortIcon('soldQty')}
                    </th>
                    <th onClick={() => handleSort('supplier')} className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest cursor-pointer hover:bg-bg-base transition-colors select-none">
                      {t.supplier} {getSortIcon('supplier')}
                    </th>
                    <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-text-secondary">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-sm">{language === 'ar' ? "لا يوجد منتجات" : language === 'fr' ? "Aucun produit trouvé" : "No products found"}</p>
                      </td>
                    </tr>
                  ) : processedProducts.map(p => {
                    const category = categories.find(c => c.id === p.categoryId);
                    return (
                      <tr key={p.id} className={cn(
                        "border-b border-border-subtle last:border-0 transition-colors group text-[13px]",
                        p.qty === 0 ? "bg-red-50/30 hover:bg-red-50/50 dark:bg-red-900/10 dark:hover:bg-red-900/20" : 
                        p.qty <= (p.minStock ?? 5) ? "bg-orange-50/30 hover:bg-orange-50/50 dark:bg-orange-900/10 dark:hover:bg-orange-900/20" : 
                        "hover:bg-bg-base/30"
                      )}>
                        <td className="p-4">
                          <div className="font-semibold text-text-main">{p.name}</div>
                          <div className="text-[10px] text-text-secondary font-mono flex items-center gap-2 mt-1">
                            {p.barcode ? <span>{p.barcode}</span> : <span>#{p.id.slice(0, 8).toUpperCase()}</span>}
                            {category && <span className="opacity-70 text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded">• {category.name}</span>}
                          </div>
                        </td>
                        {permissions.viewCostPrice && <td className="p-4 text-text-secondary italic">{formatNumber(p.costPrice || 0)} {t.currency}</td>}
                        <td className="p-4 text-text-main font-bold">{formatNumber(p.price)} {t.currency}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {permissions.editStock ? (
                              <>
                                <button onClick={() => updateStock(p.id, p.qty - 1)} className="w-6 h-6 border border-border-subtle rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors text-text-secondary shadow-sm">-</button>
                                <span className={cn("font-black w-10 text-center text-sm", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-main")}>{p.qty}</span>
                                <button onClick={() => updateStock(p.id, p.qty + 1)} className="w-6 h-6 border border-border-subtle rounded-md flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors text-text-secondary shadow-sm">+</button>
                                <button 
                                  onClick={() => {
                                    setAdjProduct(p); setAdjCostPrice(p.costPrice?.toString() || '0'); setAdjSupplierId(p.supplierId || '');
                                    setShowAdjModal(true);
                                  }}
                                  className="ml-2 w-7 h-7 bg-accent/10 rounded-md flex items-center justify-center hover:bg-accent text-accent hover:text-white transition-all shadow-sm"
                                  title={t.stockAdjustment}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className={cn("font-bold text-sm", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-main")}>{p.qty}</span>
                            )}
                            {p.qty <= (p.minStock ?? 5) && (
                              <span className={cn("text-[9px] ml-2 font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border", p.qty === 0 ? "bg-red-100 text-danger border-red-200 dark:bg-red-900/30" : "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30")}>
                                {p.qty === 0 ? (language === 'ar' ? 'نفذت' : language === 'fr' ? 'Rupture' : 'Out') : (language === 'ar' ? 'منخفض' : language === 'fr' ? 'Faible' : 'Low')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-text-main">
                          {p.soldQty || 0}
                        </td>
                        <td className="p-4 text-[11px] font-bold text-text-secondary">{p.supplier || '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => viewProductHistory(p)} 
                              className="text-text-secondary hover:bg-accent/10 hover:text-accent p-2 rounded-lg transition-colors" 
                              title={language === 'ar' ? 'سجل المنتج' : language === 'fr' ? 'Historique du produit' : 'Product History'}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button onClick={() => startEditing(p)} className="text-accent hover:bg-accent/10 p-2 rounded-lg transition-colors" title={language === 'ar' ? 'تعديل' : language === 'fr' ? 'Modifier' : 'Edit'}><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => {
                              if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف المنتج؟' : language === 'fr' ? 'Supprimer ce produit du stock ?' : 'Remove product from inventory?')) {
                                try { await api.deleteProduct(p.id); setMessage({ text: language === 'ar' ? "تم الحذف." : "Product removed.", type: 'success' }); onRefresh(); } 
                                catch (err) { setMessage({ text: language === 'ar' ? "فشل الحذف." : "Delete failed.", type: 'error' }); }
                              }
                            }} className="text-text-secondary hover:bg-danger/10 hover:text-danger p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* Adjustment Modal */}
        {showAdjModal && adjProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-card border border-border-subtle rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-main tracking-tight">{t.stockAdjustment}</h3>
                <button onClick={() => setShowAdjModal(false)} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="mb-6 p-4 bg-bg-base/50 rounded-2xl border border-border-subtle">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{language === 'ar' ? 'المنتج' : 'Product'}</div>
                <div className="font-bold text-text-main">{adjProduct.name}</div>
                <div className="text-xs text-text-secondary mt-1">{language === 'ar' ? 'الرصيد الحالي:' : 'Current Stock:'} <span className="font-black text-text-main">{adjProduct.qty}</span></div>
              </div>

              <form onSubmit={handleStockAdjust} className="space-y-6">
                <div className="grid grid-cols-2 gap-2 bg-bg-base p-1.5 rounded-2xl border border-border-subtle shadow-inner">
                  <button type="button" onClick={() => setAdjType('in')} className={cn("py-2.5 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-widest", adjType === 'in' ? "bg-accent text-white shadow-md" : "text-text-secondary hover:text-text-main")}>{t.stockIn}</button>
                  <button type="button" onClick={() => setAdjType('out')} className={cn("py-2.5 px-4 rounded-xl font-black transition-all text-[11px] uppercase tracking-widest", adjType === 'out' ? "bg-danger text-white shadow-md" : "text-text-secondary hover:text-text-main")}>{t.stockOut}</button>
                </div>

                {adjType === 'out' && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <button type="button" onClick={() => setAdjOutReason('damage')} className={cn("py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2", adjOutReason === 'damage' ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800" : "bg-bg-base border-border-subtle text-text-secondary hover:border-text-secondary/30")}>
                      <AlertTriangle className="w-4 h-4" />
                      {language === 'ar' ? 'تالف / ضياع' : language === 'fr' ? 'Endommagé / Perte' : 'Damage / Loss'}
                    </button>
                    <button type="button" onClick={() => setAdjOutReason('return')} className={cn("py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2", adjOutReason === 'return' ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-bg-base border-border-subtle text-text-secondary hover:border-text-secondary/30")}>
                      <ArrowRightLeft className="w-4 h-4" />
                      {language === 'ar' ? 'إرجاع للمورد' : language === 'fr' ? 'Retour au fournisseur' : 'Return to Supplier'}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.qty}</label>
                  <input required type="number" min="1" step="any" className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-3 px-4 text-text-main font-black focus:border-accent outline-none shadow-sm" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
                </div>

                {/* Show supplier select if IN, OR if OUT + RETURN */}
                {(adjType === 'in' || (adjType === 'out' && adjOutReason === 'return')) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.supplier}</label>
                      <select required={adjType === 'out' && adjOutReason === 'return'} className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold focus:border-accent outline-none shadow-sm" value={adjSupplierId} onChange={(e) => setAdjSupplierId(e.target.value)}>
                        <option value="">{language === 'ar' ? "اختر المورد..." : language === 'fr' ? "Sélectionner Fournisseur..." : "Select Supplier..."}</option>
                        {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {adjSupplierId && (
                      <div className="space-y-2 p-4 bg-accent/5 rounded-xl border border-accent/20">
                        <label className="text-[10px] font-black text-accent uppercase tracking-widest">{language === 'ar' ? "تكلفة الوحدة" : language === 'fr' ? "Coût Unitaire" : "Unit Cost"}</label>
                        <input required type="number" step="any" className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-2.5 px-4 text-text-main font-black focus:border-accent outline-none shadow-sm" value={adjCostPrice} onChange={(e) => setAdjCostPrice(e.target.value)} />
                        <p className="text-[9px] text-text-secondary font-bold mt-2">
                          {adjType === 'in' 
                            ? (language === 'ar' ? "سيتم زيادة التكلفة في دين المورد" : language === 'fr' ? "Le coût augmentera la dette du fournisseur" : "Cost will increase supplier debt")
                            : (language === 'ar' ? "سيتم خصم التكلفة من دين المورد" : language === 'fr' ? "Le coût sera déduit de la dette du fournisseur" : "Cost will be deducted from supplier debt")}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.reason} {adjType === 'out' && adjOutReason === 'damage' && "*"}</label>
                  <input required={adjType === 'out' && adjOutReason === 'damage'} type="text" placeholder={language === 'ar' ? "السبب الملاحظة..." : language === 'fr' ? "Motif / Note..." : "Reason / Note..."} className="w-full bg-white dark:bg-slate-900 border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold focus:border-accent outline-none shadow-sm" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
                </div>

                <button type="submit" className={cn("w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl transition-all text-white uppercase tracking-widest text-sm", adjType === 'in' ? "bg-accent hover:opacity-90 shadow-accent/20" : "bg-danger hover:opacity-90 shadow-danger/20")}>
                  <Save className="w-4 h-4" /> {t.confirm}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border-subtle rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-main tracking-tight">{language === 'ar' ? "تعديل المنتج" : language === 'fr' ? "Modifier le Produit" : "Edit Product"}</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <form onSubmit={handleUpdateProduct} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.productName}</label>
                    <input required className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.price}</label>
                    <input required type="number" step="0.01" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                  </div>
                  {permissions.viewCostPrice && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.costPrice}</label>
                      <input type="number" step="0.01" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.costPrice || ''} onChange={e => setEditForm({...editForm, costPrice: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.qty}</label>
                    <input required type="number" disabled={!permissions.editStock} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent disabled:opacity-50" value={editForm.qty || ''} onChange={e => setEditForm({...editForm, qty: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.minStock}</label>
                    <input type="number" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.minStock || ''} onChange={e => setEditForm({...editForm, minStock: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.barcode}</label>
                    <input className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.barcode || ''} onChange={e => setEditForm({...editForm, barcode: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.category}</label>
                    <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.categoryId || ''} onChange={e => setEditForm({...editForm, categoryId: e.target.value})}>
                      <option value="">{t.noCategory}</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.supplier}</label>
                    <select className={cn("w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent", language === 'ar' && "text-right")} value={editForm.supplier || ''} onChange={e => setEditForm({...editForm, supplier: e.target.value})}>
                      <option value="">{language === 'ar' ? "اختر مورد" : language === 'fr' ? "Sélectionner Fournisseur" : "Select Supplier"}</option>
                      {(suppliers || []).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-xl shadow-accent/20 hover:opacity-90 transition-opacity uppercase tracking-widest text-sm mt-4">
                  {t.saveChanges}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Quick Supplier Modal */}
        {showQuickSupplierModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card w-full max-w-md rounded-3xl p-8 border border-border-subtle shadow-2xl">
              <h4 className="text-xl font-black mb-6 flex items-center gap-2"><Store className="w-5 h-5 text-accent" />{t.addSupplier}</h4>
              <form onSubmit={addQuickSupplier} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.supplierName}</label>
                  <input autoFocus required value={quickSupplierName} onChange={e => setQuickSupplierName(e.target.value)} placeholder="e.g. Acme Corp" className="w-full bg-bg-base border border-border-subtle rounded-xl py-4 px-6 text-sm font-bold focus:border-accent outline-none shadow-inner" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowQuickSupplierModal(false)} className="flex-1 bg-white border border-border-subtle text-text-secondary py-4 rounded-2xl font-black text-xs tracking-widest active:scale-95 transition-all uppercase">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all uppercase">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Product History Modal */}
        {showHistoryModal && historyProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="bg-card border border-border-subtle rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-main tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  {historyTranslations[language].productHistory}
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>

              <div className="mb-6 p-4 bg-bg-base/50 rounded-2xl border border-border-subtle">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{language === 'ar' ? 'المنتج' : language === 'fr' ? 'Produit' : 'Product'}</div>
                <div className="font-bold text-text-main text-lg">{historyProduct.name}</div>
                <div className="text-xs text-text-secondary mt-1">{language === 'ar' ? 'المخزون الحالي:' : language === 'fr' ? 'Stock actuel:' : 'Current Stock:'} <span className="font-black text-text-main">{historyProduct.qty}</span></div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px] border border-border-subtle rounded-2xl bg-bg-base/30">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xs font-bold text-text-secondary">{language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}</div>
                  </div>
                ) : productHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-text-secondary text-xs font-bold">
                    {historyTranslations[language].noHistory}
                  </div>
                ) : (
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle bg-bg-base/50 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                        <th className="p-4">{historyTranslations[language].date}</th>
                        <th className="p-4">{historyTranslations[language].type}</th>
                        <th className="p-4 text-center">{historyTranslations[language].quantityReduced}</th>
                        <th className="p-4">{historyTranslations[language].soldTo}</th>
                        <th className="p-4">{historyTranslations[language].employee}</th>
                        <th className="p-4">{historyTranslations[language].reason}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productHistory.map((item, idx) => (
                        <tr key={idx} className="border-b border-border-subtle hover:bg-bg-base/20 transition-colors text-xs text-text-main">
                          <td className="p-4 font-bold text-[11px] text-text-secondary">
                            {new Date(item.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'fr-FR', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                              getTypeBadgeClass(item.type)
                            )}>
                              {getTypeLabel(item.type, language)}
                            </span>
                          </td>
                          <td className={cn(
                            "p-4 text-center font-black",
                            (item.type.toLowerCase() === 'sale' || item.type.toLowerCase() === 'out' || (item.type.toLowerCase() === 'update' && item.quantity < 0))
                              ? "text-danger"
                              : (item.type.toLowerCase() === 'in' || item.type.toLowerCase() === 'create' || (item.type.toLowerCase() === 'update' && item.quantity > 0))
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-text-secondary"
                          )}>
                            {(item.type.toLowerCase() === 'sale' || item.type.toLowerCase() === 'out' || (item.type.toLowerCase() === 'update' && item.quantity < 0))
                              ? `-${Math.abs(item.quantity)}`
                              : (item.type.toLowerCase() === 'in' || item.type.toLowerCase() === 'create' || (item.type.toLowerCase() === 'update' && item.quantity > 0))
                                ? `+${item.quantity}`
                                : '0'}
                          </td>
                          <td className="p-4 font-bold">
                            {item.customer_name || '-'}
                          </td>
                          <td className="p-4 font-bold text-text-secondary">
                            {item.employee_name || 'System'}
                          </td>
                          <td className="p-4 text-[11px] text-text-secondary font-bold">
                            {item.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="bg-bg-base hover:bg-bg-base-hover border border-border-subtle text-text-main font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm text-sm"
                >
                  {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Low Stock Alert Modal */}
        {showLowStockAlert && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="bg-card border border-red-500/30 rounded-[2rem] p-8 w-full max-w-3xl shadow-[0_0_50px_rgba(239,68,68,0.15)] max-h-[85vh] flex flex-col relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
              
              <div className="relative z-10 flex flex-col h-full overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 shrink-0 bg-red-50 dark:bg-red-900/10 p-4 sm:p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center shadow-inner shrink-0 ring-4 ring-white dark:ring-slate-800">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className={cn(language === 'ar' && "text-right")}>
                      <h3 className="text-lg font-black text-red-600 dark:text-red-400 tracking-tight leading-tight">
                        {language === 'ar' ? 'تنبيه نفاذ المخزون !' : language === 'fr' ? 'Alerte Rupture de Stock !' : 'Low Stock Alert !'}
                      </h3>
                      <div className="text-sm font-bold text-red-500 mt-0.5">
                        {language === 'ar' ? 'المنتجات الناقصة:' : language === 'fr' ? 'Produits manquants:' : 'Missing products:'} 
                        <span className="font-black ml-1 text-lg">{lowStockProductsAlert.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setHasDismissedLowStock(true)}
                    className="w-full sm:w-auto group relative overflow-hidden bg-red-500 hover:bg-red-600 text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <span className="relative z-10">{language === 'ar' ? 'حسناً، فهمت' : language === 'fr' ? 'D\'accord, j\'ai compris' : 'Understood'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 border border-border-subtle rounded-2xl bg-bg-base/40 shadow-inner p-2 custom-scrollbar">
                  <div className="grid gap-2">
                    {lowStockProductsAlert.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border-subtle hover:border-red-500/30 transition-colors shadow-sm group">
                        <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                          <span className="font-bold text-text-main text-sm group-hover:text-red-500 transition-colors">{p.name}</span>
                          <span className="text-[10px] font-mono text-text-secondary mt-0.5">{p.barcode || `#${p.id.slice(0,8).toUpperCase()}`}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">{language === 'ar' ? 'الكمية' : 'Qty'}</span>
                            <span className={cn("text-lg font-black", p.qty <= 0 ? "text-red-500" : "text-orange-500")}>{p.qty}</span>
                          </div>
                          <div className="h-8 w-px bg-border-subtle mx-2"></div>
                          <div className="flex flex-col items-center opacity-60">
                            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">{language === 'ar' ? 'التنبيه' : 'Min'}</span>
                            <span className="text-sm font-black text-text-secondary">{p.minStock ?? 5}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
