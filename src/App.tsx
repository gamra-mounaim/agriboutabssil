/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore, useAuthStore } from './store/useStore';
import { api } from './services/apiService';
import { 
  Store, 
  Package, 
  ShoppingCart, 
  Users, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  Search,
  Sparkles,
  UserPlus,
  User,
  Bell,
  Download,
  CheckCircle,
  ChevronRight,
  History,
  AlertCircle,
  UserCog,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Edit2,
  Eye,
  X,
  CalendarClock,
  ArrowRightLeft,
  ArrowRight,
  Hash,
  Sun,
  Moon,
  Mail,
  Phone,
  MessageSquare,
  LayoutGrid,
  FolderOpen,
  Archive,
  ChevronDown,
  CreditCard,
  TrendingUp,
  Wallet,
  MapPin,
  Cloud,
  Key,
  Lock,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
import { GlobalAlerts } from './components/GlobalAlerts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  generateInvoicePDF, 
  generateStatementPDF, 
  generateGlobalCustomerReportPDF,
  generateHistoryReportPDF,
  generateTransactionReceiptPDF,
  generateStockReportPDF
} from './services/invoiceService';

import { translations, Language } from './translations';
import { SHOP_DETAILS } from './constants';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReChartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import CheckListView from './pages/CheckListView';
import StaffManagement from './pages/StaffManagement';
import SettingsManagement from './pages/SettingsManagement';
import HistoryView from './pages/HistoryView';
import SupplierList from './pages/SupplierList';
import CustomerList from './pages/CustomerList';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import FinancialDashboardView from './pages/FinancialDashboardView';
import InvoicesView from './pages/InvoicesView';
import DamagesView from './pages/DamagesView';

import { Product, Category, SaleItem, Sale, Customer, Supplier, UserProfile, Payment, moroccanBanks, View, TransactionRecord, ActivityLog, CheckDoc, Notification } from './types';

