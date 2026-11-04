import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Archive, ArrowRightLeft, FolderOpen, Plus, Minus, Edit2, Trash2, 
  AlertTriangle, Store, X, Package, LayoutGrid, Save, Download, Upload, ArrowUpDown, ChevronDown,
  History, Lock, Sparkles, TrendingUp, Filter, CheckCircle2, ChevronUp, Printer, 
  BarChart3, Boxes, AlertCircle, Coins, ArrowUpRight, Tag, Info
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

interface InventoryProps {
  permissions: any;
  initialTarget?: {
    searchQuery?: string;
    productId?: string;
    autoOpenAdjustment?: boolean;
    autoOpenEdit?: boolean;
  } | null;
  onClearTarget?: () => void;
}

export default function Inventory({ permissions, initialTarget, onClearTarget }: InventoryProps) {
  const { products, categories, suppliers, appUsers, fetchData: onRefresh, setMessage } = useStore();
  const { language, user } = useAuthStore();
  const profile = appUsers?.find((u: any) => u.id === (user?.id || (user as any)?.uid));
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || profile?.role === 'admin' || profile?.role === 'manager';
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

  // --- Double-Submit Protections ---
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

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

  // --- Panels & Toggles ---
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // --- Low Stock Alert State ---
  const [hasDismissedLowStock, setHasDismissedLowStock] = useState(false);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'zero' | 'low'>('all');

  const lowStockProductsAlert = useMemo(() => {
    return products.filter(p => p.qty <= (p.minStock ?? 5));
  }, [products]);

  const zeroStockProducts = useMemo(() => {
    return lowStockProductsAlert.filter(p => p.qty <= 0);
  }, [lowStockProductsAlert]);

  const criticalStockProducts = useMemo(() => {
    return lowStockProductsAlert.filter(p => p.qty > 0 && p.qty <= (p.minStock ?? 5));
  }, [lowStockProductsAlert]);

  const filteredAlertProducts = useMemo(() => {
    return lowStockProductsAlert.filter(p => {
      const matchFilter = alertFilter === 'all' 
        ? true 
        : alertFilter === 'zero' 
          ? p.qty <= 0 
          : (p.qty > 0 && p.qty <= (p.minStock ?? 5));
      const q = alertSearch.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [lowStockProductsAlert, alertFilter, alertSearch]);

  const showLowStockAlert = lowStockProductsAlert.length > 0 && !hasDismissedLowStock;

  // Stock KPI Stats
  const stockStats = useMemo(() => {
    const totalRefs = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
    const totalRetailValue = products.reduce((acc, p) => acc + ((Number(p.qty) || 0) * (Number(p.price) || 0)), 0);
    const totalCostValue = products.reduce((acc, p) => acc + ((Number(p.qty) || 0) * (Number(p.costPrice) || 0)), 0);
    return {
      totalRefs,
      totalUnits,
      totalRetailValue,
      totalCostValue,
      outOfStockCount: zeroStockProducts.length,
      lowStockCount: criticalStockProducts.length
    };
  }, [products, zeroStockProducts, criticalStockProducts]);

  const exportLowStockCSV = () => {
    const headers = language === 'ar'
      ? ['المنتج', 'الباركود', 'الفئة', 'الكمية الحالية', 'الحد الأدنى', 'المورد']
      : ['Nom', 'Code-barres', 'Catégorie', 'Qté Actuelle', 'Seuil Min', 'Fournisseur'];
    const rows = lowStockProductsAlert.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.barcode ? `"${p.barcode}"` : '',
      `"${categories.find(c => c.id === p.categoryId)?.name || ''}"`,
      p.qty,
      p.minStock || 5,
      p.supplier ? `"${p.supplier}"` : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `ruptures_stock_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- External Target Focus (from Notifications) ---
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTarget) return;

    if (initialTarget.searchQuery) {
      setSearchQuery(initialTarget.searchQuery);
      setFilterCategoryId('');
      setFilterStockStatus('all');
      setShowGrouped(false);
    }

    if (initialTarget.productId) {
      if (products.length === 0) return; // Wait until products are loaded

      setHighlightedProductId(initialTarget.productId);
      const timer = setTimeout(() => {
        setHighlightedProductId(null);
      }, 6000);

      const prod = products.find(p => p.id === initialTarget.productId);
      if (prod) {
        if (initialTarget.autoOpenAdjustment && permissions.editStock) {
          setAdjProduct(prod);
          setAdjCostPrice(prod.costPrice?.toString() || '0');
          setAdjSupplierId(prod.supplierId || '');
          setAdjType('in');
          setShowAdjModal(true);
        } else if (initialTarget.autoOpenEdit && permissions.editStock) {
          startEditing(prod);
        }
      }
      onClearTarget?.();
      return () => clearTimeout(timer);
    } else {
      onClearTarget?.();
    }
  }, [initialTarget, products, permissions.editStock]);

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

  const resetAddProductForm = () => {
    setName('');
    setPrice('');
    setCostPrice('');
    setQty('');
    setBarcode('');
    setMinStock('5');
    setCategoryId('');
    setSupplier('');
  };

  const handleCloseAddProduct = () => {
    setShowAddProduct(false);
    resetAddProductForm();
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setBarcode(`${timestamp}${random}`);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال اسم المنتج." : language === 'fr' ? "Veuillez saisir le nom du produit." : "Please enter product name.", 
        type: 'error' 
      });
      return;
    }
    const parsedPrice = parseFloat(String(price).replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال سعر بيع صحيح أكبر من 0." : language === 'fr' ? "Veuillez saisir un prix de vente valide (> 0)." : "Please enter a valid selling price (> 0).", 
        type: 'error' 
      });
      return;
    }
    const parsedCost = costPrice !== '' ? parseFloat(String(costPrice).replace(',', '.')) : 0;
    if (isNaN(parsedCost) || parsedCost < 0) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال سعر شراء صحيح أكبر من أو يساوي 0." : language === 'fr' ? "Veuillez saisir un prix d'achat valide (≥ 0)." : "Please enter a valid cost price (≥ 0).", 
        type: 'error' 
      });
      return;
    }
    const parsedQty = qty === '' || isNaN(parseFloat(String(qty).replace(',', '.'))) ? 0 : parseFloat(String(qty).replace(',', '.'));
    const parsedMinStock = minStock === '' || isNaN(parseFloat(String(minStock).replace(',', '.'))) ? 5 : parseFloat(String(minStock).replace(',', '.'));

    if (isAddingProduct) return;
    setIsAddingProduct(true);
    try {
      await api.addProduct({
        name: name.trim(),
        price: parsedPrice,
        costPrice: parsedCost,
        qty: parsedQty,
        minStock: parsedMinStock,
        barcode: barcode?.trim() || null,
        categoryId: categoryId || null,
        supplier: supplier || null,
        supplierId: suppliers.find(s => s.name === supplier)?.id || null,
        actor: user?.username || 'system'
      });
      resetAddProductForm();
      setShowAddProduct(false);
      setMessage({ 
        text: language === 'ar' ? "تمت إضافة المنتج بنجاح." : language === 'fr' ? "Produit ajouté avec succès au catalogue." : "Product added to inventory.", 
        type: 'success' 
      });
      onRefresh();
    } catch (err: any) {
      setMessage({ 
        text: `${language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed'}: ${err.message || 'Erreur'}`, 
        type: 'error' 
      });
    } finally {
      setIsAddingProduct(false);
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
    if (!editingProduct || isUpdatingProduct) return;

    if (!editForm.name || !editForm.name.trim()) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال اسم المنتج." : language === 'fr' ? "Veuillez saisir le nom du produit." : "Please enter product name.", 
        type: 'error' 
      });
      return;
    }

    const parsedPrice = parseFloat(String(editForm.price ?? '').replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال سعر بيع صحيح أكبر من أو يساوي 0." : language === 'fr' ? "Veuillez saisir un prix de vente valide (≥ 0)." : "Please enter a valid selling price (≥ 0).", 
        type: 'error' 
      });
      return;
    }

    const parsedCost = editForm.costPrice !== undefined && editForm.costPrice !== ''
      ? parseFloat(String(editForm.costPrice).replace(',', '.'))
      : 0;
    if (isNaN(parsedCost) || parsedCost < 0) {
      setMessage({ 
        text: language === 'ar' ? "يرجى إدخال سعر شراء صحيح أكبر من أو يساوي 0." : language === 'fr' ? "Veuillez saisir un prix d'achat valide (≥ 0)." : "Please enter a valid cost price (≥ 0).", 
        type: 'error' 
      });
      return;
    }

    const parsedQty = parseFloat(String(editForm.qty ?? '0').replace(',', '.'));
    const parsedMinStock = parseFloat(String(editForm.minStock ?? '5').replace(',', '.'));

    setIsUpdatingProduct(true);
    try {
      await api.updateProduct(editingProduct.id, {
        ...editingProduct,
        name: editForm.name.trim(),
        price: parsedPrice,
        costPrice: parsedCost,
        qty: isAdmin ? (isNaN(parsedQty) ? 0 : parsedQty) : (editingProduct.qty || 0),
        minStock: isNaN(parsedMinStock) ? 5 : parsedMinStock,
        barcode: editForm.barcode?.trim() || null,
        categoryId: editForm.categoryId || null,
        supplier: editForm.supplier || null,
        supplierId: suppliers.find(s => s.name === editForm.supplier)?.id || null,
        actor: user?.username || 'system'
      });
      setEditingProduct(null);
      if (editForm?.name) {
        useStore.setState(state => ({
          notifications: state.notifications.filter(n => !n.message?.includes(editForm.name))
        }));
      }
      setMessage({ text: language === 'ar' ? "تم تحديث المنتج." : language === 'fr' ? "Produit mis à jour." : "Product updated.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setMessage({ text: `${language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed'}: ${err.message || 'Erreur'}`, type: 'error' });
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const startEditing = (p: Product) => {
    setIsUpdatingProduct(false);
    setEditingProduct(p);
    setEditForm({
      name: p.name || '',
      price: (p.price ?? '').toString(),
      costPrice: (p.costPrice ?? 0).toString(),
      qty: (p.qty ?? 0).toString(),
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

      const parsedAdjCost = adjCostPrice ? parseFloat(String(adjCostPrice).replace(',', '.')) : undefined;

      await api.adjustStock(adjProduct.id, {
        type: adjType,
        quantity: parseFloat(String(adjQty).replace(',', '.')),
        reason: finalReason,
        actor: actor,
        supplierId: finalSupplierId || null,
        costPrice: parsedAdjCost
      });
      setShowAdjModal(false);
      if (adjProduct?.name) {
        useStore.setState(state => ({
          notifications: state.notifications.filter(n => !n.message?.includes(adjProduct.name))
        }));
      }
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
    <div className="space-y-6 pb-12 max-w-[1800px] mx-auto px-1 sm:px-2 md:px-4">
      
      {/* --- EXECUTIVE KPI SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total References */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {language === 'ar' ? 'إجمالي المنتجات' : 'Total Références'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-text-main font-mono">{stockStats.totalRefs}</span>
            <span className="text-[11px] font-bold text-text-secondary">articles</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium">
            {formatNumber(stockStats.totalUnits)} unités au dépôt
          </div>
        </div>

        {/* Total Retail Value */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {language === 'ar' ? 'قيمة البيع الإجمالية' : 'Valeur Stock (Vente)'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatNumber(stockStats.totalRetailValue)}
            </span>
            <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium">
            Chiffre d'affaires potentiel
          </div>
        </div>

        {/* Total Cost Value */}
        {permissions.viewCostPrice ? (
          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
                {language === 'ar' ? 'تكلفة الشراء الإجمالية' : 'Valeur d\'Achat (Coût)'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {formatNumber(stockStats.totalCostValue)}
              </span>
              <span className="text-[10px] font-black text-text-secondary">{t.currency}</span>
            </div>
            <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              Marge potentielle: +{stockStats.totalCostValue > 0 ? (((stockStats.totalRetailValue - stockStats.totalCostValue) / stockStats.totalCostValue) * 100).toFixed(1) : 0}%
            </div>
          </div>
        ) : (
          <div className="bg-card p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-text-secondary">
                Catégories Actives
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-text-main font-mono">{categories.length}</span>
              <span className="text-[11px] font-bold text-text-secondary">familles</span>
            </div>
          </div>
        )}

        {/* Stock Alerts */}
        <div 
          onClick={() => setHasDismissedLowStock(false)}
          className="bg-card p-4 sm:p-5 rounded-2xl border border-red-500/30 shadow-xs relative overflow-hidden group hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {language === 'ar' ? 'تنبيهات المخزون' : 'Alertes & Ruptures'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-red-600 font-mono">
              {lowStockProductsAlert.length}
            </span>
            <span className="text-[11px] font-bold text-red-500/80">articles critiques</span>
          </div>
          <div className="mt-1 text-[10px] text-text-secondary font-medium flex items-center gap-2">
            <span className="text-red-600 font-bold">{stockStats.outOfStockCount} épuisés</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{stockStats.lowStockCount} faibles</span>
            <span className="underline ml-auto text-accent">Voir</span>
          </div>
        </div>
      </div>

      {/* --- ACTION BAR (QUICK TOGGLES & TOOLS) --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border-subtle shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add Product Button (Opens Executive Modal) */}
          <button 
            type="button"
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-accent hover:bg-accent/90 text-white shadow-md shadow-accent/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{t.addProduct}</span>
          </button>

          {/* Toggle Categories */}
          <button 
            type="button"
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs",
              showCategoryManager 
                ? "bg-accent text-white shadow-md shadow-accent/25" 
                : "bg-bg-base hover:bg-bg-base/80 text-text-main border border-border-subtle"
            )}
          >
            <FolderOpen className="w-4 h-4 text-accent" />
            <span>{t.categories} ({categories.length})</span>
          </button>

          {/* View Low Stock Alert button */}
          {lowStockProductsAlert.length > 0 && (
            <button
              type="button"
              onClick={() => setHasDismissedLowStock(false)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>{language === 'ar' ? 'قائمة النواقص' : 'Alertes'} ({lowStockProductsAlert.length})</span>
            </button>
          )}
        </div>

        {/* Right actions: Export / Import / View Mode */}
        <div className="flex items-center gap-2">
          {/* CSV Tools */}
          <div className="flex bg-bg-base border border-border-subtle rounded-xl overflow-hidden shadow-2xs">
            <button 
              onClick={exportToCSV} 
              className="px-3.5 py-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-main hover:bg-card transition-colors border-r border-border-subtle cursor-pointer"
              title="Exporter tout en CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{language === 'ar' ? "تصدير" : "Exporter"}</span>
            </button>
            <label className={cn("px-3.5 py-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-main hover:bg-card transition-colors cursor-pointer", isImporting && "opacity-50 pointer-events-none")}>
              <Upload className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">{isImporting ? "..." : (language === 'ar' ? "استيراد" : "Importer")}</span>
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
            </label>
          </div>

          <button 
            onClick={() => setShowGrouped(!showGrouped)} 
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-2xs flex items-center gap-1.5 cursor-pointer", 
              showGrouped ? "bg-accent text-white border-accent" : "bg-bg-base text-text-secondary border-border-subtle hover:bg-card"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{showGrouped ? "Vue Liste" : "Par Catégorie"}</span>
          </button>
        </div>
      </div>



      {/* --- COLLAPSIBLE: CATEGORIES MANAGEMENT PANEL --- */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <section className="bg-card border-2 border-border-subtle p-6 sm:p-8 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-text-main tracking-tight uppercase">
                      Gestion des Catégories ({categories.length})
                    </h3>
                    <p className="text-xs text-text-secondary">Organisez vos familles d'articles (Pompage, Tuyauterie, Solaire, Raccords...)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCategoryManager(false)}
                  className="p-2 rounded-xl hover:bg-bg-base text-text-secondary hover:text-text-main transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Add Category Form */}
                <form onSubmit={addCategory} className="lg:col-span-4 space-y-4 bg-bg-base/40 p-5 rounded-2xl border border-border-subtle">
                  <label className="text-[11px] uppercase font-black text-text-secondary block">
                    {t.addCategory}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      placeholder="Nom de la catégorie" 
                      className="w-full bg-card border border-border-subtle rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none" 
                      value={newCategoryName || ''} 
                      onChange={e => setNewCategoryName(e.target.value)} 
                    />
                    <button 
                      type="submit" 
                      className="bg-accent text-white px-5 py-2.5 font-black rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                    >
                      {t.save}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={seedDefaults} 
                    className="w-full text-center text-[10px] font-black text-accent hover:underline uppercase tracking-wider py-1 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'ar' ? "إعداد افتراضي" : "CONFIG PAR DÉFAUT"}</span>
                  </button>
                </form>

                {/* Categories Pills */}
                <div className="lg:col-span-8 space-y-2">
                  <span className="text-[11px] uppercase font-black text-text-secondary block">
                    Catégories existantes & Références associées
                  </span>
                  <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {(categories || []).map(c => {
                      const count = products.filter(p => p.categoryId === c.id).length;
                      return (
                        <div 
                          key={c.id} 
                          className="group/cat flex items-center gap-2 bg-card border border-border-subtle px-3.5 py-2 rounded-xl text-xs font-bold text-text-main hover:border-accent/50 shadow-2xs transition-all"
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bg-base text-text-secondary font-black">
                            {count}
                          </span>
                          <button 
                            type="button"
                            onClick={() => deleteCategory(c.id)} 
                            className="text-text-secondary hover:text-danger opacity-0 group-hover/cat:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            title="Supprimer la catégorie"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- INVENTORY LIST SECTION --- */}
      <div className="space-y-4">
        {/* Search, Status Tabs & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border-subtle shadow-xs">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-xl group">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors", language === 'ar' ? 'right-3.5' : 'left-3.5')} />
            <input 
              type="text"
              placeholder={language === 'ar' ? "بحث باسم المنتج، الباركود، المورد..." : "Rechercher par nom, code-barres, fournisseur..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn("w-full bg-bg-base/70 hover:bg-bg-base border border-border-subtle rounded-xl py-2.5 text-sm font-bold text-text-main focus:border-accent outline-none transition-all shadow-2xs", language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4')}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-text-secondary hover:text-text-main p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* Status Segmented Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-1 bg-bg-base rounded-xl border border-border-subtle">
              {(['all', 'inStock', 'lowStock', 'outOfStock'] as const).map(status => {
                const label = status === 'all' 
                  ? (language === 'ar' ? 'الكل' : 'Tous') 
                  : status === 'inStock' 
                    ? t.inStock 
                    : status === 'lowStock' 
                      ? t.lowStock 
                      : t.outOfStock;
                const count = status === 'all' 
                  ? products.length 
                  : status === 'inStock' 
                    ? products.filter(p => p.qty > (p.minStock ?? 5)).length 
                    : status === 'lowStock' 
                      ? criticalStockProducts.length 
                      : zeroStockProducts.length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStockStatus(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                      filterStockStatus === status 
                        ? "bg-card text-text-main shadow-xs border border-border-subtle" 
                        : "text-text-secondary hover:text-text-main"
                    )}
                  >
                    <span>{label}</span>
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold",
                      status === 'outOfStock' && count > 0 ? "bg-red-500/10 text-red-600" : "bg-bg-base text-text-secondary"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Select */}
            <select 
              className={cn("bg-bg-base border border-border-subtle rounded-xl px-3.5 py-2 text-xs focus:border-accent outline-none font-bold shadow-2xs text-text-main cursor-pointer", language === 'ar' && "text-right")} 
              value={filterCategoryId} 
              onChange={e => setFilterCategoryId(e.target.value)}
            >
              <option value="">{t.allCategories} ({categories.length})</option>
              <option value="none">{t.noCategory}</option>
              {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
                              {permissions.viewCostPrice && p.lots && p.lots.length > 0 && (() => {
                                const olderLots = p.lots.filter(l => Number(l.qty) > 0 && Math.abs(Number(l.costPrice) - Number(p.costPrice || 0)) > 0.001);
                                if (olderLots.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {olderLots.map((lot, idx) => (
                                      <span key={lot.id || idx} className="inline-flex items-center gap-1 text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded shadow-xs" title={`Lot #${(lot.id || '').slice(0, 6)}`}>
                                        <span>⚠️ {language === 'ar' ? `باقي ${lot.qty} حبة مشريّة بـ` : language === 'fr' ? `Reste ${lot.qty} unités à` : `Remaining ${lot.qty} @`}</span>
                                        <span className="font-black underline">{formatNumber(lot.costPrice)} {t.currency}</span>
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
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
                        "border-b border-border-subtle last:border-0 transition-all duration-300 group text-[13px]",
                        highlightedProductId === p.id 
                          ? "ring-2 ring-accent bg-accent/20 dark:bg-accent/30 shadow-md font-bold" 
                          : p.qty === 0 
                            ? "bg-red-50/30 hover:bg-red-50/50 dark:bg-red-900/10 dark:hover:bg-red-900/20" 
                            : p.qty <= (p.minStock ?? 5) 
                              ? "bg-orange-50/30 hover:bg-orange-50/50 dark:bg-orange-900/10 dark:hover:bg-orange-900/20" 
                              : "hover:bg-bg-base/30"
                      )}>
                        <td className="p-4">
                          <div className="font-semibold text-text-main">{p.name}</div>
                          <div className="text-[10px] text-text-secondary font-mono flex items-center gap-2 mt-1 flex-wrap">
                            {p.barcode ? <span>{p.barcode}</span> : <span>#{p.id.slice(0, 8).toUpperCase()}</span>}
                            {category && <span className="opacity-70 text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded">• {category.name}</span>}
                          </div>
                          {permissions.viewCostPrice && p.lots && p.lots.length > 0 && (() => {
                            const olderLots = p.lots.filter(l => Number(l.qty) > 0 && Math.abs(Number(l.costPrice) - Number(p.costPrice || 0)) > 0.001);
                            if (olderLots.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {olderLots.map((lot, idx) => (
                                  <span key={lot.id || idx} className="inline-flex items-center gap-1.5 text-[10px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-lg shadow-xs" title={`Lot #${(lot.id || '').slice(0, 6)} - ${language === 'ar' ? 'دفعة سابقة' : 'Ancien lot'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>{language === 'ar' ? `باقي ${lot.qty} حبة مشريّة بـ` : language === 'fr' ? `Reste ${lot.qty} unités à` : `Remaining ${lot.qty} @`}</span>
                                    <span className="font-black text-amber-900 dark:text-amber-200 underline">{formatNumber(lot.costPrice)} {t.currency}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        {permissions.viewCostPrice && (
                          <td className="p-4 text-text-secondary font-mono font-medium">
                            {formatNumber(p.costPrice || 0)} <span className="text-[10px] opacity-70">{t.currency}</span>
                          </td>
                        )}
                        <td className="p-4">
                          <div className="font-bold text-text-main font-mono text-sm">
                            {formatNumber(p.price)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                          </div>
                          {permissions.viewCostPrice && p.costPrice && Number(p.costPrice) > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              +{(((Number(p.price) - Number(p.costPrice)) / Number(p.costPrice)) * 100).toFixed(0)}% marge
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {permissions.editStock ? (
                              <div className="inline-flex items-center bg-bg-base/80 p-0.5 rounded-xl border border-border-subtle shadow-2xs">
                                <button 
                                  onClick={() => updateStock(p.id, p.qty - 1)} 
                                  className="w-6 h-6 rounded-lg bg-card hover:bg-red-500/10 hover:text-red-500 text-text-secondary flex items-center justify-center font-black transition-all cursor-pointer"
                                  title="Diminuer de 1"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={cn(
                                  "px-2.5 font-mono font-black text-xs text-center min-w-[42px]", 
                                  p.qty <= 0 ? "text-red-600 dark:text-red-400" : p.qty <= (p.minStock ?? 5) ? "text-amber-600 dark:text-amber-400" : "text-text-main"
                                )}>
                                  {formatNumber(p.qty)}
                                </span>
                                <button 
                                  onClick={() => updateStock(p.id, p.qty + 1)} 
                                  className="w-6 h-6 rounded-lg bg-card hover:bg-emerald-500/10 hover:text-emerald-500 text-text-secondary flex items-center justify-center font-black transition-all cursor-pointer"
                                  title="Augmenter de 1"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className={cn("font-bold font-mono text-sm", p.qty <= (p.minStock ?? 5) ? "text-danger" : "text-text-main")}>{formatNumber(p.qty)}</span>
                            )}

                            {permissions.editStock && (
                              <button 
                                onClick={() => {
                                  setAdjProduct(p); setAdjCostPrice(p.costPrice?.toString() || '0'); setAdjSupplierId(p.supplierId || '');
                                  setShowAdjModal(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title={t.stockAdjustment}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {p.qty <= (p.minStock ?? 5) && (
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border", 
                                p.qty === 0 
                                  ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800" 
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"
                              )}>
                                {p.qty === 0 ? (language === 'ar' ? 'نفذت' : 'Rupture') : (language === 'ar' ? 'منخفض' : `Faible (≤${p.minStock ?? 5})`)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-text-main font-mono">
                          {p.soldQty || 0}
                        </td>
                        <td className="p-4">
                          {p.supplier ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-secondary bg-bg-base/80 px-2 py-0.5 rounded-md border border-border-subtle">
                              <Store className="w-3 h-3 text-accent" />
                              {p.supplier}
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-secondary/50">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => viewProductHistory(p)} 
                              className="text-text-secondary hover:bg-blue-500/10 hover:text-blue-600 p-2 rounded-xl transition-colors cursor-pointer" 
                              title={language === 'ar' ? 'سجل حركة المنتج' : 'Historique des mouvements'}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => startEditing(p)} 
                              className="text-text-secondary hover:bg-accent/10 hover:text-accent p-2 rounded-xl transition-colors cursor-pointer" 
                              title={language === 'ar' ? 'تعديل المنتج' : 'Modifier'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف المنتج؟' : language === 'fr' ? 'Supprimer ce produit du stock ?' : 'Remove product from inventory?')) {
                                  try { await api.deleteProduct(p.id); setMessage({ text: language === 'ar' ? "تم الحذف." : "Product removed.", type: 'success' }); onRefresh(); } 
                                  catch (err) { setMessage({ text: language === 'ar' ? "فشل الحذف." : "Delete failed.", type: 'error' }); }
                                }
                              }} 
                              className="text-text-secondary hover:bg-danger/10 hover:text-danger p-2 rounded-xl transition-colors cursor-pointer" 
                              title="Supprimer"
                            >
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
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* ========================================================================= */}
        {/* --- MODAL: AJOUTER UN PRODUIT (EXECUTIVE DESIGN) --- */}
        {/* ========================================================================= */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-card border-2 border-accent/40 rounded-3xl w-full max-w-3xl my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-accent/5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/25 shrink-0">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-text-main tracking-tight uppercase flex items-center gap-2">
                      <span>{t.addProduct}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 lowercase">
                        nouveau
                      </span>
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {language === 'ar' 
                        ? 'إضافة مرجع جديد مع تحديد سعر الشراء، البيع والمخزون'
                        : 'Enregistrez une nouvelle référence dans le catalogue du magasin'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddProduct}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={addProduct} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                  
                  {/* --- SECTION 1: INFORMATIONS GÉNÉRALES --- */}
                  <div className="bg-bg-base/50 p-4 sm:p-5 rounded-2xl border border-border-subtle space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Boxes className="w-4 h-4" />
                        1. {language === 'ar' ? 'معلومات المنتج' : 'Informations Générales'}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        * {language === 'ar' ? 'حقول إلزامية' : 'Champs requis'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-accent" />
                          <span>{t.productName} *</span>
                        </label>
                        <input
                          autoFocus
                          type="text"
                          required
                          placeholder="Ex: POMPE IMMERGEE 10/10 2HP - 380V..."
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-card border-2 border-border-subtle focus:border-accent rounded-xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-text-secondary/40 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-accent" />
                            <span>{t.category}</span>
                          </label>
                        </div>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className={cn(
                            "w-full bg-card border border-border-subtle focus:border-accent rounded-xl px-4 py-2.5 text-sm font-bold text-text-main outline-none transition-all shadow-2xs cursor-pointer",
                            language === 'ar' && "text-right"
                          )}
                        >
                          <option value="">{t.noCategory}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Supplier */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-accent" />
                            <span>{t.supplier}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowQuickSupplierModal(true)}
                            className="text-accent hover:underline text-[10px] font-black cursor-pointer flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{language === 'ar' ? 'مورد جديد' : 'Nouveau'}</span>
                          </button>
                        </div>
                        <select
                          value={supplier}
                          onChange={(e) => setSupplier(e.target.value)}
                          className={cn(
                            "w-full bg-card border border-border-subtle focus:border-accent rounded-xl px-4 py-2.5 text-sm font-bold text-text-main outline-none transition-all shadow-2xs cursor-pointer",
                            language === 'ar' && "text-right"
                          )}
                        >
                          <option value="">{language === 'ar' ? 'اختر مورد...' : 'Sélectionner Fournisseur...'}</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Barcode / Ref */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-accent" />
                            <span>{t.barcode} (Optionnel)</span>
                          </label>
                          <button
                            type="button"
                            onClick={generateBarcode}
                            className="text-[10px] font-black uppercase text-accent hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{language === 'ar' ? 'توليد كود تلقائي' : 'Générer Auto'}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 611123456789 ou laissez vide"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          className="w-full bg-card border border-border-subtle focus:border-accent rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-text-main placeholder:text-text-secondary/40 outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* --- SECTION 2: TARIFICATION & RENTABILITÉ --- */}
                  <div className="bg-bg-base/50 p-4 sm:p-5 rounded-2xl border border-border-subtle space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      2. {language === 'ar' ? 'التسعير والأرباح' : 'Tarification & Rentabilité'}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Cost Price */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-purple-500" />
                          <span>{t.costPrice} (Prix Achat HT)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            className="w-full bg-card border border-border-subtle focus:border-purple-500 rounded-xl px-4 py-2.5 pr-12 text-sm font-mono font-bold text-text-main outline-none transition-all shadow-2xs"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                            DH
                          </span>
                        </div>
                      </div>

                      {/* Selling Price */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.price} (Prix de Vente) *</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-card border-2 border-emerald-500/40 focus:border-emerald-500 rounded-xl px-4 py-2.5 pr-12 text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 outline-none transition-all shadow-2xs"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                            DH
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Financial Margin Calculation */}
                    {price && parseFloat(price) > 0 && (
                      <div className="p-3.5 rounded-xl border transition-all text-xs font-bold flex flex-wrap items-center justify-between gap-3 bg-card shadow-2xs">
                        {costPrice && parseFloat(costPrice) > 0 ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center font-black",
                                parseFloat(price) >= parseFloat(costPrice)
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-500/15 text-red-600"
                              )}>
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-text-secondary">
                                  {language === 'ar' ? 'هامش الربح المتوقع' : 'Marge Commerciale'}
                                </span>
                                <span className={cn(
                                  "font-black text-sm font-mono",
                                  parseFloat(price) >= parseFloat(costPrice) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
                                )}>
                                  {parseFloat(price) >= parseFloat(costPrice) ? '+' : ''}
                                  {formatNumber(parseFloat(price) - parseFloat(costPrice))} DH <span className="text-[11px] text-text-secondary font-medium">/ unité</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black font-mono shadow-2xs uppercase tracking-wider",
                                parseFloat(price) >= parseFloat(costPrice)
                                  ? "bg-emerald-600 text-white"
                                  : "bg-red-600 text-white"
                              )}>
                                {parseFloat(price) >= parseFloat(costPrice) ? '+' : ''}
                                {(((parseFloat(price) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)}% Marge
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-text-secondary text-[11px]">
                            <Info className="w-4 h-4 text-accent" />
                            <span>
                              {language === 'ar' 
                                ? 'أدخل سعر الشراء أعلاه لاحتساب هامش الربح والنسبة المئوية تلقائياً.' 
                                : 'Saisissez le prix d\'achat pour visualiser la rentabilité et la marge nette unitaire.'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* --- SECTION 3: STOCK & SEUIL D'ALERTE --- */}
                  <div className="bg-bg-base/50 p-4 sm:p-5 rounded-2xl border border-border-subtle space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      3. {language === 'ar' ? 'المخزون والتنبيه' : 'Stock Initial & Seuil Critique'}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Initial Qty */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-black text-text-secondary">
                          {t.qty} ({language === 'ar' ? 'المخزون الأولي' : 'Stock Initial'})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          disabled={!permissions.editStock}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          className="w-full bg-card border border-border-subtle focus:border-accent rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-text-main outline-none disabled:opacity-50 transition-all shadow-2xs"
                        />
                        <p className="text-[10px] text-text-secondary">
                          {language === 'ar' ? 'اتركه فارغاً أو 0 إذا لم يكن متوفراً حالياً' : 'Laissez vide ou 0 si aucun stock actuel'}
                        </p>
                      </div>

                      {/* Min Stock Alert */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] uppercase font-black text-text-secondary flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>{t.minStock} (Alerte Rupture)</span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="5"
                          value={minStock}
                          onChange={(e) => setMinStock(e.target.value)}
                          className="w-full bg-card border border-border-subtle focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-text-main outline-none transition-all shadow-2xs"
                        />
                        <p className="text-[10px] text-text-secondary">
                          {language === 'ar' ? 'إشعار فوري عند انخفاض المخزون إلى هذا الحد' : 'Déclenche l\'alerte rouge dès que le stock atteint ce niveau'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-6 border-t border-border-subtle bg-bg-base/80 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseAddProduct}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border-subtle bg-card hover:bg-bg-base text-text-secondary hover:text-text-main text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {t.cancel}
                  </button>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="submit"
                      disabled={isAddingProduct}
                      className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-accent/25 active:scale-[0.99] text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isAddingProduct ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{language === 'ar' ? 'جاري الإضافة...' : 'Enregistrement...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{language === 'ar' ? 'حفظ وإضافة للمخزون' : 'Enregistrer le Produit'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Adjustment Modal */}
        {showAdjModal && adjProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-card border border-border-subtle rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-text-main tracking-tight">{t.stockAdjustment}</h3>
                <div className="flex items-center gap-2">
                  {permissions.editStock && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const p = adjProduct;
                        setShowAdjModal(false);
                        startEditing(p);
                      }}
                      className="text-[10px] font-bold text-accent bg-accent/10 hover:bg-accent hover:text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                      title={language === 'ar' ? "تعديل بيانات المنتج" : language === 'fr' ? "Modifier les détails du produit" : "Edit product details"}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{language === 'ar' ? "تعديل المنتج" : language === 'fr' ? "Modifier" : "Edit"}</span>
                    </button>
                  )}
                  <button onClick={() => setShowAdjModal(false)} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
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
                <button onClick={() => { setEditingProduct(null); setIsUpdatingProduct(false); }} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <form onSubmit={handleUpdateProduct} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.productName}</label>
                    <input required className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.price}</label>
                    <input required type="number" step="any" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.price ?? ''} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                  </div>
                  {permissions.viewCostPrice && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">{t.costPrice}</label>
                      <input type="number" step="any" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent" value={editForm.costPrice ?? ''} onChange={e => setEditForm({...editForm, costPrice: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.qty}</label>
                      {!isAdmin && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          {language === 'ar' ? 'خاص بالمسؤول' : language === 'fr' ? 'Admin uniquement' : 'Admin only'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        required 
                        type="number" 
                        disabled={!isAdmin} 
                        className={cn(
                          "w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-text-main font-bold outline-none focus:border-accent disabled:cursor-not-allowed",
                          !isAdmin && "opacity-60 bg-slate-100/70 dark:bg-slate-900/50 pr-9"
                        )} 
                        value={editForm.qty || ''} 
                        onChange={e => setEditForm({...editForm, qty: e.target.value})} 
                      />
                      {!isAdmin && (
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-secondary/50">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                    </div>
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
                <button type="submit" disabled={isUpdatingProduct} className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-xl shadow-accent/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-sm mt-4 flex items-center justify-center gap-2">
                  {isUpdatingProduct ? (language === 'ar' ? "جاري الحفظ..." : language === 'fr' ? "Enregistrement..." : "Saving...") : t.saveChanges}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Quick Supplier Modal */}
        {showQuickSupplierModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[140] flex items-center justify-center p-4">
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="bg-card border-2 border-red-500/40 rounded-3xl p-5 sm:p-7 w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col relative overflow-hidden"
            >
              {/* Header */}
              <div className="pb-5 border-b border-border-subtle shrink-0 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-red-600 dark:text-red-400 tracking-tight uppercase">
                          {language === 'ar' ? 'تنبيه نفاذ المخزون والحد الأدنى' : 'Alerte Ruptures & Réapprovisionnement'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500 text-white shadow-xs">
                          {lowStockProductsAlert.length}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary font-medium mt-0.5">
                        {language === 'ar'
                          ? 'المنتجات التالية نفذت أو قاربت على النفاد، يرجى التنسيق مع الموردين.'
                          : 'Ces articles ont atteint ou dépassé le seuil minimum d\'alerte. Commande fournisseur recommandée.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={exportLowStockCSV}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-bg-base hover:bg-card border border-border-subtle text-text-main flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      title="Exporter la liste pour les fournisseurs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'ar' ? 'تصدير الطلبية' : 'Exporter CSV'}</span>
                    </button>
                    <button 
                      onClick={() => setHasDismissedLowStock(true)}
                      className="p-2 rounded-xl text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar inside Alert Modal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Search inside modal */}
                  <div className="relative flex-1 group">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-3.5 h-3.5 text-text-secondary group-focus-within:text-red-500" />
                    <input 
                      type="text" 
                      placeholder={language === 'ar' ? 'بحث في المنتجات الناقصة...' : 'Filtrer les produits critiques...'} 
                      value={alertSearch} 
                      onChange={e => setAlertSearch(e.target.value)}
                      className="w-full bg-bg-base/70 hover:bg-bg-base border border-border-subtle focus:border-red-500 rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-text-main outline-none transition-all"
                    />
                    {alertSearch && (
                      <button onClick={() => setAlertSearch('')} className="absolute top-1/2 -translate-y-1/2 right-2.5 text-text-secondary hover:text-text-main p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-bg-base rounded-xl border border-border-subtle shrink-0">
                    <button 
                      type="button"
                      onClick={() => setAlertFilter('all')}
                      className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all", alertFilter === 'all' ? "bg-card text-text-main shadow-2xs" : "text-text-secondary")}
                    >
                      Tous ({lowStockProductsAlert.length})
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAlertFilter('zero')}
                      className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1", alertFilter === 'zero' ? "bg-red-500 text-white shadow-2xs" : "text-red-600")}
                    >
                      <span>Rupture (0)</span>
                      <span className="font-mono">({zeroStockProducts.length})</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAlertFilter('low')}
                      className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1", alertFilter === 'low' ? "bg-amber-500 text-white shadow-2xs" : "text-amber-600")}
                    >
                      <span>Critique (≤ Min)</span>
                      <span className="font-mono">({criticalStockProducts.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Products List */}
              <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-2.5 custom-scrollbar pr-1 my-2">
                {filteredAlertProducts.length === 0 ? (
                  <div className="py-12 text-center text-text-secondary">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
                    <p className="font-bold text-xs">Aucun article ne correspond aux critères de recherche.</p>
                  </div>
                ) : (
                  filteredAlertProducts.map(p => {
                    const category = categories.find(c => c.id === p.categoryId);
                    const min = p.minStock ?? 5;
                    const percent = Math.min(100, Math.max(0, (p.qty / min) * 100));
                    const isZero = p.qty <= 0;

                    return (
                      <div 
                        key={p.id} 
                        className={cn(
                          "p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group",
                          isZero 
                            ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 hover:border-red-500/50" 
                            : "bg-amber-50/30 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/40 hover:border-amber-500/50"
                        )}
                      >
                        {/* Left: Product Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-text-main text-sm group-hover:text-red-600 transition-colors">
                              {p.name}
                            </span>
                            {category && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card text-text-secondary border border-border-subtle">
                                {category.name}
                              </span>
                            )}
                            {p.supplier && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                {p.supplier}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-text-secondary flex items-center gap-3">
                            <span>{p.barcode ? `Code: ${p.barcode}` : `#${p.id.slice(0, 8).toUpperCase()}`}</span>
                            <span>•</span>
                            <span>Prix Vente: <strong>{formatNumber(p.price)} DH</strong></span>
                          </div>
                        </div>

                        {/* Right: Quantity Metrics & Quick Action */}
                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          {/* Stock Status & Progress */}
                          <div className="flex flex-col items-end min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-base font-black font-mono",
                                isZero ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                              )}>
                                {formatNumber(p.qty)}
                              </span>
                              <span className="text-[10px] font-bold text-text-secondary font-mono">
                                / seuil {min}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                                isZero 
                                  ? "bg-red-500 text-white" 
                                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              )}>
                                {isZero ? 'Rupture' : 'Critique'}
                              </span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-28 h-1.5 bg-border-subtle rounded-full overflow-hidden mt-1.5">
                              <div 
                                className={cn("h-full rounded-full transition-all", isZero ? "w-0 bg-red-500" : "bg-amber-500")}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Adjust Action */}
                          {permissions.editStock && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjProduct(p);
                                setAdjCostPrice(p.costPrice?.toString() || '0');
                                setAdjSupplierId(p.supplierId || '');
                                setShowAdjModal(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                              title="Réapprovisionner le stock immédiatement"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Réapprovisionner</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border-subtle shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-text-secondary font-medium">
                  {lowStockProductsAlert.length} articles au total nécessitant attention
                </span>
                <button 
                  onClick={() => setHasDismissedLowStock(true)}
                  className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-accent/25 active:scale-[0.99] text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'حسناً، فهمت' : 'D\'accord, j\'ai compris'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
