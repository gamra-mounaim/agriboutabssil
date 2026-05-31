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
  const [tab, setTab] = useState<'shop' | 'users'>('shop');
  
  // Shop details form state
  const [shopName, setShopName] = useState(settings?.shopName || '');
  const [shopPhone, setShopPhone] = useState(settings?.shopPhone || '');
  const [shopAddress, setShopAddress] = useState(settings?.shopAddress || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName || '');
      setShopPhone(settings.shopPhone || '');
      setShopAddress(settings.shopAddress || '');
    }
  }, [settings]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({ shopName, shopAddress, shopPhone });
      setMessage({ text: language === 'ar' ? "تم التحديث بنجاح" : "Updated successfully", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

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
    </div>
  );
}

