import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Archive,
  ArrowRightLeft,
  CalendarClock,
  Eye,
  CheckCircle2,
  Sparkles,
  UserCog,
  Store,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Printer,
  FileText,
  RefreshCw,
  X,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  Activity,
  CreditCard,
  Cloud,
  Check,
  Copy,
  Tag,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  Undo
} from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Sale, ActivityLog, Payment } from '../types';
import { translations } from '../translations';
import { useStore, useAuthStore } from '../store/useStore';
import { api } from '../services/apiService';
import {
  generateInvoicePDF,
  generateHistoryReportPDF
} from '../services/invoiceService';

const LABELS = {
  ar: {
    historyTitle: "سجل العمليات والأنشطة",
    historySubtitle: "تتبع شامل وفوري لجميع المبيعات، حركات المخزون، وتعديلات الأسعار",
    tabActivities: "سجل الأنشطة",
    tabSales: "سجل المبيعات",
    tabPayments: "سجل المقبوضات",
    kpiTotalOps: "إجمالي العمليات",
    kpiTotalOpsSub: "نشاط مسجل",
    kpiSales: "إجمالي المبيعات",
    kpiSalesSub: "فاتورة منجزة",
    kpiPayments: "المدفوعات المحصلة",
    kpiPaymentsSub: "دفعة نقدية وشيكات",
    kpiStockPricing: "تعديلات المخزون والأسعار",
    kpiStockPricingSub: "حركة وتعديل",
    presetAll: "الكل",
    presetToday: "اليوم",
    presetMonth: "هذا الشهر",
    presetYear: "هذه السنة",
    searchPlaceholder: "بحث في السجلات (رقم الفاتورة، المنتج، المستخدم، التفاصيل...)",
    allUsers: "جميع المستخدمين",
    exportReport: "تحميل التقرير PDF",
    refresh: "تحديث",
    noRecords: "لا توجد سجلات مطابقة",
    noRecordsDesc: "حاول تغيير كلمات البحث أو تعديل الفلترة الزمنية.",
    detailsModalTitle: "تفاصيل العملية",
    actor: "المستخدم",
    timestamp: "التوقيت",
    action: "نوع الإجراء",
    changes: "التغييرات المسجلة",
    property: "الخاصية",
    oldValue: "القيمة السابقة",
    newValue: "القيمة الجديدة",
    printInvoice: "طباعة الفاتورة",
    copyDetails: "نسخ التفاصيل",
    copied: "تم النسخ بنجاح!",
    close: "إغلاق",
    priceChange: "تعديل السعر",
    costChange: "تعديل التكلفة",
    stockIn: "إدخال مخزون",
    stockOut: "إخراج مخزون",
    newSale: "بيع جديد",
    paymentReceived: "دفعة مستلمة",
    userLogin: "تسجيل دخول",
    page: "صفحة",
    of: "من",
    prev: "السابق",
    next: "التالي",
    referenceDate: "المرجع / التاريخ",
    products: "المنتجات",
    amount: "المبلغ",
    actions: "الإجراءات",
    customer: "الزبون",
    paymentMethod: "طريقة الدفع",
    cash: "نقداً",
    check: "شيك",
    allCategories: "جميع العمليات",
    chipSales: "المبيعات",
    chipPayments: "المقبوضات",
    chipStock: "المخزون",
    chipPricing: "الأسعار والتكلفة",
    chipContacts: "الزبائن والموردين",
    chipStaff: "المستخدمين والجلسات",
    chipSystem: "النظام والنسخ",
    rawPayload: "النص الخام للعملية",
    printReceipt: "طباعة الوصل"
  },
  fr: {
    historyTitle: "Journal d'Audit & Historique",
    historySubtitle: "Traçabilité complète en temps réel des ventes, stocks et modifications tarifaires",
    tabActivities: "Journal des Activités",
    tabSales: "Historique des Ventes",
    tabPayments: "Historique des Règlements",
    kpiTotalOps: "Total Opérations",
    kpiTotalOpsSub: "activités enregistrées",
    kpiSales: "Chiffre d'Affaires",
    kpiSalesSub: "factures émises",
    kpiPayments: "Règlements Reçus",
    kpiPaymentsSub: "paiements encaissés",
    kpiStockPricing: "Mouvements & Tarifs",
    kpiStockPricingSub: "ajustements stock & prix",
    presetAll: "Tout",
    presetToday: "Aujourd'hui",
    presetMonth: "Ce Mois",
    presetYear: "Cette Année",
    searchPlaceholder: "Rechercher par N° facture, produit, utilisateur, détail...",
    allUsers: "Tous les intervenants",
    exportReport: "EXPORTER PDF",
    refresh: "Actualiser",
    noRecords: "Aucun enregistrement trouvé",
    noRecordsDesc: "Essayez de modifier votre recherche ou vos filtres de période.",
    detailsModalTitle: "Détails de l'événement",
    actor: "Intervenant",
    timestamp: "Date & Heure",
    action: "Type d'action",
    changes: "Modifications détectées",
    property: "Champ",
    oldValue: "Ancienne valeur",
    newValue: "Nouvelle valeur",
    printInvoice: "Imprimer Facture",
    copyDetails: "Copier les détails",
    copied: "Copié avec succès !",
    close: "Fermer",
    priceChange: "Changement de Prix",
    costChange: "Changement de Coût",
    stockIn: "Entrée Stock",
    stockOut: "Sortie Stock",
    newSale: "Nouvelle Vente",
    paymentReceived: "Règlement Reçu",
    userLogin: "Connexion Session",
    page: "Page",
    of: "sur",
    prev: "Précédent",
    next: "Suivant",
    referenceDate: "RÉFÉRENCE / DATE",
    products: "ARTICLES",
    amount: "MONTANT",
    actions: "ACTIONS",
    customer: "CLIENT",
    paymentMethod: "MODE DE RÈGLEMENT",
    cash: "Espèces",
    check: "Chèque",
    allCategories: "Toutes les activités",
    chipSales: "Ventes",
    chipPayments: "Règlements",
    chipStock: "Mouvements Stock",
    chipPricing: "Prix & Coûts",
    chipContacts: "Clients / Fournisseurs",
    chipStaff: "Personnel & Connexions",
    chipSystem: "Système & Sauvegardes",
    rawPayload: "Détails bruts de l'événement",
    printReceipt: "Imprimer le reçu"
  },
  en: {
    historyTitle: "Audit Log & History",
    historySubtitle: "Comprehensive real-time tracking of sales, inventory movements and price changes",
    tabActivities: "Event Log",
    tabSales: "Sales History",
    tabPayments: "Payment History",
    kpiTotalOps: "Total Events",
    kpiTotalOpsSub: "recorded actions",
    kpiSales: "Sales Revenue",
    kpiSalesSub: "invoices issued",
    kpiPayments: "Payments Collected",
    kpiPaymentsSub: "collected payments",
    kpiStockPricing: "Stock & Pricing",
    kpiStockPricingSub: "stock & price changes",
    presetAll: "All",
    presetToday: "Today",
    presetMonth: "This Month",
    presetYear: "This Year",
    searchPlaceholder: "Search by invoice #, product, user, description...",
    allUsers: "All Users",
    exportReport: "EXPORT PDF",
    refresh: "Refresh",
    noRecords: "No records found",
    noRecordsDesc: "Try adjusting your search terms or date filters.",
    detailsModalTitle: "Event Details",
    actor: "Actor",
    timestamp: "Timestamp",
    action: "Action Type",
    changes: "Detected Changes",
    property: "Field",
    oldValue: "Old Value",
    newValue: "New Value",
    printInvoice: "Print Invoice",
    copyDetails: "Copy Details",
    copied: "Copied successfully!",
    close: "Close",
    priceChange: "Price Change",
    costChange: "Cost Change",
    stockIn: "Stock In",
    stockOut: "Stock Out",
    newSale: "New Sale",
    paymentReceived: "Payment Received",
    userLogin: "User Login",
    page: "Page",
    of: "of",
    prev: "Previous",
    next: "Next",
    referenceDate: "REFERENCE / DATE",
    products: "ITEMS",
    amount: "AMOUNT",
    actions: "ACTIONS",
    customer: "CUSTOMER",
    paymentMethod: "PAYMENT METHOD",
    cash: "Cash",
    check: "Check",
    allCategories: "All Activities",
    chipSales: "Sales",
    chipPayments: "Payments",
    chipStock: "Stock Movements",
    chipPricing: "Pricing & Costs",
    chipContacts: "Clients & Suppliers",
    chipStaff: "Staff & Auth",
    chipSystem: "System & Backups",
    rawPayload: "Raw Event Details",
    printReceipt: "Print Receipt"
  }
};

