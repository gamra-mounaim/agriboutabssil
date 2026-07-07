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
  const canManageStaff = loggedInProfile?.role === 'admin';
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
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-border-subtle pb-4">
        <button 
          onClick={() => setTab('shop')}
          className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all", tab === 'shop' ? "bg-accent text-white" : "text-text-secondary hover:bg-bg-base")}
        >
          {t.shopDetails}
        </button>
        {canManageStaff && (
          <button 
            onClick={() => setTab('users')}
            className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all", tab === 'users' ? "bg-accent text-white" : "text-text-secondary hover:bg-bg-base")}
          >
            {t.staff}
          </button>
        )}
        <button 
          onClick={() => setTab('backup')}
          className={cn("px-4 py-2 rounded-lg font-bold text-sm transition-all", tab === 'backup' ? "bg-accent text-white" : "text-text-secondary hover:bg-bg-base")}
        >
          {t.backup}
        </button>
      </div>

      {tab === 'shop' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl bg-sidebar p-8 rounded-2xl border border-border-subtle shadow-sm">
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">{t.shopName}</label>
              <input 
                type="text" 
                value={shopName || ''} 
                onChange={e => setShopName(e.target.value)} 
                className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 focus:ring-2 focus:ring-accent outline-none font-medium text-text-main placeholder:opacity-30" 
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">{t.shopPhone}</label>
              <input 
                type="text" 
                value={shopPhone || ''} 
                onChange={e => setShopPhone(e.target.value)} 
                className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 focus:ring-2 focus:ring-accent outline-none font-medium text-text-main placeholder:opacity-30" 
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">{t.shopAddress}</label>
              <textarea 
                value={shopAddress || ''} 
                onChange={e => setShopAddress(e.target.value)} 
                className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 focus:ring-2 focus:ring-accent outline-none font-medium text-text-main placeholder:opacity-30 h-24" 
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {t.updateSettings}
            </button>
          </form>
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

