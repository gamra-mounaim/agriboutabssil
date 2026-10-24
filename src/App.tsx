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

const CheckListView = React.lazy(() => import('./pages/CheckListView'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));
const SettingsManagement = React.lazy(() => import('./pages/SettingsManagement'));
const HistoryView = React.lazy(() => import('./pages/HistoryView'));
const SupplierList = React.lazy(() => import('./pages/SupplierList'));
const CustomerList = React.lazy(() => import('./pages/CustomerList'));
const POS = React.lazy(() => import('./pages/POS'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const FinancialDashboardView = React.lazy(() => import('./pages/FinancialDashboardView'));
const InvoicesView = React.lazy(() => import('./pages/InvoicesView'));
const DamagesView = React.lazy(() => import('./pages/DamagesView'));

import { Product, Category, SaleItem, Sale, Customer, Supplier, UserProfile, Payment, moroccanBanks, View, TransactionRecord, ActivityLog, CheckDoc, Notification } from './types';

// --- Main Component ---
export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
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
  const { products, categories, customers, suppliers, sales, checks, payments, activities, notifications, appUsers, settings, message, stats, latestBackup, setMessage, fetchData: refreshData, markNotificationRead: markAsRead, markAllNotificationsRead: markAllAsRead } = useStore();
  const { language, setLanguage: setAuthLanguage, setAuth, logout: authLogout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [backingUpToDrive, setBackingUpToDrive] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff'>('staff');
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const [inventoryTarget, setInventoryTarget] = useState<{
    searchQuery?: string;
    productId?: string;
    autoOpenAdjustment?: boolean;
    autoOpenEdit?: boolean;
  } | null>(null);

  const handleNotificationClick = (note: any) => {
    if (!note.isRead || note.isRead === 0) {
      markAsRead(note.id);
    }
    setShowNotifications(false);

    if (note.type === 'STOCK') {
      const rawName = note.message.includes(':') 
        ? note.message.split(':')[0].trim() 
        : note.message.trim();

      const matchedProduct = products.find(p => 
        p.name.trim().toLowerCase() === rawName.toLowerCase()
      ) || products.find(p => 
        p.name.toLowerCase().includes(rawName.toLowerCase()) || 
        rawName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (canAccess('inventory')) {
        setInventoryTarget({
          searchQuery: matchedProduct ? matchedProduct.name : rawName,
          productId: matchedProduct?.id,
          autoOpenAdjustment: true
        });
        setView('inventory');
      } else {
        setMessage({
          text: language === 'ar' ? "ليس لديك صلاحية الوصول للمخزون" : language === 'fr' ? "Accès à l'inventaire non autorisé" : "Access to inventory not authorized",
          type: 'error'
        });
      }
    } else if (note.type === 'DEBT') {
      if (canAccess('customers')) {
        setView('customers');
      }
    }
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

  useEffect(() => {
    let idleTimer: any;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      if (user) {
        idleTimer = setTimeout(() => {
          handleLogout();
          setMessage({ text: language === 'ar' ? 'تم تسجيل الخروج بسبب عدم النشاط للحماية (ساعتين)' : language === 'fr' ? 'Déconnecté pour inactivité (2 heures)' : 'Logged out due to inactivity (2 hours)', type: 'error' });
        }, 2 * 60 * 60 * 1000);
      }
    };
    if (user) {
      resetIdleTimer();
      window.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('keydown', resetIdleTimer);
      window.addEventListener('click', resetIdleTimer);
      window.addEventListener('scroll', resetIdleTimer);
      window.addEventListener('touchstart', resetIdleTimer);
    }
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [user, language]);

  // Auto Backup Hook (Runs locally to trigger serverless backend backups reliably)
  useEffect(() => {
    if (!settings?.autoBackup || !user) return;

    const runAutoBackup = async () => {
      try {
        const lastBackup = localStorage.getItem('last_auto_backup_timestamp');
        const now = Date.now();
        // Trigger auto backup every 5 hours of active app usage
        if (!lastBackup || now - parseInt(lastBackup) > 5 * 60 * 60 * 1000) {
          localStorage.setItem('last_auto_backup_timestamp', now.toString());
          
          console.log("Triggering scheduled auto-backups...");
          const promises = [];
          promises.push(api.sendBackupEmail().catch(() => {}));
          promises.push(api.backupToGoogleDrive().catch(() => {}));
          
          await Promise.all(promises);
        }
      } catch (err) {
        console.error("Auto backup error:", err);
      }
    };

    runAutoBackup();
    const interval = setInterval(runAutoBackup, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [settings?.autoBackup, user]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError((t as any).passwordsDoNotMatch);
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError(language === 'ar' ? 'يجب أن تتكون كلمة المرور من 4 أحرف على الأقل' : language === 'fr' ? 'Le mot de passe doit comporter au moins 4 caractères' : 'Password must be at least 4 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      if (res.status === 'success') {
        setMessage({ text: (t as any).passwordChangedSuccess, type: 'success' });
        
        // Update user state and local storage with the new token
        const stored = localStorage.getItem('pos_user');
        if (stored) {
          const u = JSON.parse(stored);
          u.token = res.token;
          u.sessionVersion = res.sessionVersion;
          localStorage.setItem('pos_user', JSON.stringify(u));
        }

        // Update auth state in app and useAuthStore
        const updatedUser = {
          ...user,
          sessionVersion: res.sessionVersion,
          token: res.token
        };
        setUser(updatedUser);
        setAuth(updatedUser, res.token);

        // Reset fields and close modal
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangePasswordOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      const isIncorrect = err.message?.includes('Incorrect current password');
      setPasswordError(isIncorrect ? (t as any).incorrectCurrentPassword : (t as any).passwordChangedError);
    } finally {
      setChangingPassword(false);
    }
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
      <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden bg-slate-900 text-text-main">
        {/* Crystal Clear Farm & Solar Pumping Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-[0.92] contrast-[1.08] transition-all duration-700"
          style={{ backgroundImage: `url('/agri-bg-showcase.jpg')` }}
        />
        {/* Soft elegant vignette so products and farm remain fully visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45 pointer-events-none" />

        {/* Modern Ambient Background Glows */}
        <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-accent/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-pulse-slow pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 pointer-events-none"></div>
        
        <div className="w-full max-w-md space-y-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative z-10 group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-accent opacity-70 group-hover:opacity-100 transition-opacity duration-500 rounded-t-[2.5rem]" />
          
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-white border border-border-subtle mb-2 overflow-hidden w-48 h-20 items-center justify-center shadow-xl mx-auto group-hover:scale-105 transition-transform duration-500 ease-out">
              <Logo className="w-full h-full object-contain" />
            </div>
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
      {/* Crisp Professional Farm & Equipment Background Watermark */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.16] dark:opacity-[0.20] pointer-events-none filter brightness-95 contrast-110 z-0"
        style={{ backgroundImage: `url('/agri-bg-ambient.jpg')` }}
      />
      {/* Ambient Glassmorphism Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-accent/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 animate-pulse-slow pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-60 pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className="w-20 md:w-[285px] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-[6px_0_32px_rgba(15,23,42,0.04)] dark:shadow-[6px_0_32px_rgba(0,0,0,0.3)] z-50 relative select-none h-full">
        
        {/* Top Branded Header */}
        <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/50 dark:bg-slate-900/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-emerald-500/25 shadow-xs flex items-center justify-between overflow-hidden">
            <div className="h-10 flex items-center overflow-hidden">
              <Logo className="h-8 w-auto max-w-full object-contain" />
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              PRO 3.5
            </span>
          </div>

          {/* Quick Search Shortcut Pill */}
          <div className="mt-2.5 hidden md:block">
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-xs hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-inner text-left"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-semibold flex-1 truncate">
                {language === 'ar' ? 'بحث سريع...' : language === 'fr' ? 'Recherche rapide...' : 'Quick search...'}
              </span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300/80 dark:border-slate-600 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Scrollable Nav Items grouped by category */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          
          {/* Section: Ventes & Finances */}
          {(canAccess('financials') || canAccess('pos') || canAccess('invoices')) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 hidden md:flex">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 rounded-full bg-emerald-600"></span>
                  {language === 'ar' ? 'المبيعات والمالية' : language === 'fr' ? 'Finances & Ventes' : 'Finance & Sales'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">03</span>
              </div>

              {canAccess('financials') && (
                <NavItem 
                  icon={<TrendingUp className="w-4 h-4 text-white" />} 
                  label={language === 'ar' ? 'لوحة القيادة المالية' : language === 'fr' ? 'Tableau de Bord' : 'Financial Dashboard'} 
                  active={view === 'financials'} 
                  onClick={() => setView('financials')} 
                  badge={
                    <span className="px-2 py-0.5 rounded-lg bg-black/20 text-[10px] font-extrabold text-emerald-100 border border-white/20">
                      +28.9k
                    </span>
                  }
                />
              )}

              {canAccess('pos') && (
                <NavItem 
                  icon={<ShoppingCart className="w-4 h-4" />} 
                  label={language === 'ar' ? 'نقطة البيع والكاسة' : language === 'fr' ? 'Caisse / POS' : 'POS & Cashier'} 
                  active={view === 'pos'} 
                  onClick={() => setView('pos')} 
                  iconBgClass="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400"
                  badge={
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-[9px] font-black text-emerald-800 dark:text-emerald-300 border border-emerald-300/60">
                      LIVE
                    </span>
                  }
                />
              )}

              {canAccess('invoices') && (
                <NavItem 
                  icon={<FileText className="w-4 h-4" />} 
                  label={language === 'ar' ? 'الفواتير والتواصيل' : language === 'fr' ? 'Factures & Devis' : 'Invoices & Orders'} 
                  active={view === 'invoices'} 
                  onClick={() => setView('invoices')} 
                  iconBgClass="bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 text-blue-600 dark:text-blue-400"
                  badge={
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                      PDF
                    </span>
                  }
                />
              )}
            </div>
          )}

          {/* Section: Stock & Partenaires (NOTE: Stock word FIRST as requested) */}
          {(canAccess('inventory') || canAccess('customers') || canAccess('suppliers') || canAccess('checks') || canAccess('damages')) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden md:flex">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 rounded-full bg-amber-500"></span>
                  {language === 'ar' ? 'المخزون والشركاء' : language === 'fr' ? 'Stock & Partenaires' : 'Stock & Partners'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">05</span>
              </div>

              {/* 1. Stock & Inventaire (Word Stock is explicitly first) */}
              {canAccess('inventory') && (
                <NavItem 
                  icon={<Package className="w-4 h-4" />} 
                  label={language === 'ar' ? 'المخزون والسلع' : language === 'fr' ? 'Stock & Inventaire' : 'Stock & Inventory'} 
                  active={view === 'inventory'} 
                  onClick={() => setView('inventory')} 
                  iconBgClass="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400"
                  badge={
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                      {products.length} art.
                    </span>
                  }
                />
              )}

              {canAccess('customers') && (
                <NavItem 
                  icon={<Users className="w-4 h-4" />} 
                  label={language === 'ar' ? 'الزبناء والكريديات' : language === 'fr' ? 'Clients & Crédits' : 'Customers & Debt'} 
                  active={view === 'customers'} 
                  onClick={() => setView('customers')} 
                  iconBgClass="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400"
                  badge={
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-[9px] font-black text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      {customers.filter(c => (c.debt || 0) > 0).length} dettes
                    </span>
                  }
                />
              )}

              {canAccess('suppliers') && (
                <NavItem 
                  icon={<Store className="w-4 h-4" />} 
                  label={language === 'ar' ? 'الموردين' : language === 'fr' ? 'Fournisseurs' : 'Suppliers'} 
                  active={view === 'suppliers'} 
                  onClick={() => setView('suppliers')} 
                  iconBgClass="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400"
                />
              )}

              {canAccess('checks') && (
                <NavItem 
                  icon={<CreditCard className="w-4 h-4" />} 
                  label={language === 'ar' ? 'إدارة الشيكات' : language === 'fr' ? 'Chèques Clients' : 'Customer Checks'} 
                  active={view === 'checks'} 
                  onClick={() => setView('checks')} 
                  iconBgClass="bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-purple-600 dark:text-purple-400"
                  badge={
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-[9px] font-black text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                      {checks.filter(c => c.status === 'EN_ATTENTE' || c.status === 'PENDING').length || 4} coffre
                    </span>
                  }
                />
              )}

              {canAccess('damages') && (
                <NavItem 
                  icon={<AlertTriangle className="w-4 h-4" />} 
                  label={language === 'ar' ? 'السلعة الضائعة' : language === 'fr' ? 'Déchets & Pertes' : 'Damages & Losses'} 
                  active={view === 'damages'} 
                  onClick={() => setView('damages')} 
                  iconBgClass="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 text-rose-600 dark:text-rose-400"
                />
              )}
            </div>
          )}

          {/* Section: Contrôle & Système */}
          {(canAccess('history') || canAccess('users') || canAccess('settings')) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden md:flex">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 rounded-full bg-teal-500"></span>
                  {language === 'ar' ? 'النظام والمراقبة' : language === 'fr' ? 'Contrôle & Système' : 'System & Control'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">03</span>
              </div>

              {canAccess('history') && (
                <NavItem 
                  icon={<History className="w-4 h-4" />} 
                  label={language === 'ar' ? 'سجل العمليات الكامل' : language === 'fr' ? 'Historique Global' : 'Global History'} 
                  active={view === 'history'} 
                  onClick={() => setView('history')} 
                  iconBgClass="bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/50 text-teal-600 dark:text-teal-400"
                />
              )}

              {canAccess('users') && (
                <NavItem 
                  icon={<UserPlus className="w-4 h-4" />} 
                  label={language === 'ar' ? 'إدارة الفريق' : language === 'fr' ? 'Gestion Équipe' : 'Staff Management'} 
                  active={view === 'users'} 
                  onClick={() => setView('users')} 
                  iconBgClass="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/50 text-sky-600 dark:text-sky-400"
                  badge={
                    <span className="text-[9px] font-black text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md border border-sky-300 dark:border-sky-800">
                      Admin
                    </span>
                  }
                />
              )}

              {canAccess('settings') && (
                <NavItem 
                  icon={<UserCog className="w-4 h-4" />} 
                  label={language === 'ar' ? 'إعدادات النظام' : language === 'fr' ? 'Paramètres' : 'Settings'} 
                  active={view === 'settings'} 
                  onClick={() => setView('settings')} 
                  iconBgClass="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls & User Profile Area */}
        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
          
          {/* Segmented Language Control (Fintech Pill) */}
          <div className="bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/60 dark:border-slate-700 shadow-inner hidden md:flex">
            {(['fr', 'ar', 'en'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setAuthLanguage(lang);
                  localStorage.setItem('lang', lang);
                }}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all duration-200 select-none",
                  language === lang 
                    ? "bg-emerald-600 text-white shadow-sm scale-[1.02]" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {lang === 'ar' ? 'العربية' : lang === 'fr' ? 'FR' : 'EN'}
              </button>
            ))}
          </div>

          {/* Mobile Language Button */}
          <div className="md:hidden flex justify-center">
            <button
              onClick={() => {
                const order: Language[] = ['fr', 'ar', 'en'];
                const next = order[(order.indexOf(language) + 1) % order.length];
                setAuthLanguage(next);
                localStorage.setItem('lang', next);
              }}
              className="w-10 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-emerald-600 flex items-center justify-center border border-slate-200 dark:border-slate-700"
              title="Changer de langue"
            >
              {language.toUpperCase()}
            </button>
          </div>

          {/* Executive User Card with Fast Utility Actions */}
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black flex items-center justify-center shadow-md shadow-emerald-600/30 text-sm">
                  {(profile?.name || user?.name || 'Mounaim')?.[0]?.toUpperCase() || 'M'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
              </div>
              <div className="text-start hidden md:block truncate">
                <div className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                  {profile?.name || user?.name || 'Mounaim Gamra'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-tight">
                  {profile?.role === 'admin' ? (language === 'ar' ? 'مدير عام' : 'Administrateur') : (language === 'ar' ? 'مستخدم' : 'Utilisateur')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                title={theme === 'light' ? (t as any).darkMode : (t as any).lightMode}
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
              <button 
                onClick={handleLogout}
                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prestige Developer Seal */}
          <div className="py-1 px-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/20 text-center hidden md:block">
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>CONÇU PAR <span className="text-emerald-700 dark:text-emerald-400 font-black">GAMRA MOUNAIM</span></span>
            </div>
          </div>
        </div>
      </aside>

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
                {(() => {
                  const unreadCount = notifications.filter(n => !n.isRead || n.isRead === 0).length;
                  if (unreadCount === 0) return null;
                  return (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-black shadow-sm animate-pulse-slow">
                      {unreadCount}
                    </span>
                  );
                })()}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          {notifications.filter(n => !n.isRead || n.isRead === 0).length} {(t as any).unread || (language === 'ar' ? 'غير مقروءة' : 'Unread')}
                        </span>
                        {notifications.some(n => !n.isRead || n.isRead === 0) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllAsRead();
                            }}
                            className="text-[10px] font-bold text-accent hover:text-accent/80 transition-colors underline cursor-pointer"
                          >
                            {language === 'ar' ? 'مسح الكل' : language === 'fr' ? 'Tout effacer' : 'Clear all'}
                          </button>
                        )}
                      </div>
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
                            onClick={() => handleNotificationClick(note)}
                            className={cn(
                               "p-4 transition-all group border-b border-border-subtle last:border-0 cursor-pointer select-none",
                               (!note.isRead || note.isRead === 0) ? "bg-accent/5 hover:bg-accent/15" : "bg-transparent hover:bg-bg-base/70"
                            )}
                            dir={language === 'ar' ? 'rtl' : 'ltr'}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("p-2 rounded-xl mt-1 transition-transform group-hover:scale-110", note.type === 'STOCK' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500")}>
                                {note.type === 'STOCK' ? <Package className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                              </div>
                              <div className={cn("flex-1 min-w-0", language === 'ar' ? "text-right" : "text-left")}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className={cn("text-[12px] line-clamp-1", (!note.isRead || note.isRead === 0) ? "font-black text-text-main" : "font-semibold text-text-main/80")}>
                                    {note.type === 'STOCK' && language === 'ar' ? 'تنبيه مخزون منخفض' : note.type === 'STOCK' && language === 'fr' ? 'Alerte Stock Faible' : note.type === 'STOCK' ? 'Low Stock Alert' : note.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                                    {(!note.isRead || note.isRead === 0) && <span className="w-2 h-2 rounded-full bg-accent" />}
                                    <ArrowRight className={cn("w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity", language === 'ar' && "rotate-180")} />
                                  </div>
                                </div>
                                <p className={cn("text-[11px] line-clamp-2 mt-1 leading-relaxed", (!note.isRead || note.isRead === 0) ? "text-text-main/90 font-medium" : "text-text-secondary")}>
                                    {note.type === 'STOCK' && note.message.includes('Current quantity is') ? (
                                        <>
                                            <span className="font-bold">{note.message.split(':')[0]}</span>
                                            {language === 'ar' ? ' : الكمية الحالية هي ' : language === 'fr' ? ' : Quantité actuelle est ' : ' : Current quantity is '}
                                            <span className="font-black text-red-500">{note.message.split('Current quantity is ')[1]}</span>
                                        </>
                                    ) : note.message}
                                </p>
                                <div className="mt-2.5 flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold text-accent/80 group-hover:text-accent flex items-center gap-1 uppercase tracking-wider">
                                    {language === 'ar' ? 'انقر لتعديل المخزون' : language === 'fr' ? 'Cliquer pour ajuster le stock' : 'Click to adjust stock'}
                                  </span>
                                  {(!note.isRead || note.isRead === 0) && (
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(note.id);
                                      }}
                                      className="text-[10px] font-bold text-accent hover:text-white bg-accent/10 hover:bg-accent px-2 py-1 rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                                      title={t.markAsRead}
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>{language === 'ar' ? 'تمت المعالجة' : language === 'fr' ? 'Traité' : 'Done'}</span>
                                    </button>
                                  )}
                                </div>
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
              <button 
                onClick={() => setIsChangePasswordOpen(true)}
                title={(t as any).changePassword}
                className="p-2 rounded-xl bg-bg-base/40 border border-border-subtle hover:text-accent hover:border-accent/40 text-text-secondary transition-all transform active:scale-95 cursor-pointer flex items-center justify-center"
                aria-label={(t as any).changePassword}
              >
                <Key className="w-3.5 h-3.5" />
              </button>
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

        <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-5">
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
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest animate-pulse">
                      {language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}
                    </span>
                  </div>
                }>
                  {view === 'inventory' && (
                    <Inventory 
                      permissions={userPermissions} 
                      initialTarget={inventoryTarget}
                      onClearTarget={() => setInventoryTarget(null)}
                    />
                  )}
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
                </React.Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border-subtle w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative backgrounds */}
              <div className="absolute top-[-50%] left-[-50%] w-[100%] h-[100%] bg-accent/10 rounded-full filter blur-[80px] pointer-events-none" />

              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-lg font-black uppercase tracking-wider text-text-main flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent animate-pulse" />
                  {(t as any).changePassword}
                </h3>
                <button
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                  }}
                  className="p-1.5 rounded-xl hover:bg-bg-base transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              {passwordError && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/25 text-danger text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 relative z-10">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {(t as any).currentPassword}
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full bg-bg-base/50 border border-border-subtle rounded-xl py-3 px-4 text-sm focus:border-accent focus:bg-bg-base outline-none transition-all text-text-main placeholder-text-secondary/35"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {(t as any).newPassword}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-bg-base/50 border border-border-subtle rounded-xl py-3 px-4 text-sm focus:border-accent focus:bg-bg-base outline-none transition-all text-text-main placeholder-text-secondary/35"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {(t as any).confirmNewPassword}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-bg-base/50 border border-border-subtle rounded-xl py-3 px-4 text-sm focus:border-accent focus:bg-bg-base outline-none transition-all text-text-main placeholder-text-secondary/35"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangePasswordOpen(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError(null);
                    }}
                    className="flex-1 bg-bg-base hover:bg-bg-base/80 text-text-main font-bold py-3 rounded-2xl active:scale-[0.98] transition-all text-[11px] tracking-wider uppercase border border-border-subtle cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 bg-accent hover:bg-accent/90 text-white font-black py-3 rounded-2xl active:scale-[0.98] transition-all text-[11px] tracking-wider uppercase shadow-[0_0_15px_rgba(79,70,229,0.2)] disabled:opacity-75 cursor-pointer"
                  >
                    {changingPassword ? '...' : t.saveChanges}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


function NavItem({ 
  icon, 
  label, 
  active, 
  onClick,
  badge,
  iconBgClass
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: React.ReactNode;
  iconBgClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative text-start select-none font-bold border",
        active 
          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border-emerald-400/30 scale-[1.01]" 
          : "text-slate-700 dark:text-slate-300 border-transparent hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs hover:border-emerald-500/20 hover:-translate-y-0.5"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 shrink-0",
        active 
          ? "bg-white/20 text-white shadow-xs backdrop-blur-xs" 
          : cn(iconBgClass || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", "group-hover:scale-105 shadow-2xs")
      )}>
        {icon}
      </div>
      <span className={cn(
        "hidden md:block text-[13px] tracking-tight truncate flex-1",
        active ? "font-bold text-white" : "font-semibold"
      )}>
        {label}
      </span>
      {badge && <span className="hidden md:inline-flex shrink-0">{badge}</span>}
      {active && (
        <motion.span 
          layoutId="sidebar-active-dot"
          className="hidden md:block w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" 
        />
      )}
      {!active && (
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block shrink-0" />
      )}
    </button>
  );
}

// --- View: Inventory ---
// --- View: Financial Dashboard ---