export default function HistoryView({
  permissions,
  currentUserRole
}: {
  permissions: any;
  currentUserRole?: string;
}) {
  const {
    customers,
    sales,
    payments,
    activities,
    appUsers,
    settings,
    fetchData: onRefresh,
    salesTotal,
    salesPage,
    fetchSalesPage,
    activitiesTotal,
    activitiesPage,
    fetchActivitiesPage
  } = useStore();

  const { language, user: currentUser } = useAuthStore();
  const t = translations[language] || translations.fr;
  const l = LABELS[language] || LABELS.fr;

  // Navigation & Filter States
  const [subView, setSubView] = useState<'activity' | 'sales' | 'payments'>('activity');
  const [timePreset, setTimePreset] = useState<'all' | 'today' | 'month' | 'year'>('month');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchHistory, setSearchHistory] = useState('');
  const [activeChip, setActiveChip] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State for inspecting individual event details
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const canViewAll = currentUserRole === 'admin' || currentUserRole === 'manager' || permissions?.history;

  // Print Invoice helper
  const printInvoice = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const staff = appUsers.find(u => u.id === sale.staffId);

    generateInvoicePDF({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      items: (sale.items || []).map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      clientName: customer?.name || (sale as any).customerName,
      clientPhone: customer?.phone,
      clientAddress: customer?.address,
      staffName: staff?.email || (sale as any).staffName,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);
  };

  const handlePrintInvoiceByNumber = async (invNum: string | number) => {
    const numStr = invNum.toString();
    const foundSale = sales.find(s => s.invoiceNumber?.toString() === numStr || s.id === numStr);
    if (foundSale) {
      printInvoice(foundSale);
      return;
    }
    try {
      const res: any = await api.getSales(1, 10, numStr);
      const saleList = res.data || res || [];
      const targetSale = saleList.find((item: any) => item.invoiceNumber?.toString() === numStr || item.id === numStr);
      if (targetSale) {
        printInvoice(targetSale);
      } else {
        alert(language === 'ar' ? `لم يتم العثور على الفاتورة رقم ${numStr}` : `Facture N° ${numStr} introuvable.`);
      }
    } catch (e) {
      console.error("Error fetching invoice", e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper: Format relative timestamp
  const formatRelativeTime = (timestamp: string) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return language === 'ar' ? 'الآن' : language === 'fr' ? 'À l\'instant' : 'Just now';
    if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} د` : language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return (language === 'ar' ? 'اليوم ' : language === 'fr' ? 'Aujourd\'hui à ' : 'Today at ') +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return (language === 'ar' ? 'أمس ' : language === 'fr' ? 'Hier à ' : 'Yesterday at ') +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Translate details helper & format financial numbers
  const translateActivityDetails = (details: string) => {
    let d = details;
    if (language === 'ar') {
      d = d.replace(/User logged in:/i, 'تسجيل دخول المستخدم:');
      d = d.replace(/Utilisateur connecté :/i, 'تسجيل دخول المستخدم:');
      d = d.replace(/Admin login:/i, 'تسجيل دخول المدير:');
      d = d.replace(/Forced logout from all devices for user:/i, 'تسجيل خروج إجباري من جميع الأجهزة للمستخدم:');
      d = d.replace(/Déconnexion forcée de tous les appareils pour l'utilisateur :/i, 'تسجيل خروج إجباري للمستخدم:');
      d = d.replace(/Created new user:/i, 'تم إنشاء مستخدم جديد:');
      d = d.replace(/Nouvel utilisateur créé :/i, 'تم إنشاء مستخدم جديد:');
      d = d.replace(/Deleted user account:/i, 'تم حذف حساب المستخدم:');
      d = d.replace(/Compte utilisateur supprimé :/i, 'تم حذف حساب المستخدم:');
      d = d.replace(/Added product:/i, 'تمت إضافة منتج:');
      d = d.replace(/Produit ajouté :/i, 'تمت إضافة منتج:');
      d = d.replace(/Updated product:/i, 'تم تحديث منتج:');
      d = d.replace(/Produit mis à jour :/i, 'تم تحديث منتج:');
      d = d.replace(/Updated customer:/i, 'تم تحديث زبون:');
      d = d.replace(/Client mis à jour :/i, 'تم تحديث زبون:');
      d = d.replace(/Updated supplier:/i, 'تم تحديث مورد:');
      d = d.replace(/Fournisseur mis à jour :/i, 'تم تحديث مورد:');
      d = d.replace(/\| Changes:/i, '| التغييرات:');
      d = d.replace(/\| Modifications :/i, '| التغييرات:');
      d = d.replace(/Price:/g, 'السعر:');
      d = d.replace(/Prix :/g, 'السعر:');
      d = d.replace(/Cost:/g, 'التكلفة:');
      d = d.replace(/Coût :/g, 'التكلفة:');
      d = d.replace(/MinStock:/g, 'الحد الأدنى:');
      d = d.replace(/Barcode:/g, 'الباركود:');
      d = d.replace(/Name:/g, 'الاسم:');
      d = d.replace(/Nom :/g, 'الاسم:');
      d = d.replace(/Supplier:/g, 'المورد:');
      d = d.replace(/Category:/g, 'الفئة:');
      d = d.replace(/Phone:/g, 'الهاتف:');
      d = d.replace(/Debt:/g, 'الدين:');
      d = d.replace(/Stock IN:/i, 'إدخال مخزون:');
      d = d.replace(/Stock OUT:/i, 'إخراج مخزون:');
      d = d.replace(/Entrée de stock :/i, 'إدخال مخزون:');
      d = d.replace(/Sortie de stock :/i, 'إخراج مخزون:');
      d = d.replace(/via Fournisseur/i, 'عبر المورد');
      d = d.replace(/via Supplier/i, 'عبر المورد');
      d = d.replace(/Created category:/i, 'تم إنشاء فئة:');
      d = d.replace(/Catégorie créée :/i, 'تم إنشاء فئة:');
      d = d.replace(/Added customer:/i, 'تمت إضافة زبون:');
      d = d.replace(/Client ajouté :/i, 'تمت إضافة زبون:');
      d = d.replace(/Added supplier:/i, 'تمت إضافة مورد:');
      d = d.replace(/Fournisseur ajouté :/i, 'تمت إضافة مورد:');
      d = d.replace(/Payment of/i, 'دفعة بقيمة');
      d = d.replace(/Paiement de/i, 'دفعة بقيمة');
      d = d.replace(/from/i, 'من');
      d = d.replace(/de/i, 'من');
      d = d.replace(/Return of/i, 'إرجاع');
      d = d.replace(/Retour de/i, 'إرجاع');
      d = d.replace(/Value:/i, 'القيمة:');
      d = d.replace(/Valeur :/i, 'القيمة:');
      d = d.replace(/Initial Debt:/i, 'الديون الأولية:');
      d = d.replace(/Dette initiale :/i, 'الديون الأولية:');
      d = d.replace(/Qty:/g, 'الكمية:');
      d = d.replace(/Qté :/g, 'الكمية:');
      d = d.replace(/units/i, 'وحدات');
      d = d.replace(/unités/i, 'وحدات');
      d = d.replace(/New sale #(.*?) - Total:/i, 'عملية بيع جديدة - فاتورة رقم $1 - الإجمالي:');
      d = d.replace(/Nouvelle vente - Facture N° (.*?) - Total :/i, 'عملية بيع جديدة - فاتورة رقم $1 - الإجمالي:');
      d = d.replace(/Added discount of (.*?) to sale #(.*?)$/i, 'إضافة خصم بقيمة $1 للبيع رقم $2');
      d = d.replace(/Remise de (.*?) ajoutée à la facture N° (.*?)$/i, 'إضافة خصم بقيمة $1 للفاتورة رقم $2');
    } else if (language === 'fr') {
      d = d.replace(/User logged in:/i, 'Utilisateur connecté :');
      d = d.replace(/Admin login:/i, 'Connexion admin :');
      d = d.replace(/Forced logout from all devices for user:/i, 'Déconnexion forcée pour l\'utilisateur :');
      d = d.replace(/Created new user:/i, 'Nouvel utilisateur créé :');
      d = d.replace(/Deleted user account:/i, 'Compte utilisateur supprimé :');
      d = d.replace(/Added product:/i, 'Produit ajouté :');
      d = d.replace(/Updated product:/i, 'Produit mis à jour :');
      d = d.replace(/Updated customer:/i, 'Client mis à jour :');
      d = d.replace(/Updated supplier:/i, 'Fournisseur mis à jour :');
      d = d.replace(/Stock IN:/i, 'Entrée de stock :');
      d = d.replace(/Stock OUT:/i, 'Sortie de stock :');
      d = d.replace(/Payment of/i, 'Paiement de');
      d = d.replace(/Return of/i, 'Retour de');
      d = d.replace(/New sale #(.*?) - Total:/i, 'Nouvelle vente - Facture N° $1 - Total :');
      d = d.replace(/Modification \/ Update:/gi, 'Modification :');
    }

    // Standardize financial amounts formatting across all languages (e.g. Total : 62 640.00 DH)
    d = d.replace(/(?:Total|الإجمالي)\s*:\s*([\d.]+)/gi, (match, numStr) => {
      const num = parseFloat(numStr);
      if (isNaN(num)) return match;
      const label = language === 'ar' ? 'الإجمالي' : 'Total';
      return `${label} : ${formatNumber(num)} ${t.currency}`;
    });

    d = d.replace(/(?:Paiement de|Payment of|دفعة بقيمة)\s*([\d.]+)/gi, (match, numStr) => {
      const num = parseFloat(numStr);
      if (isNaN(num)) return match;
      const label = language === 'ar' ? 'دفعة بقيمة' : language === 'en' ? 'Payment of' : 'Paiement de';
      return `${label} ${formatNumber(num)} ${t.currency}`;
    });

    d = d.replace(/(?:Retour de|Return of|إرجاع بقيمة)\s*([\d.]+)/gi, (match, numStr) => {
      const num = parseFloat(numStr);
      if (isNaN(num)) return match;
      const label = language === 'ar' ? 'إرجاع بقيمة' : language === 'en' ? 'Return of' : 'Retour de';
      return `${label} ${formatNumber(num)} ${t.currency}`;
    });

    d = d.replace(/(?:Remise de|Discount of|خصم بقيمة)\s*([\d.]+)/gi, (match, numStr) => {
      const num = parseFloat(numStr);
      if (isNaN(num)) return match;
      const label = language === 'ar' ? 'خصم بقيمة' : language === 'en' ? 'Discount of' : 'Remise de';
      return `${label} ${formatNumber(num)} ${t.currency}`;
    });

    return d;
  };

  // Smart Parser for activity details (extract diffs, product name, invoice #, amounts, etc.)
  const parseActivity = (activity: ActivityLog) => {
    const raw = activity.details || '';
    const action = activity.action;
    const type = activity.type;

    // Detect Product Name
    let productName: string | undefined = undefined;
    const bracketMatch = raw.match(/\[(.*?)\]/);
    if (bracketMatch) {
      productName = bracketMatch[1].trim();
    } else {
      const altProductMatch = raw.match(/(?:Updated product|Produit mis à jour|تم تحديث منتج|Produit ajouté|Added product|تمت إضافة منتج)\s*:\s*([^|(\n]+)/i);
      if (altProductMatch) productName = altProductMatch[1].trim();
    }

    // 1. Detect diff items: e.g. "Prix: 4000->3800" or "Coût: 4100->3400"
    const pairRegex = /([^->\n|:;,]+?)\s*:\s*([^->\n|:;,]+)->([^\s,;|]+)/g;
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    let match;
    while ((match = pairRegex.exec(raw)) !== null) {
      let fieldName = match[1].replace(/Changes/i, '').replace(/Modifications/i, '').trim();
      if (fieldName.includes(']')) {
        fieldName = fieldName.split(']').pop()?.trim() || '';
      }
      if (fieldName && !fieldName.toLowerCase().includes('modification')) {
        diffs.push({
          field: fieldName,
          oldVal: match[2].trim(),
          newVal: match[3].trim(),
        });
      }
    }

    // 2. Detect Sale details
    const saleMatch = raw.match(/(?:Facture|Sale|فاتورة)\s*(?:N°|#)?\s*(\d+)/i);
    const totalMatch = raw.match(/(?:Total|الإجمالي)\s*:\s*([\d.]+)/i);
    const invoiceNumber = saleMatch ? saleMatch[1] : undefined;
    const saleTotal = totalMatch ? parseFloat(totalMatch[1]) : undefined;

    // 3. Detect Stock movement
    const isStockIn = raw.includes('Stock IN') || raw.includes('Entrée de stock') || raw.includes('إدخال مخزون');
    const isStockOut = raw.includes('Stock OUT') || raw.includes('Sortie de stock') || raw.includes('إخراج مخزون');
    const stockUnitsMatch = raw.match(/\(([^)]+)\)/);
    const stockUnits = stockUnitsMatch ? stockUnitsMatch[1] : undefined;

    // 4. Detect Payment
    const paymentMatch = raw.match(/(?:Paiement de|Payment of|دفعة بقيمة)\s*([\d.]+)\s*(?:de|from|من|à|to|إلى)\s*([^(\n]+)(?:\(([^)]+)\))?/i);
    const paymentAmount = paymentMatch ? parseFloat(paymentMatch[1]) : undefined;
    const paymentParty = paymentMatch ? paymentMatch[2].trim() : undefined;
    const paymentMethod = paymentMatch && paymentMatch[3] ? paymentMatch[3].trim() : undefined;

    // 5. Detect Auth / Login
    const isLogin = action === 'login' || raw.includes('connecté') || raw.includes('logged in') || raw.includes('تسجيل دخول');

    // 6. Matched Sale in memory
    const matchedSale = invoiceNumber ? sales.find(s => s.invoiceNumber?.toString() === invoiceNumber) : undefined;

    return {
      raw,
      productName,
      diffs,
      invoiceNumber,
      saleTotal,
      isStockIn,
      isStockOut,
      stockUnits,
      paymentAmount,
      paymentParty,
      paymentMethod,
      isLogin,
      matchedSale,
      translated: translateActivityDetails(raw)
    };
  };

  // Helper to resolve actor display name
  const getActorDisplayName = (a?: { actorName?: string; actorId?: string } | null) => {
    if (!a) return language === 'ar' ? 'النظام' : language === 'fr' ? 'Système' : 'System';
    if (a.actorId && a.actorId !== 'system') {
      const u = (appUsers || []).find(user => user.id === a.actorId || (user as any).username === a.actorId);
      if (u) {
        return (u as any).displayName || (u as any).username || (u as any).name || a.actorName || a.actorId;
      }
      if (a.actorName && a.actorName !== 'System' && a.actorName !== 'Staff') {
        return a.actorName;
      }
      return a.actorId;
    }
    if (a.actorName && a.actorName !== 'System' && a.actorName !== 'Staff') {
      return a.actorName;
    }
    return language === 'ar' ? 'النظام' : language === 'fr' ? 'Système' : 'System';
  };

  // Distinct actors for staff filter
  const distinctActors = useMemo(() => {
    const map = new Map<string, string>();
    (appUsers || []).forEach(u => {
      const name = (u as any).displayName || (u as any).username || u.email;
      if (name) map.set(u.id, name);
    });
    (activities || []).forEach(a => {
      const name = getActorDisplayName(a);
      if (a.actorId && name && !map.has(a.actorId)) {
        map.set(a.actorId, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [appUsers, activities]);

  // Main Filtered Activities
  const filteredActivities = useMemo(() => {
    return (activities || []).filter(a => {
      if (!canViewAll && a.actorId !== currentUser?.id) {
        return false;
      }

      const d = new Date(a.timestamp);
      if (isNaN(d.getTime())) return false;

      // Time Filter
      if (timePreset === 'today') {
        const today = new Date();
        if (d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) {
          return false;
        }
      } else if (timePreset === 'month') {
        if (filterMonth > 0 && d.getMonth() + 1 !== filterMonth) return false;
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      } else if (timePreset === 'year') {
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      }

      // Actor Filter
      if (selectedActor !== 'all' && a.actorId !== selectedActor && a.actorName !== selectedActor && getActorDisplayName(a) !== selectedActor) {
        return false;
      }

      // Category Chip Filter
      if (activeChip === 'sales' && a.type !== 'SALE') return false;
      if (activeChip === 'payments' && a.type !== 'PAYMENT' && a.type !== 'SUPPLIER_PAYMENT') return false;
      if (activeChip === 'stock' && a.type !== 'STOCK') return false;
      if (activeChip === 'pricing') {
        const det = a.details || '';
        const isPriceChange = (a.type === 'PRODUCT' && (det.includes('Prix') || det.includes('Price') || det.includes('Coût') || det.includes('Cost')));
        if (!isPriceChange) return false;
      }
      if (activeChip === 'contacts' && a.type !== 'CUSTOMER' && a.type !== 'SUPPLIER') return false;
      if (activeChip === 'staff' && a.type !== 'STAFF') return false;
      if (activeChip === 'system' && a.type !== 'SYSTEM' && a.type !== 'SETTINGS') return false;

      // Search Filter
      if (searchHistory.trim()) {
        const q = searchHistory.toLowerCase();
        const det = (a.details || '').toLowerCase();
        const transDet = translateActivityDetails(a.details || '').toLowerCase();
        const actor = (getActorDisplayName(a) || '').toLowerCase();
        if (!det.includes(q) && !transDet.includes(q) && !actor.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [activities, canViewAll, currentUser?.id, timePreset, filterMonth, filterYear, selectedActor, activeChip, searchHistory]);

  // Main Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!canViewAll && s.staffId !== currentUser?.id) return false;
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return false;

      if (timePreset === 'today') {
        const today = new Date();
        if (d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return false;
      } else if (timePreset === 'month') {
        if (filterMonth > 0 && d.getMonth() + 1 !== filterMonth) return false;
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      } else if (timePreset === 'year') {
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      }

      if (selectedActor !== 'all' && s.staffId !== selectedActor) return false;

      if (searchHistory.trim()) {
        const q = searchHistory.toLowerCase();
        const customer = customers.find(c => c.id === s.customerId);
        const custName = (customer?.name || (s as any).customerName || '').toLowerCase();
        const inv = (s.invoiceNumber?.toString() || '').toLowerCase();
        const checkNo = (s.checkNumber || '').toLowerCase();
        const checkOw = (s.checkOwner || '').toLowerCase();
        if (!custName.includes(q) && !inv.includes(q.replace('#', '')) && !checkNo.includes(q) && !checkOw.includes(q) && !s.id.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [sales, canViewAll, currentUser?.id, timePreset, filterMonth, filterYear, selectedActor, searchHistory, customers]);

  // Main Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!canViewAll && p.staffId !== currentUser?.id) return false;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) return false;

      if (timePreset === 'today') {
        const today = new Date();
        if (d.getDate() !== today.getDate() || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return false;
      } else if (timePreset === 'month') {
        if (filterMonth > 0 && d.getMonth() + 1 !== filterMonth) return false;
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      } else if (timePreset === 'year') {
        if (filterYear > 0 && d.getFullYear() !== filterYear) return false;
      }

      if (selectedActor !== 'all' && p.staffId !== selectedActor) return false;

      if (searchHistory.trim()) {
        const q = searchHistory.toLowerCase();
        const cName = (p.customerName || customers.find(c => c.id === p.customerId)?.name || '').toLowerCase();
        const checkNo = (p.checkNumber || '').toLowerCase();
        const checkOw = (p.checkOwner || '').toLowerCase();
        if (!cName.includes(q) && !checkNo.includes(q) && !checkOw.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, canViewAll, currentUser?.id, timePreset, filterMonth, filterYear, selectedActor, searchHistory, customers]);

  // KPI Metrics calculation
  const statsMetrics = useMemo(() => {
    const totalOps = filteredActivities.length;
    const totalSalesAmount = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const salesCount = filteredSales.length;
    const totalPaymentsAmount = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const paymentsCount = filteredPayments.length;
    const stockOps = filteredActivities.filter(a => a.type === 'STOCK').length;
    const priceOps = filteredActivities.filter(a => a.type === 'PRODUCT' && ((a.details || '').includes('Prix') || (a.details || '').includes('Price') || (a.details || '').includes('Coût') || (a.details || '').includes('Cost'))).length;

    return {
      totalOps,
      totalSalesAmount,
      salesCount,
      totalPaymentsAmount,
      paymentsCount,
      stockOps,
      priceOps
    };
  }, [filteredActivities, filteredSales, filteredPayments]);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { v: 1, n: language === 'ar' ? 'يناير' : language === 'fr' ? 'Janvier' : 'January' },
    { v: 2, n: language === 'ar' ? 'فبراير' : language === 'fr' ? 'Février' : 'February' },
    { v: 3, n: language === 'ar' ? 'مارس' : language === 'fr' ? 'Mars' : 'March' },
    { v: 4, n: language === 'ar' ? 'أبريل' : language === 'fr' ? 'Avril' : 'April' },
    { v: 5, n: language === 'ar' ? 'مايو' : language === 'fr' ? 'Mai' : 'May' },
    { v: 6, n: language === 'ar' ? 'يونيو' : language === 'fr' ? 'Juin' : 'June' },
    { v: 7, n: language === 'ar' ? 'يوليو' : language === 'fr' ? 'Juillet' : 'July' },
    { v: 8, n: language === 'ar' ? 'أغسطس' : language === 'fr' ? 'Août' : 'August' },
    { v: 9, n: language === 'ar' ? 'سبتمبر' : language === 'fr' ? 'Septembre' : 'September' },
    { v: 10, n: language === 'ar' ? 'أكتوبر' : language === 'fr' ? 'Octobre' : 'October' },
    { v: 11, n: language === 'ar' ? 'نوفمبر' : language === 'fr' ? 'Novembre' : 'November' },
    { v: 12, n: language === 'ar' ? 'ديسمبر' : language === 'fr' ? 'Décembre' : 'December' },
  ];

  const CATEGORY_CHIPS = [
    { id: 'all', label: l.allCategories, icon: Activity },
    { id: 'sales', label: l.chipSales, icon: ShoppingCart },
    { id: 'payments', label: l.chipPayments, icon: Wallet },
    { id: 'stock', label: l.chipStock, icon: Archive },
    { id: 'pricing', label: l.chipPricing, icon: TrendingUp },
    { id: 'contacts', label: l.chipContacts, icon: Users },
    { id: 'staff', label: l.chipStaff, icon: UserCog },
    { id: 'system', label: l.chipSystem, icon: Cloud },
  ];

  // Helper for event icon styling
  const getActivityMeta = (type: string, action: string, details: string) => {
    if (type === 'SALE') {
      return {
        icon: <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
        badge: l.chipSales
      };
    }
    if (type === 'PAYMENT' || type === 'SUPPLIER_PAYMENT') {
      return {
        icon: <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
        bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40 text-teal-700 dark:text-teal-300",
        badge: l.chipPayments
      };
    }
    if (type === 'STOCK') {
      return {
        icon: <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300",
        badge: l.chipStock
      };
    }
    if (type === 'PRODUCT' && (details.includes('Prix') || details.includes('Price') || details.includes('Coût') || details.includes('Cost'))) {
      return {
        icon: <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300",
        badge: l.chipPricing
      };
    }
    if (type === 'PRODUCT' || type === 'CATEGORY') {
      return {
        icon: <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
        bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300",
        badge: language === 'ar' ? 'المنتجات' : 'Catalogue'
      };
    }
    if (type === 'CUSTOMER' || type === 'SUPPLIER') {
      return {
        icon: <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300",
        badge: l.chipContacts
      };
    }
    if (type === 'RETURN') {
      return {
        icon: <Undo className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
        bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300",
        badge: language === 'ar' ? 'مرتجع' : 'Retour'
      };
    }
    if (type === 'STAFF') {
      return {
        icon: <UserCog className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
        bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300",
        badge: l.chipStaff
      };
    }
    return {
      icon: <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      bg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
      badge: l.chipSystem
    };
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            {language === 'ar' ? 'إنشاء' : 'CRÉATION'}
          </span>
        );
      case 'update':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            {language === 'ar' ? 'تعديل' : 'MODIFICATION'}
          </span>
        );
      case 'delete':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            {language === 'ar' ? 'حذف' : 'SUPPRESSION'}
          </span>
        );
      case 'login':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
            {language === 'ar' ? 'دخول' : 'CONNEXION'}
          </span>
        );
      case 'backup':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
            {language === 'ar' ? 'نسخ احتياطي' : 'SAUVEGARDE'}
          </span>
        );
      case 'import':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
            {language === 'ar' ? 'استيراد' : 'IMPORT'}
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 pb-24 px-1 sm:px-2 md:px-4">
      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 dark:bg-accent/20 rounded-2xl border border-accent/20 shadow-sm text-accent">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight">
                {l.historyTitle}
              </h1>
              <p className="text-xs font-bold text-text-secondary">
                {l.historySubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-border-subtle bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-text-secondary hover:text-text-main transition-all shadow-sm active:scale-95"
            title={l.refresh}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-accent")} />
          </button>

          {/* Export Report Button */}
          <button
            onClick={() => {
              const currentList = subView === 'sales' ? filteredSales : (subView === 'payments' ? filteredPayments : filteredActivities);
              let periodStr = filterYear.toString();
              if (timePreset === 'today') {
                periodStr = new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR');
              } else if (filterMonth > 0) {
                const mName = months.find(m => m.v === filterMonth)?.n;
                periodStr = `${mName} ${filterYear}`;
              }

              generateHistoryReportPDF({
                type: subView === 'sales' ? 'SALES' : (subView === 'payments' ? 'PAYMENTS' : 'ACTIVITY'),
                period: periodStr,
                totalAmount: subView === 'activity' ? 0 : currentList.reduce((sum, item) => sum + (subView === 'sales' ? (item as Sale).total : (item as Payment).amount), 0),
                items: currentList.map(item => {
                  if (subView === 'activity') {
                    const a = item as ActivityLog;
                    return { date: a.timestamp, amount: 0, description: `[${a.type}] ${translateActivityDetails(a.details)} (${getActorDisplayName(a)})` };
                  }
                  const customerMatch = customers.find(c => c.id === (item as Sale).customerId);
                  return {
                    date: item.date,
                    amount: subView === 'sales' ? (item as Sale).total : (item as Payment).amount,
                    description: subView === 'sales'
                      ? (customerMatch?.name || (language === 'ar' ? 'زبون عادي' : language === 'fr' ? 'Client passant' : 'Walk-in'))
                      : ((item as Payment).customerName || customers.find(c => c.id === (item as Payment).customerId)?.name || (language === 'ar' ? 'غير معروف' : language === 'fr' ? 'Inconnu' : 'Unknown'))
                  };
                })
              }, language, settings);
            }}
            className="flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl border border-accent/30 bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{l.exportReport}</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Operations */}
        <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {l.kpiTotalOps}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-main font-mono tracking-tight">
            {statsMetrics.totalOps.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-secondary font-bold mt-1.5">
            {statsMetrics.totalOps.toLocaleString()} {l.kpiTotalOpsSub}
          </div>
        </div>

        {/* Card 2: Sales Revenue */}
        <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {l.kpiSales}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {formatNumber(statsMetrics.totalSalesAmount)} <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
          </div>
          <div className="text-[11px] text-text-secondary font-bold mt-1.5">
            {statsMetrics.salesCount.toLocaleString()} {l.kpiSalesSub}
          </div>
        </div>

        {/* Card 3: Payments Collected */}
        <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {l.kpiPayments}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            +{formatNumber(statsMetrics.totalPaymentsAmount)} <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
          </div>
          <div className="text-[11px] text-text-secondary font-bold mt-1.5">
            {statsMetrics.paymentsCount.toLocaleString()} {l.kpiPaymentsSub}
          </div>
        </div>

        {/* Card 4: Stock & Pricing Operations */}
        <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
              {l.kpiStockPricing}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {(statsMetrics.stockOps + statsMetrics.priceOps).toLocaleString()}
          </div>
          <div className="text-[11px] text-text-secondary font-bold mt-1.5">
            {statsMetrics.stockOps.toLocaleString()} {l.chipStock} • {statsMetrics.priceOps.toLocaleString()} {l.priceChange}
          </div>
        </div>
      </div>

      {/* ── SUBVIEW TABS & CONTROLS ── */}
      <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Main Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl border border-border-subtle">
            <button
              onClick={() => setSubView('activity')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                subView === 'activity'
                  ? "bg-white dark:bg-slate-800 text-text-main shadow-sm border border-border-subtle"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              <CalendarClock className="w-3.5 h-3.5 text-accent" />
              <span>{l.tabActivities}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-text-secondary font-mono">
                {filteredActivities.length}
              </span>
            </button>

            <button
              onClick={() => setSubView('sales')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                subView === 'sales'
                  ? "bg-white dark:bg-slate-800 text-text-main shadow-sm border border-border-subtle"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>{l.tabSales}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                {filteredSales.length}
              </span>
            </button>

            <button
              onClick={() => setSubView('payments')}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                subView === 'payments'
                  ? "bg-white dark:bg-slate-800 text-text-main shadow-sm border border-border-subtle"
                  : "text-text-secondary hover:text-text-main"
              )}
            >
              <Wallet className="w-3.5 h-3.5 text-teal-600" />
              <span>{l.tabPayments}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-mono">
                {filteredPayments.length}
              </span>
            </button>
          </div>

          {/* Time Presets Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTimePreset('today')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all",
                timePreset === 'today'
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-border-subtle text-text-secondary hover:text-text-main"
              )}
            >
              {l.presetToday}
            </button>
            <button
              onClick={() => {
                setTimePreset('month');
                setFilterMonth(new Date().getMonth() + 1);
                setFilterYear(new Date().getFullYear());
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all",
                timePreset === 'month'
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-border-subtle text-text-secondary hover:text-text-main"
              )}
            >
              {l.presetMonth}
            </button>
            <button
              onClick={() => {
                setTimePreset('year');
                setFilterYear(new Date().getFullYear());
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all",
                timePreset === 'year'
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-border-subtle text-text-secondary hover:text-text-main"
              )}
            >
              {l.presetYear}
            </button>
            <button
              onClick={() => {
                setTimePreset('all');
                setFilterMonth(0);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all",
                timePreset === 'all'
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-slate-50 dark:bg-slate-900 border-border-subtle text-text-secondary hover:text-text-main"
              )}
            >
              {l.presetAll}
            </button>
          </div>
        </div>

        {/* ── SEARCH & DETAILED SELECTORS ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border-subtle">
          {/* Search Bar */}
          <div className="md:col-span-12 lg:col-span-6 relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4", language === 'ar' ? "right-3.5" : "left-3.5")} />
            <input
              placeholder={l.searchPlaceholder}
              value={searchHistory}
              onChange={e => setSearchHistory(e.target.value)}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-900/70 border border-border-subtle rounded-xl py-2.5 text-xs font-bold text-text-main focus:border-accent outline-none transition-all",
                language === 'ar' ? "pr-10 pl-9 text-right" : "pl-10 pr-9"
              )}
            />
            {searchHistory && (
              <button
                onClick={() => setSearchHistory('')}
                className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main p-1", language === 'ar' ? "left-2.5" : "right-2.5")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Dropdown */}
          <div className="md:col-span-4 lg:col-span-2">
            <select
              value={filterMonth}
              onChange={e => {
                setFilterMonth(parseInt(e.target.value));
                if (timePreset !== 'month') setTimePreset('month');
              }}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-900/70 border border-border-subtle rounded-xl px-3 py-2.5 text-xs font-bold text-text-main focus:border-accent outline-none cursor-pointer",
                language === 'ar' && "text-right"
              )}
            >
              <option value={0}>{language === 'ar' ? "جميع الشهور" : language === 'fr' ? "Tous les mois" : "All Months"}</option>
              {months.map(m => (
                <option key={m.v} value={m.v}>{m.n}</option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="md:col-span-4 lg:col-span-2">
            <select
              value={filterYear}
              onChange={e => setFilterYear(parseInt(e.target.value))}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-900/70 border border-border-subtle rounded-xl px-3 py-2.5 text-xs font-bold text-text-main focus:border-accent outline-none cursor-pointer",
                language === 'ar' && "text-right"
              )}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Staff / Actor Dropdown */}
          <div className="md:col-span-4 lg:col-span-2">
            <select
              value={selectedActor}
              onChange={e => setSelectedActor(e.target.value)}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-900/70 border border-border-subtle rounded-xl px-3 py-2.5 text-xs font-bold text-text-main focus:border-accent outline-none cursor-pointer",
                language === 'ar' && "text-right"
              )}
            >
              <option value="all">{l.allUsers}</option>
              {distinctActors.map(actor => (
                <option key={actor.id} value={actor.id}>{actor.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── QUICK CATEGORY CHIPS (For Activity Feed) ── */}
        {subView === 'activity' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {CATEGORY_CHIPS.map(chip => {
              const IconComp = chip.icon;
              const isActive = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveChip(chip.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shrink-0 border transition-all duration-150",
                    isActive
                      ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-800 dark:border-slate-100 shadow-sm scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-900/60 border-border-subtle text-text-secondary hover:text-text-main hover:bg-slate-100"
                  )}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="bg-white/90 dark:bg-slate-800/90 border border-border-subtle rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm backdrop-blur-sm min-h-[460px]">
        {/* VIEW 1: ACTIVITY LOG FEED */}
        {subView === 'activity' && (
          <div className="divide-y divide-border-subtle">
            {filteredActivities.map(activity => {
              const parsed = parseActivity(activity);
              const meta = getActivityMeta(activity.type, activity.action, activity.details);

              return (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="p-4 sm:p-5 lg:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Icon & Description */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105",
                      meta.bg
                    )}>
                      {meta.icon}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Event Title / Parsed highlights */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-text-secondary border border-border-subtle">
                          {meta.badge}
                        </span>
                        {getActionBadge(activity.action)}

                        {/* Invoice button if sale */}
                        {parsed.invoiceNumber && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintInvoiceByNumber(parsed.invoiceNumber!);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 transition-all cursor-pointer shadow-xs active:scale-95 group/btn"
                            title={language === 'ar' ? `عرض / طباعة الفاتورة رقم ${parsed.invoiceNumber}` : `Afficher / Imprimer Facture N° ${parsed.invoiceNumber}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                            <span>Facture N° {parsed.invoiceNumber}</span>
                          </button>
                        )}

                        <span className="text-[11px] font-bold text-text-secondary">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>

                      {/* Content parsing: Product Name & Diff badges or clean description */}
                      <div className="space-y-1.5 pt-0.5">
                        {parsed.productName && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-xl border border-border-subtle shadow-xs">
                              <Package className="w-3.5 h-3.5 text-accent" />
                              <span>{parsed.productName}</span>
                            </span>
                          </div>
                        )}

                        {parsed.diffs.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {parsed.diffs.map((diff, idx) => {
                              const isMoney = /prix|price|coût|cost|dette|debt|solde/i.test(diff.field);
                              const formatVal = (v: string) => {
                                const num = parseFloat(v);
                                return !isNaN(num) && isMoney ? `${formatNumber(num)} ${t.currency}` : v;
                              };
                              return (
                                <div key={idx} className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-border-subtle px-2.5 py-1 rounded-xl">
                                  <span className="text-text-secondary uppercase text-[10px] tracking-wider">{diff.field} :</span>
                                  <span className="line-through text-rose-500 font-mono text-[11px]">{formatVal(diff.oldVal)}</span>
                                  <ArrowRight className="w-3 h-3 text-text-secondary inline" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-[11px]">{formatVal(diff.newVal)}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-text-main leading-snug line-clamp-2">
                            {parsed.translated}
                          </div>
                        )}
                      </div>

                      {/* Actor & Source row */}
                      <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 px-2 py-0.5 rounded-md border border-border-subtle">
                          <UserCog className="w-3 h-3 text-text-secondary" />
                          <span>{getActorDisplayName(activity)}</span>
                        </div>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-text-secondary">
                          {new Date(activity.timestamp).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')} {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Amount */}
                  <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                    {/* Amount display if present */}
                    {parsed.saleTotal !== undefined && (
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatNumber(parsed.saleTotal)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                        </div>
                      </div>
                    )}

                    {parsed.paymentAmount !== undefined && (
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-teal-600 dark:text-teal-400 font-mono">
                          +{formatNumber(parsed.paymentAmount)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Print Button if sale */}
                    {parsed.invoiceNumber && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintInvoiceByNumber(parsed.invoiceNumber!);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-accent hover:text-white dark:bg-slate-700 dark:hover:bg-accent text-text-secondary transition-all"
                        title={l.printInvoice}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 text-text-secondary transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: SALES TABLE */}
        {subView === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-border-subtle">
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.referenceDate}</th>
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.customer}</th>
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.products}</th>
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.paymentMethod}</th>
                  <th className={cn("p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{l.amount}</th>
                  <th className={cn("p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{l.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredSales.map(sale => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-black text-sm text-text-main flex items-center gap-1.5">
                          <span className="text-accent font-bold">#</span>{sale.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                          {new Date(sale.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-sm text-text-main">
                          {customer?.name || (sale as any).customerName || (language === 'ar' ? 'زبون عادي' : 'Client passant')}
                        </div>
                        {customer?.phone && (
                          <div className="text-[11px] text-text-secondary font-mono">{customer.phone}</div>
                        )}
                      </td>
                      <td className="p-4 sm:px-6">
                        <div className="flex flex-wrap gap-1 max-w-md xl:max-w-xl">
                          {(sale.items || []).slice(0, 3).map((item, idx) => (
                            <span key={idx} className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-[10px] font-bold border border-border-subtle">
                              {item.qty}x {item.name}
                            </span>
                          ))}
                          {(sale.items?.length || 0) > 3 && (
                            <span className="text-[10px] text-text-secondary font-bold">
                              +{(sale.items?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          sale.paymentMethod === 'CHECK'
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                        )}>
                          {sale.paymentMethod === 'CHECK' ? <CreditCard className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {sale.paymentMethod === 'CHECK' ? l.check : l.cash}
                        </span>
                        {sale.paymentMethod === 'CHECK' && (
                          <div className="text-[10px] font-mono text-text-secondary mt-1">
                            {sale.checkNumber} | {sale.checkOwner}
                          </div>
                        )}
                      </td>
                      <td className={cn("p-4", language === 'ar' ? "text-left" : "text-right")}>
                        <div className="text-base font-black text-text-main font-mono">
                          {formatNumber(sale.total)} <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
                        </div>
                      </td>
                      <td className={cn("p-4", language === 'ar' ? "text-left" : "text-right")}>
                        <button
                          onClick={() => printInvoice(sale)}
                          className={cn("p-2 rounded-xl bg-slate-100 hover:bg-accent hover:text-white dark:bg-slate-700 dark:hover:bg-accent text-accent transition-all", language === 'ar' ? "mr-auto" : "ml-auto")}
                          title={l.printInvoice}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: PAYMENTS TABLE */}
        {subView === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-border-subtle">
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.customer}</th>
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.timestamp}</th>
                  <th className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{l.paymentMethod}</th>
                  <th className={cn("p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{l.amount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredPayments.map(p => {
                  const customer = customers.find(c => c.id === p.customerId);
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-sm text-text-main">
                          {p.customerName || customer?.name || (language === 'ar' ? 'غير معروف' : 'Inconnu')}
                        </div>
                        {customer?.phone && (
                          <div className="text-[11px] text-text-secondary font-mono">{customer.phone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-text-secondary font-medium">
                          {new Date(p.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')} • {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                          (p as any).paymentMethod === 'CHECK'
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800"
                            : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800"
                        )}>
                          {(p as any).paymentMethod === 'CHECK' ? <CreditCard className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {(p as any).paymentMethod === 'CHECK' ? l.check : l.cash}
                        </span>
                        {(p as any).paymentMethod === 'CHECK' && (
                          <div className="text-[10px] font-mono text-text-secondary mt-1">
                            {(p as any).checkNumber} | {(p as any).checkOwner}
                          </div>
                        )}
                      </td>
                      <td className={cn("p-4", language === 'ar' ? "text-left" : "text-right")}>
                        <div className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">
                          +{formatNumber(p.amount)} <span className="text-xs font-bold text-text-secondary">{t.currency}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {subView === 'activity' && activitiesTotal > 50 && (
          <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-slate-50/50 dark:bg-slate-900/40">
            <div className="text-xs font-black text-text-secondary uppercase tracking-widest">
              {l.page} {activitiesPage} {l.of} {Math.ceil(activitiesTotal / 50)} ({activitiesTotal} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={activitiesPage === 1}
                onClick={() => fetchActivitiesPage(activitiesPage - 1)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-border-subtle rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{l.prev}</span>
              </button>
              <button
                disabled={activitiesPage >= Math.ceil(activitiesTotal / 50)}
                onClick={() => fetchActivitiesPage(activitiesPage + 1)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-border-subtle rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
              >
                <span>{l.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {subView === 'sales' && salesTotal > 50 && (
          <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-slate-50/50 dark:bg-slate-900/40">
            <div className="text-xs font-black text-text-secondary uppercase tracking-widest">
              {l.page} {salesPage} {l.of} {Math.ceil(salesTotal / 50)} ({salesTotal} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={salesPage === 1}
                onClick={() => fetchSalesPage(salesPage - 1)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-border-subtle rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{l.prev}</span>
              </button>
              <button
                disabled={salesPage >= Math.ceil(salesTotal / 50)}
                onClick={() => fetchSalesPage(salesPage + 1)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-border-subtle rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-1"
              >
                <span>{l.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {((subView === 'activity' && filteredActivities.length === 0) ||
          (subView === 'sales' && filteredSales.length === 0) ||
          (subView === 'payments' && filteredPayments.length === 0)) && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-secondary mb-4 border border-border-subtle">
              <Archive className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-black text-text-main uppercase tracking-wider mb-1">
              {l.noRecords}
            </h3>
            <p className="text-xs font-bold text-text-secondary max-w-sm">
              {l.noRecordsDesc}
            </p>
          </div>
        )}
      </div>

      {/* ── EVENT DETAILS MODAL (INSPECTOR) ── */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 border border-border-subtle rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs", getActivityMeta(selectedActivity.type, selectedActivity.action, selectedActivity.details).bg)}>
                    {getActivityMeta(selectedActivity.type, selectedActivity.action, selectedActivity.details).icon}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-text-main">
                      {l.detailsModalTitle}
                    </h3>
                    <p className="text-xs font-bold text-text-secondary font-mono">
                      #{selectedActivity.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-text-secondary hover:text-text-main transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Meta details banner */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-border-subtle text-xs">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-text-secondary mb-1">{l.actor}</div>
                    <div className="font-bold text-text-main flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5 text-accent" />
                      <span>{getActorDisplayName(selectedActivity)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-text-secondary mb-1">{l.action}</div>
                    <div>{getActionBadge(selectedActivity.action)}</div>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-border-subtle">
                    <div className="text-[10px] font-black uppercase tracking-wider text-text-secondary mb-1">{l.timestamp}</div>
                    <div className="font-mono font-bold text-text-main text-xs">
                      {new Date(selectedActivity.timestamp).toLocaleString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Parsed Differences Table (if any) */}
                {(() => {
                  const parsed = parseActivity(selectedActivity);
                  if (parsed.diffs.length === 0 && !parsed.productName) return null;

                  return (
                    <div className="space-y-3">
                      {parsed.productName && (
                        <div className="p-3 bg-accent/10 border border-accent/20 rounded-2xl flex items-center gap-2 text-xs font-black text-accent">
                          <Package className="w-4 h-4" />
                          <span>{parsed.productName}</span>
                        </div>
                      )}

                      {parsed.diffs.length > 0 && (
                        <>
                          <h4 className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                            <span>{l.changes}</span>
                          </h4>

                          <div className="border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle">
                            <div className="grid grid-cols-3 p-3 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-black uppercase text-text-secondary tracking-wider">
                              <div>{l.property}</div>
                              <div>{l.oldValue}</div>
                              <div>{l.newValue}</div>
                            </div>

                            {parsed.diffs.map((diff, i) => {
                              const isMoney = /prix|price|coût|cost|dette|debt|solde/i.test(diff.field);
                              const formatVal = (v: string) => {
                                const num = parseFloat(v);
                                return !isNaN(num) && isMoney ? `${formatNumber(num)} ${t.currency}` : v;
                              };
                              return (
                                <div key={i} className="grid grid-cols-3 p-3 text-xs font-bold items-center">
                                  <div className="text-text-main">{diff.field}</div>
                                  <div className="line-through text-rose-500 font-mono">{formatVal(diff.oldVal)}</div>
                                  <div className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{formatVal(diff.newVal)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Raw Details / Translated Payload */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-secondary">
                    {l.rawPayload}
                  </h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-border-subtle rounded-2xl text-xs font-medium text-text-main leading-relaxed">
                    {translateActivityDetails(selectedActivity.details)}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border-subtle bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`[${selectedActivity.type}] ${selectedActivity.details} (${getActorDisplayName(selectedActivity)} - ${selectedActivity.timestamp})`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border-subtle text-xs font-bold text-text-secondary hover:text-text-main bg-white dark:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? l.copied : l.copyDetails}</span>
                </button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const parsed = parseActivity(selectedActivity);
                    if (!parsed.invoiceNumber) return null;

                    return (
                      <button
                        onClick={() => {
                          handlePrintInvoiceByNumber(parsed.invoiceNumber!);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-black uppercase tracking-wider hover:bg-accent/90 transition-all flex items-center gap-1.5 shadow-md shadow-accent/20 active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{l.printInvoice} N° {parsed.invoiceNumber}</span>
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all active:scale-95"
                  >
                    {l.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