// --- Main Component ---
export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join('.');
};

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [view, setView] = useState<View>('pos');
  const { products, categories, customers, suppliers, sales, checks, payments, activities, notifications, appUsers, settings, message, stats, latestBackup, setMessage, fetchData: refreshData, markNotificationRead: markAsRead } = useStore();
  const { language, setLanguage: setAuthLanguage, setAuth, logout: authLogout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [backingUpToDrive, setBackingUpToDrive] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff'>('staff');
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  // Sync language to DOM direction
  const t = translations[language];

  const profile = appUsers.find(u => u.id === (user?.id || user?.uid));
  const defaultAdminPerms = { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true, financialsPaymentMethods: true, financialsTopProducts: true, financialsTopDebtors: true, manageInvoices: true };
  const defaultStaffPerms = { stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false, financialsTopProducts: false, financialsTopDebtors: false, manageInvoices: false };

  const userPermissions = profile?.permissions 
    ? { 
        ...((profile?.role === 'admin' || profile?.role === 'manager') ? defaultAdminPerms : defaultStaffPerms), 
        ...profile.permissions 
      }
    : ((profile?.role === 'admin' || profile?.role === 'manager') ? defaultAdminPerms : defaultStaffPerms);

  const canAccess = (targetView: View) => {
    if (targetView === 'settings' && (profile?.role === 'admin' || profile?.role === 'manager')) return true;
    if (targetView === 'pos') return true;
    
    if (targetView === 'checks' && userPermissions.customers) return true;
    if (targetView === 'financials' && (userPermissions.financials || userPermissions.financialsRestricted)) return true;
    if (targetView === 'inventory' && userPermissions.stock) return true;
    if (targetView === 'customers' && userPermissions.customers) return true;
    if (targetView === 'suppliers' && userPermissions.supplierDebt) return true;
    if (targetView === 'history' && userPermissions.history) return true;
    if (targetView === 'invoices' && userPermissions.manageInvoices) return true;
    if (targetView === 'damages') return true;
    if (targetView === 'users' && (profile?.role === 'admin' || profile?.role === 'manager')) return true;
    
    return false;
  };

  useEffect(() => {
    if ((profile?.role === 'admin' || profile?.role === 'manager') && view === 'pos' && canAccess('financials')) {
       setView('financials');
    }
  }, [profile?.role]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsDriveConnected(true);
        setMessage({ text: t.googleDriveConnected, type: 'success' });
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [t.googleDriveConnected]);

  const checkDriveStatus = useCallback(async () => {
    try {
      const res = await api.getGoogleDriveStatus();
      if (res.connected) setIsDriveConnected(true);
    } catch (e) {
      console.error("Drive status check failed:", e);
    }
  }, []);

  useEffect(() => {
    if (user) checkDriveStatus();
  }, [user, checkDriveStatus]);

  const handleGoogleConnect = async () => {
    try {
      const { url } = await api.getGoogleAuthUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      window.open(url, 'google_auth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (e) {
      setMessage({ text: t.backupError, type: 'error' });
    }
  };

  const handleLocalBackup = async () => {
    try {
      const data = await api.getBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shopmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ text: t.backupDownloaded, type: 'success' });
    } catch (e) {
      setMessage({ text: t.backupError, type: 'error' });
    }
  };

  const handleDriveBackup = async () => {
    if (backingUpToDrive) return;
    setBackingUpToDrive(true);
    try {
      await api.backupToGoogleDrive();
      setMessage({ text: t.driveBackupSuccess, type: 'success' });
    } catch (e: any) {
      const msg = e.message || t.backupError;
      setMessage({ text: msg, type: 'error' });
      if (msg.includes('invalid_grant')) {
        setIsDriveConnected(false);
      }
    } finally {
      setBackingUpToDrive(false);
    }
  };

  useEffect(() => {
    const autoLogin = async () => {
      try {
        const stored = localStorage.getItem('pos_user');
        if (stored && stored !== 'undefined') {
          const u = JSON.parse(stored);
          if (u && u.id) {
            try {
              const verification = await api.verifySession(u.id, u.sessionVersion || u.session_version);
              if (verification && verification.status === 'invalid') {
                localStorage.removeItem('pos_user');
                authLogout();
              } else {
                setUser(u);
                setCurrentUserRole(u.role || 'staff');
                setAuth(u, u.token || '');
                setProfileReady(true);
              }
            } catch (verifErr) {
              console.warn("Session verification unreachable, keeping offline session:", verifErr);
              setUser(u);
              setCurrentUserRole(u.role || 'staff');
              setAuth(u, u.token || '');
              setProfileReady(true);
            }
          } else {
            localStorage.removeItem('pos_user');
          }
        }
      } catch (e) {
        console.error("Auto-login failed:", e);
        localStorage.removeItem('pos_user');
      }
      setLoading(false);
    };
    autoLogin();
  }, []);

  useEffect(() => {
    if (profileReady) {
      refreshData();
      // ✅ FIX: Polling reduced to 60s to reduce server load (was 30s)
      const interval = setInterval(refreshData, 60000);
      return () => clearInterval(interval);
    }
  }, [profileReady, refreshData]);

  useEffect(() => {
    const handleForceLogout = () => {
      localStorage.removeItem('pos_user');
      setUser(null);
      setProfileReady(false);
      setCurrentUserRole('staff');
      authLogout();
      setMessage({ text: t.loginFailed || "Session expired", type: 'error' });
    };
    window.addEventListener('force_logout', handleForceLogout);
    return () => window.removeEventListener('force_logout', handleForceLogout);
  }, []);

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    if (!username || !password) return;

    setSigningIn(true);
    try {
      const result = await api.login(username, password);
      if (result.status === "success") {
        const userData = result.user;
        const sessionData = {
          id: userData.id,
          uid: userData.uid,
          role: userData.role,
          username: userData.username,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          sessionVersion: userData.sessionVersion || userData.session_version,
          token: result.user.token // Ensure token is saved!
        };
        localStorage.setItem('pos_user', JSON.stringify(sessionData));
        setUser(userData);
        setCurrentUserRole(userData.role);
        setAuth(userData, result.user.token || '');
        setProfileReady(true);
        setMessage({ text: t.loginSuccess, type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: t.loginFailed, type: 'error' });
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('pos_user');
    setUser(null);
    setProfileReady(false);
    setCurrentUserRole('staff');
    authLogout();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-base text-text-secondary font-mono">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          SYSTEM_LOADING...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden bg-bg-base text-text-main">
        {/* Modern Ambient Background Glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-accent/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-pulse-slow"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60"></div>
        
        <div className="w-full max-w-md space-y-8 bg-card/60 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-2xl relative z-10 group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-accent opacity-70 group-hover:opacity-100 transition-opacity duration-500 rounded-t-[2.5rem]" />
          
          <div className="text-center space-y-4">
            <div className="inline-flex p-1.5 rounded-[2rem] bg-white/10 dark:bg-black/20 border border-border-subtle mb-2 overflow-hidden w-24 h-24 items-center justify-center shadow-xl mx-auto group-hover:scale-110 transition-transform duration-500 ease-out backdrop-blur-md">
              <Logo className="w-full h-full p-2 text-accent" />
            </div>
            <h1 className="text-4xl font-black tracking-tight font-sans">
              <span>AGRI</span>{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-blue-500">BOUTABSSIL</span>
            </h1>
            <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mt-2 bg-text-secondary/5 py-1.5 px-4 rounded-full inline-block border border-border-subtle backdrop-blur-sm">
              {t.tagline}
            </p>
          </div>

          <form onSubmit={handleTraditionalLogin} className="space-y-6 mt-8">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-2">{(t as any).username}</label>
              <div className="relative flex items-center group/input">
                <User className={cn("absolute w-5 h-5 text-text-secondary group-focus-within/input:text-accent transition-colors", language === 'ar' ? "right-4" : "left-4")} />
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={signingIn}
                  className={cn("w-full bg-bg-base/50 border-2 border-border-subtle rounded-2xl py-4 text-sm focus:border-accent focus:bg-bg-base outline-none font-semibold transition-all text-text-main placeholder-text-secondary/50", language === 'ar' ? "pr-12 text-right" : "pl-12")}
                  placeholder={(t as any).username}
                  required
                />
              </div>
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-2">{(t as any).password}</label>
              <div className="relative flex items-center group/input">
                <Lock className={cn("absolute w-5 h-5 text-text-secondary group-focus-within/input:text-accent transition-colors", language === 'ar' ? "right-4" : "left-4")} />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={signingIn}
                  className={cn("w-full bg-bg-base/50 border-2 border-border-subtle rounded-2xl py-4 text-sm focus:border-accent focus:bg-bg-base outline-none font-semibold transition-all text-text-main placeholder-text-secondary/50", language === 'ar' ? "pr-12 text-right" : "pl-12")}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-accent hover:bg-accent/90 text-white font-black py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-[11px] tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] mt-4"
            >
              {signingIn ? '...' : (t as any).accessTerminal}
            </button>
          </form>
        </div>
        <p className="mt-8 text-[9px] text-text-secondary font-mono tracking-[0.3em] opacity-40 uppercase z-10 font-bold">
          SECURE_TERMINAL_V3.0 • ENCRYPTED_SESSION
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-base text-text-main flex overflow-hidden relative">
      {/* Ambient Glassmorphism Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-accent/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 animate-pulse-slow pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none z-0" />

      {/* Sidebar */}
      <nav className="w-20 md:w-60 border-r border-white/20 flex flex-col bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-50 relative">
        <div className="p-6 hidden md:block">
          <div className="flex items-center gap-3">
             <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-accent/20 shadow-lg overflow-hidden group">
                <Logo className="w-full h-full transition-transform group-hover:scale-110 p-1" />
             </div>
             <div>
                <h1 className="text-[17px] font-black leading-none tracking-tight flex flex-col">
                   <span className="text-text-main">AGRI</span>
                   <span className="text-accent text-[12px] mt-0.5">BOUTABSSIL</span>
                </h1>
                <div className="h-[2px] w-8 bg-accent mt-2 rounded-full"></div>
             </div>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-2">
          {canAccess('financials') && <NavItem icon={<TrendingUp className="w-5 h-5 text-success" />} label={t.financialDashboard} active={view === 'financials'} onClick={() => setView('financials')} />}
          {canAccess('pos') && <NavItem icon={<ShoppingCart className="w-5 h-5 text-accent" />} label={t.pos} active={view === 'pos'} onClick={() => setView('pos')} />}
          {canAccess('inventory') && <NavItem icon={<Package className="w-5 h-5" />} label={t.inventory} active={view === 'inventory'} onClick={() => setView('inventory')} />}
          {canAccess('customers') && <NavItem icon={<Users className="w-5 h-5" />} label={t.customers} active={view === 'customers'} onClick={() => setView('customers')} />}
          {canAccess('suppliers') && <NavItem icon={<Store className="w-5 h-5" />} label={t.suppliers} active={view === 'suppliers'} onClick={() => setView('suppliers')} />}
          {canAccess('checks') && <NavItem icon={<CreditCard className="w-5 h-5" />} label={t.customerChecks} active={view === 'checks'} onClick={() => setView('checks')} />}
          {canAccess('users') && <NavItem icon={<UserPlus className="w-5 h-5" />} label={(t as any).staffNav} active={view === 'users'} onClick={() => setView('users')} />}
          {canAccess('settings') && <NavItem icon={<UserCog className="w-5 h-5" />} label={t.settings} active={view === 'settings'} onClick={() => setView('settings')} />}
          {canAccess('history') && <NavItem icon={<History className="w-5 h-5" />} label={t.history} active={view === 'history'} onClick={() => setView('history')} />}
          {canAccess('invoices') && <NavItem icon={<FileText className="w-5 h-5" />} label={(t as any).invoices} active={view === 'invoices'} onClick={() => setView('invoices')} />}
          {canAccess('damages') && <NavItem icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label={(t as any).damages} active={view === 'damages'} onClick={() => setView('damages')} />}
        </div>
        
        <div className="mx-4 my-2 p-3 bg-bg-base/80 border-2 border-accent/30 rounded-2xl shadow-inner text-center">
          <div className="text-[9px] font-black uppercase text-accent tracking-[0.25em] mb-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            {(t as any).languageLabel}
          </div>
          <div className="flex gap-1.5 justify-center">
            {(['en', 'fr', 'ar'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setAuthLanguage(lang);
                  localStorage.setItem('lang', lang);
                }}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black rounded-xl uppercase transition-all duration-300 transform active:scale-95 shadow-sm",
                  language === lang 
                    ? "bg-accent text-white border border-accent scale-105 shadow-md shadow-accent/25" 
                    : "bg-card text-text-secondary border border-border-subtle hover:text-text-main hover:border-text-secondary/30"
                )}
              >
                {lang === 'ar' ? 'العربية' : lang === 'fr' ? 'FR' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border-subtle">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-text-secondary hover:text-text-main hover:bg-bg-base/50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block text-xs font-semibold uppercase tracking-wider">{t.logout}</span>
          </button>
        </div>

        <div className="p-4 border-t border-border-subtle">
          <button 
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center gap-3 p-3 text-text-secondary hover:text-text-main hover:bg-bg-base/50 rounded-lg transition-all group"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-accent" />}
            <span className="hidden md:block text-[11px] font-bold uppercase tracking-widest">
              {theme === 'light' ? (t as any).darkMode : (t as any).lightMode}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Notification Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "absolute bottom-8 right-8 z-50 px-6 py-3 rounded-xl border text-sm font-semibold shadow-xl",
                message.type === 'success' ? "bg-white border-success text-success" : "bg-white border-danger text-danger"
              )}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="h-20 flex items-center justify-between px-12">
          <div className={cn("flex items-center gap-4", language === 'ar' ? "order-2" : "order-1")}>
            <h2 className="text-2xl font-bold tracking-tight text-text-main capitalize">
              {t[view as keyof typeof t] || view}
            </h2>
          </div>

          <div className={cn("flex items-center gap-6", language === 'ar' ? "order-1" : "order-2")}>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 relative rounded-full hover:bg-bg-base transition-colors"
                aria-label={t.notifications}
              >
                <Bell className="w-5 h-5 text-text-secondary" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute z-50 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden",
                      language === 'ar' ? "left-0" : "right-0"
                    )}
                  >
                    <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest">{t.notifications}</span>
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center opacity-30">
                          <Bell className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">{t.noNotifications}</p>
                        </div>
                      ) : (
                        notifications.map(note => (
                          <div 
                            key={note.id} 
                            className="p-4 hover:bg-bg-base/50 transition-colors group border-b border-border-subtle last:border-0"
                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-xl", note.type === 'STOCK' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500")}>
                                {note.type === 'STOCK' ? <Package className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                              </div>
                              <div className={cn("flex-1 min-w-0", language === 'ar' ? "text-right" : "text-left")}>
                                <p className="text-[11px] font-bold text-text-main line-clamp-1 uppercase">{note.title}</p>
                                <p className="text-[10px] text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">{note.message}</p>
                                <button 
                                  onClick={() => markAsRead(note.id)}
                                  className="mt-2 text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {t.markAsRead}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className={cn("flex items-center gap-4", language === 'ar' ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("hidden sm:block", language === 'ar' ? "text-right" : "text-left")}>
                <div className="text-sm font-semibold text-text-main">{user.displayName || user.username}</div>
                <div className="text-[11px] font-medium text-text-secondary">{user.email || user.role}</div>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 rounded-full border border-border-subtle" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full border border-border-subtle bg-bg-base flex items-center justify-center text-xs font-bold text-text-secondary">
                  {(user.displayName || user.username)?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-12 py-4">
          <GlobalAlerts />
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {!canAccess(view) ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50 grayscale">
                  <ShieldCheck className="w-16 h-16 text-text-secondary" />
                  <p className="text-sm font-mono uppercase tracking-widest">{(t as any).restrictedAccess}</p>
                </div>
              ) : (
                <>
                  {view === 'inventory' && <Inventory permissions={userPermissions} />}
                  {view === 'pos' && <POS />}
                  {view === 'customers' && <CustomerList />}
                  {view === 'suppliers' && <SupplierList permissions={userPermissions} />}
                  {view === 'history' && <HistoryView permissions={userPermissions} currentUserRole={currentUserRole} />}
                  {view === 'invoices' && <InvoicesView permissions={userPermissions} currentUserRole={currentUserRole} />}
                  {view === 'financials' && <FinancialDashboardView permissions={userPermissions} currency={t.currency} />}
                  {view === 'checks' && <CheckListView />}
                  {view === 'damages' && <DamagesView />}
                  {view === 'users' && <StaffManagement 
                    isDriveConnected={isDriveConnected} 
                    backingUpToDrive={backingUpToDrive} 
                    handleGoogleConnect={handleGoogleConnect} 
                    handleDriveBackup={handleDriveBackup} 
                    latestBackup={latestBackup} 
                    setBackingUpToDrive={setBackingUpToDrive} 
                  />}
                  {view === 'settings' && (
                    <SettingsManagement isDriveConnected={isDriveConnected} backingUpToDrive={backingUpToDrive} handleGoogleConnect={handleGoogleConnect} handleDriveBackup={handleDriveBackup} latestBackup={latestBackup} setBackingUpToDrive={setBackingUpToDrive} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative font-semibold",
        active ? "bg-accent/20 text-accent shadow-inner" : "text-text-secondary hover:text-text-main hover:bg-bg-base/50"
      )}
    >
      <div className={cn("transition-transform duration-200 group-hover:scale-110", active && "scale-110")}>
        {icon}
      </div>
      <span className="hidden md:block text-[14px]">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute right-[-16px] w-1.5 h-6 bg-accent rounded-l-full shadow-[0_0_10px_rgba(241,90,36,0.5)]"
        />
      )}
    </button>
  );
}

// --- View: Inventory ---
// --- View: Financial Dashboard ---
