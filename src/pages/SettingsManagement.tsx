import StaffManagement from './StaffManagement';
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

export default function SettingsManagement({ 
  isDriveConnected,
  backingUpToDrive,
  handleGoogleConnect,
  handleDriveBackup,
  setBackingUpToDrive
}: { 
  isDriveConnected: boolean,
  backingUpToDrive: boolean,
  handleGoogleConnect: () => Promise<void>,
  handleDriveBackup: () => Promise<void>,
  latestBackup: any,
  setBackingUpToDrive: (b: boolean) => void
}) {
  const { appUsers: users, settings, setMessage, fetchData: onRefresh, latestBackup } = useStore();
  const { language, user: currentUser } = useAuthStore();

  const t = translations[language];
  const loggedInProfile = users.find(u => u.id === (currentUser?.id || currentUser?.uid));
  const isGamraAdmin = currentUser?.username?.toLowerCase() === 'gamra' || currentUser?.id === 'admin' || loggedInProfile?.username?.toLowerCase() === 'gamra' || loggedInProfile?.id === 'admin' || loggedInProfile?.role === 'admin' || currentUser?.role === 'admin';
  const canManageStaff = isGamraAdmin || loggedInProfile?.role === 'admin';
  const [tab, setTab] = useState<'shop' | 'users' | 'backup'>('shop');
  
  // Shop details form state
  const [shopName, setShopName] = useState(settings?.shopName || '');
  const [shopPhone, setShopPhone] = useState(settings?.shopPhone || '');
  const [shopAddress, setShopAddress] = useState(settings?.shopAddress || '');
  const [autoBackup, setAutoBackup] = useState(settings?.autoBackup || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName || '');
      setShopPhone(settings.shopPhone || '');
      setShopAddress(settings.shopAddress || '');
      setAutoBackup(settings.autoBackup || false);
    }
  }, [settings]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({ shopName, shopAddress, shopPhone, autoBackup });
      setMessage({ text: language === 'ar' ? "تم التحديث بنجاح" : "Updated successfully", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const result = await api.exportBackup();
      if (result.status === 'success') {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `POS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setMessage({ text: language === 'ar' ? "تم تحميل النسخة الاحتياطية بنجاح." : "Backup downloaded successfully.", type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: t.backupError, type: 'error' });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!window.confirm(language === 'ar' ? "تحذير: سيتم مسح كافة البيانات الحالية وتعويضها بالنسخة الاحتياطية. هل أنت متأكد؟" : "WARNING: This will overwrite all current data. Are you sure?")) {
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = await api.importBackup(json);
        if (result.status === 'success') {
          setMessage({ text: t.backupSuccess, type: 'success' });
          onRefresh();
          e.target.value = '';
        } else {
          setMessage({ text: result.message || t.backupError, type: 'error' });
        }
      } catch (err: any) {
        console.error(err);
        setMessage({ text: t.backupError, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const GoogleDriveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78" className="w-5 h-5">
      <path d="M58.3 78L87.3 27.6H29.1L0 78h58.3z" fill="#00ac47"/>
      <path d="M58.3 0L29.1 50.4 0 0h58.3z" fill="#0066da"/>
      <path d="M87.3 27.6L58.3 0 29.1 50.4l29.2 27.6L87.3 27.6z" fill="#ea4335"/>
      <path d="M29.1 50.4L0 0l29.1 50.4z" fill="#00832d"/>
      <path d="M87.3 27.6l-29.2-27.6v50.4z" fill="#2684fc"/>
      <path d="M58.3 78H0l29.1-50.4h58.2z" fill="#ffba00"/>
    </svg>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-card/80 backdrop-blur-md rounded-2xl border border-border-subtle w-fit shadow-xs">
        <button 
          onClick={() => setTab('shop')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
            tab === 'shop' 
              ? "bg-accent text-white shadow-md shadow-accent/25" 
              : "text-text-secondary hover:text-text-main hover:bg-bg-base/70"
          )}
        >
          <Store className="w-4 h-4" />
          {t.shopDetails}
        </button>
        {canManageStaff && (
          <button 
            onClick={() => setTab('users')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
              tab === 'users' 
                ? "bg-accent text-white shadow-md shadow-accent/25" 
                : "text-text-secondary hover:text-text-main hover:bg-bg-base/70"
            )}
          >
            <UserCog className="w-4 h-4" />
            {t.staff}
          </button>
        )}
        <button 
          onClick={() => setTab('backup')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer",
            tab === 'backup' 
              ? "bg-accent text-white shadow-md shadow-accent/25" 
              : "text-text-secondary hover:text-text-main hover:bg-bg-base/70"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          {t.backup}
        </button>
      </div>

      {tab === 'shop' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Left Column: Form */}
          <div className="lg:col-span-7 bg-card p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-sm relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-border-subtle mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-accent flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-main tracking-tight">
                  {language === 'ar' ? 'معلومات المحل والمؤسسة' : language === 'fr' ? 'Coordonnées & En-tête du Magasin' : 'Store Details & Branding'}
                </h3>
                <p className="text-xs text-text-secondary font-medium mt-0.5">
                  {language === 'ar' 
                    ? 'هذه المعلومات تظهر على الفواتير، التوصيلات، وتذاكر الصندوق.' 
                    : 'Ces informations apparaîtront automatiquement sur tous vos reçus, devis et factures.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-5">
              {/* Shop Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-accent" />
                    {t.shopName}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {language === 'ar' ? 'الاسم الرسمي' : 'Titre Officiel'}
                  </span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={shopName || ''} 
                    onChange={e => setShopName(e.target.value)} 
                    placeholder="Ex: AGRI BOUTABSSIL"
                    className="w-full bg-bg-base/60 hover:bg-bg-base border border-border-subtle focus:border-accent rounded-xl px-4 py-3 font-bold text-text-main placeholder:text-text-secondary/40 outline-none transition-all shadow-2xs" 
                    required
                  />
                </div>
              </div>

              {/* Shop Phone */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-accent" />
                    {t.shopPhone}
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    {language === 'ar' ? 'أرقام الاتصال والواتساب' : 'Lignes directes / WhatsApp'}
                  </span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={shopPhone || ''} 
                    onChange={e => setShopPhone(e.target.value)} 
                    placeholder="0661807643 / 0697399163"
                    className="w-full bg-bg-base/60 hover:bg-bg-base border border-border-subtle focus:border-accent rounded-xl px-4 py-3 font-bold text-text-main placeholder:text-text-secondary/40 outline-none transition-all shadow-2xs" 
                    required
                  />
                </div>
              </div>

              {/* Shop Address */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    {t.shopAddress}
                  </span>
                  <span className="text-[10px] text-text-secondary font-medium">
                    {language === 'ar' ? 'العنوان / المدينة' : 'Adresse physique / Ville'}
                  </span>
                </label>
                <textarea 
                  value={shopAddress || ''} 
                  onChange={e => setShopAddress(e.target.value)} 
                  placeholder="Ex: DAR EL GUEDDARI, MAROC"
                  className="w-full bg-bg-base/60 hover:bg-bg-base border border-border-subtle focus:border-accent rounded-xl p-4 font-bold text-text-main placeholder:text-text-secondary/40 outline-none transition-all shadow-2xs h-28 resize-none leading-relaxed" 
                  required
                />
              </div>

              {/* Actions Button Group */}
              <div className="pt-3 flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-black py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-accent/25 active:scale-[0.99] text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Enregistrement...') : t.updateSettings}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (settings) {
                      setShopName(settings.shopName || '');
                      setShopPhone(settings.shopPhone || '');
                      setShopAddress(settings.shopAddress || '');
                    }
                  }}
                  className="px-4 py-3.5 rounded-xl border border-border-subtle text-text-secondary hover:text-text-main hover:bg-bg-base font-bold text-xs transition-colors cursor-pointer"
                  title="Réinitialiser"
                >
                  <Undo className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Header Document Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card p-6 sm:p-7 rounded-3xl border border-border-subtle shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-xs font-black uppercase tracking-wider text-text-main">
                    {language === 'ar' ? 'معاينة حية على الفاتورة' : 'Aperçu Direct En-Tête'}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {language === 'ar' ? 'مباشر' : 'Temps réel'}
                </span>
              </div>

              {/* Simulated Paper Invoice Header */}
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
                <div className="text-center space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-text-main text-emerald-700 dark:text-emerald-400">
                    {shopName.trim() || 'AGRI BOUTABSSIL'}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary font-medium">
                    <Phone className="w-3 h-3 text-accent shrink-0" />
                    <span>{shopPhone.trim() || '0661807643 / 0697399163'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary font-medium">
                    <MapPin className="w-3 h-3 text-accent shrink-0" />
                    <span>{shopAddress.trim() || 'DAR EL GUEDDARI'}</span>
                  </div>
                </div>

                {/* Simulated Metadata */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-text-secondary py-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="opacity-60 block">DOCUMENT:</span>
                    <span className="font-bold text-text-main">FACTURE #FAC-2026</span>
                  </div>
                  <div className="text-right">
                    <span className="opacity-60 block">DATE:</span>
                    <span className="font-bold text-text-main">{new Date().toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-text-secondary/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{language === 'ar' ? 'سيتطابق شكل المطبوعات مع هذه البيانات' : 'Format conforme aux impressions et tickets A4 / 80mm'}</span>
                </div>
              </div>

              {/* Quick tip */}
              <div className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/10 flex items-start gap-2.5 text-xs text-text-secondary">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {language === 'ar'
                    ? 'نصيحة: تأكد من إدخال كلا الرقمين لتسهيل تواصل الزبناء مع المحل وطلب المعدات الفلاحية.'
                    : 'Astuce : Vérifiez l\'exactitude des numéros pour que vos clients puissent joindre facilement le magasin pour le matériel d\'irrigation et pompage.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'users' && canManageStaff && (
        <StaffManagement 
          isDriveConnected={isDriveConnected}
          backingUpToDrive={backingUpToDrive}
          handleGoogleConnect={handleGoogleConnect}
          handleDriveBackup={handleDriveBackup}
          latestBackup={latestBackup}
          setBackingUpToDrive={setBackingUpToDrive}
        />
      )}

      {tab === 'backup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
          <div className="bg-white border-2 border-border-subtle rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16" />
            <div className={cn("relative flex flex-col md:flex-row items-center justify-between gap-6", language === 'ar' && "md:flex-row-reverse")}>
              <div className={cn("space-y-1 text-center md:text-left", language === 'ar' && "md:text-right")}>
                <h4 className="text-xl font-black uppercase tracking-tighter text-text-main flex items-center justify-center md:justify-start gap-2">
                  <ShieldCheck className="w-6 h-6 text-accent" />
                  {t.backup}
                </h4>
                <p className="text-text-secondary text-sm font-medium opacity-70 max-w-md">{t.backupInfo}</p>
                {latestBackup && (
                  <div className="text-[10px] text-accent font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    {language === 'ar' ? "آخر نسخة احتياطية:" : "LAST BACKUP:"} {new Date(latestBackup.created_at).toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleExportBackup}
                  className="px-6 py-3 bg-accent text-white font-black rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-accent/20"
                >
                  <Download className="w-4 h-4" />
                  {t.exportBackup}
                </button>
                
                <label className="px-6 py-3 bg-bg-base border-2 border-border-subtle text-text-main font-black rounded-xl hover:bg-white cursor-pointer active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Archive className="w-4 h-4 text-text-secondary" />
                  {t.importBackup}
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportBackup} 
                    className="hidden" 
                  />
                </label>
                
                <div className="w-px h-10 bg-border-subtle mx-2 hidden md:block" />

                {isDriveConnected ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleDriveBackup}
                      disabled={backingUpToDrive}
                      className={cn(
                        "px-6 py-3 bg-white border-2 border-[#4285F4] text-[#4285F4] font-black rounded-xl hover:bg-[#4285F4]/5 active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest",
                        backingUpToDrive && "opacity-50 cursor-wait"
                      )}
                    >
                      {backingUpToDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GoogleDriveIcon />}
                      {t.backupToDrive}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleGoogleConnect}
                      className="px-6 py-3 bg-white border-2 border-border-subtle text-[#4285F4] font-black rounded-xl hover:bg-white active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                    >
                      <GoogleDriveIcon />
                      {t.googleDriveConnect}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-bg-base/30 border border-dashed border-border-subtle p-6 rounded-2xl flex items-start gap-4">
            <div className="p-3 rounded-full bg-accent/5 shrink-0">
              <RefreshCw className="w-5 h-5 text-accent" />
            </div>
            <div className={cn("w-full flex flex-col md:flex-row justify-between items-center gap-4", language === 'ar' && "text-right md:flex-row-reverse")}>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest mb-1">{language === 'ar' ? "النسخ التلقائي" : "AUTO BACKUP"}</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                  {language === 'ar' 
                    ? "يقوم النظام تلقائيًا بحفظ نسخة من البيانات في Google Drive أو عبر البريد الإلكتروني."
                    : "The system automatically saves a copy of data to Google Drive or via Email."
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-secondary">{autoBackup ? (language === 'ar' ? 'مفعل' : 'ENABLED') : (language === 'ar' ? 'معطل' : 'DISABLED')}</span>
                <button
                  onClick={async () => {
                    const newValue = !autoBackup;
                    setAutoBackup(newValue);
                    try {
                      await api.updateSettings({ ...settings, autoBackup: newValue });
                      setMessage({ text: language === 'ar' ? "تم تحديث الإعدادات" : "Settings updated", type: 'success' });
                    } catch (e: any) {
                      setMessage({ text: e.message, type: 'error' });
                    }
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                    autoBackup ? "bg-accent" : "bg-border-subtle"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      autoBackup ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

