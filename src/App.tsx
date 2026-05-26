/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './components/Logo';
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

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  minStock?: number;
  barcode?: string;
  categoryId?: string;
  supplier?: string;
  supplierId?: string;
  updatedAt?: any;
}

interface Category {
  id: string;
  name: string;
  createdAt?: any;
}

interface SaleItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

interface Sale {
  id: string;
  invoiceNumber: number;
  total: number;
  subtotal?: number;
  discount?: number;
  date: string;
  items: SaleItem[];
  createdAt: any;
  customerId?: string;
  staffId: string;
  paymentMethod?: string;
  checkNumber?: string;
  checkOwner?: string;
}

interface Customer {
  id: string;
  name: string;
  debt: number;
  email?: string;
  phone?: string;
  address?: string;
  due_date?: string;
  dueDate?: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  debt: number;
  due_date?: string;
  dueDate?: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'manager';
  permissions?: {
    stock?: boolean;
    customers?: boolean;
    history?: boolean;
    profits?: boolean;
    viewCostPrice?: boolean;
    editStock?: boolean;
    supplierDebt?: boolean;
    financials?: boolean;
    financialsSales?: boolean;
    financialsDebts?: boolean;
    financialsProfits?: boolean;
    financialsInventory?: boolean;
    viewSupplierDebtAmount?: boolean;
    financialsRestricted?: boolean;
    financialsPaymentMethods?: boolean;
  };
  createdAt: any;
}

interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  staffId: string;
  payment_method?: string;
  check_number?: string;
  check_owner?: string;
  check_due_date?: string;
}

export const moroccanBanks = [
  'CIH Bank',
  'Banque Populaire',
  'Attijariwafa Bank',
  'BMCE Bank',
  'Société Générale',
  'Crédit Agricole',
  'Al Barid Bank',
  'بنك آخر...'
];

type View = 'inventory' | 'pos' | 'customers' | 'suppliers' | 'history' | 'settings' | 'checks' | 'financials';

interface TransactionRecord {
  id: string;
  type: 'PAYMENT' | 'DEBT' | 'SALE';
  amount: number;
  date: string;
  description: string;
}

interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actorId: string;
  actorName: string;
  timestamp: string;
}

interface CheckDoc {
  id: string;
  checkNumber: string;
  checkOwner: string;
  total: number;
  date: string;
  partyName: string;
  partyRole: 'customer' | 'supplier';
  type: 'sale' | 'payment' | 'supplier_payment';
}

interface Notification {
  id: string;
  type: 'STOCK' | 'DEBT' | 'SYSTEM';
  title: string;
  message: string;
  isRead: number;
  createdAt: string;
}

// --- Main Component ---
export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [view, setView] = useState<View>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [checks, setChecks] = useState<CheckDoc[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [appUsers, setAppUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [backingUpToDrive, setBackingUpToDrive] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff'>('staff');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [latestBackup, setLatestBackup] = useState<any>(null);
  const [language, setLanguage] = useState<Language>((localStorage.getItem('lang') as Language) || 'fr');
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  const t = translations[language];

  const profile = appUsers.find(u => u.id === (user?.id || user?.uid));
  const defaultAdminPerms = { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true, financialsPaymentMethods: true };
  const defaultStaffPerms = { stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false };

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
      setMessage({ text: language === 'ar' ? "تم تحميل النسخة الاحتياطية بنجاح" : "Backup downloaded successfully", type: 'success' });
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
      setMessage({ text: e.message || t.backupError, type: 'error' });
    } finally {
      setBackingUpToDrive(false);
    }
  };

  const refreshData = useCallback(async () => {
    // Periodically verify session validity
    const stored = localStorage.getItem('pos_user');
    if (stored && stored !== 'undefined') {
      try {
        const u = JSON.parse(stored);
        if (u && u.id) {
          const verification = await api.verifySession(u.id, u.sessionVersion || u.session_version);
          if (verification && verification.status === 'invalid') {
            setMessage({ 
              text: language === 'ar' ? "تم إنهاء الجلسة. يرجى تسجيل الدخول مجدداً." : "Session expired. Please log in again.", 
              type: 'error' 
            });
            localStorage.removeItem('pos_user');
            setUser(null);
            setProfileReady(false);
            setCurrentUserRole('staff');
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to verify session during polling:", e);
      }
    }

    try {
      const fetchData = async (fn: () => Promise<any>, fallback: any, name: string, retries = 3) => {
        try {
          const res = await fn();
          return res;
        } catch (err: any) {
          if (err.name === 'AbortError') return fallback;
          
          // Retry logic for connection issues or server starting up
          const isNetworkError = err.message.includes('Failed to fetch') || 
                                err.message.includes('NetworkError') ||
                                err.message.includes('status: 502') ||
                                err.message.includes('status: 503') ||
                                err.message.includes('status: 504');

          if (retries > 0 && isNetworkError) {
            console.warn(`Retrying fetch for ${name}... (${retries} retries left)`);
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
            return fetchData(fn, fallback, name, retries - 1);
          }

          console.error(`Error fetching ${name}:`, err);
          return fallback;
        }
      };

      // Sequential fetching to avoid overwhelming server during startup/compilation
      const prods = await fetchData(api.getProducts, [], 'Products');
      const cats = await fetchData(api.getCategories, [], 'Categories');
      const custs = await fetchData(api.getCustomers, [], 'Customers');
      const supps = await fetchData(api.getSuppliers, [], 'Suppliers');
      const sls = await fetchData(api.getSales, [], 'Sales');
      const cks = await fetchData(api.getChecks, [], 'Checks');
      const pymts = await fetchData(api.getPayments, [], 'Payments');
      const stts = await fetchData(api.getStats, null, 'Stats');
      const usrs = await fetchData(api.getUsers, [], 'Users');
      const logs = await fetchData(api.getActivityLogs, [], 'Activity');
      const stngs = await fetchData(api.getSettings, null, 'Settings');
      const notes = await fetchData(api.getNotifications, [], 'Notifications');
      const latest = await fetchData(api.getLatestBackup, null, 'LatestBackup');

      if (prods) setProducts(Array.isArray(prods) ? prods : []);
      if (cats) setCategories(Array.isArray(cats) ? cats : []);
      if (custs) setCustomers(Array.isArray(custs) ? custs : []);
      if (supps) setSuppliers(Array.isArray(supps) ? supps : []);
      if (sls) setSales(Array.isArray(sls) ? sls : []);
      if (cks) setChecks(Array.isArray(cks) ? cks : []);
      if (pymts) setPayments(Array.isArray(pymts) ? pymts : []);
      if (stts) setStats(stts);
      if (usrs) setAppUsers(Array.isArray(usrs) ? usrs : []);
      if (logs) setActivities(Array.isArray(logs) ? logs : []);
      if (stngs) setSettings(stngs);
      if (notes) setNotifications(Array.isArray(notes) ? notes : []);
      if (latest) setLatestBackup(latest);
    } catch (e) {
      console.error("Critical Refresh Error:", e);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to mark as read", err);
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
              } else {
                setUser(u);
                setCurrentUserRole(u.role || 'staff');
                setProfileReady(true);
              }
            } catch (verifErr) {
              console.warn("Session verification unreachable, keeping offline session:", verifErr);
              setUser(u);
              setCurrentUserRole(u.role || 'staff');
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
      const interval = setInterval(refreshData, 30000); // Polling every 30s
      return () => clearInterval(interval);
    }
  }, [profileReady, refreshData]);

  const handleGoogleLogin = () => {
    setMessage({ text: language === 'ar' ? "تسجيل الدخول عبر Google غير متاح في النسخة المكتبية." : "Google login is disabled in desktop version.", type: 'error' });
  };

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    if (!username || !password) return;

    setSigningIn(true);
    try {
      const result = await api.login(username, password);
      if (result.status === "success") {
        const userData = result.user;
        localStorage.setItem('pos_user', JSON.stringify(userData));
        setUser(userData);
        setCurrentUserRole(userData.role);
        setProfileReady(true);
        setMessage({ text: language === 'ar' ? "تم الدخول بنجاح" : "Login Successful", type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "خطأ في الاسم أو كلمة المرور" : "Invalid username or password", type: 'error' });
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('pos_user');
    setUser(null);
    setProfileReady(false);
    setCurrentUserRole('staff');
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
      <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden px-6" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)' }}>
        {/* Decorative background shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

        <div className="w-full max-w-md space-y-8 bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] relative z-10 group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-blue-500 to-accent opacity-70 group-focus-within:opacity-100 transition-opacity" />
          
          <div className="text-center space-y-3">
            <div className="inline-flex p-1.5 rounded-[2rem] bg-white border border-gray-100 mb-2 overflow-hidden w-24 h-24 items-center justify-center shadow-lg mx-auto group hover:scale-105 transition-transform duration-300">
              <Logo className="w-full h-full p-2" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-800">
              <span className="text-green-700">AGRI</span>{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-orange-400">BOUTABSSIL</span>
            </h1>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.15em] mt-2 bg-gray-50 py-1.5 px-4 rounded-full inline-block border border-gray-100">
              {language === 'fr' ? 'Solutions Agricoles & Industrielles' : (language === 'ar' ? 'حلول فلاحية وصناعية' : 'Agricultural & Industrial Solutions')}
            </p>
          </div>

          <form onSubmit={handleTraditionalLogin} className="space-y-5">
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold uppercase text-gray-600 ml-2">{language === 'ar' ? 'اسم المستخدم' : 'USERNAME'}</label>
              <div className="relative flex items-center">
                <User className={cn("absolute w-5 h-5 text-gray-400", language === 'ar' ? "right-4" : "left-4")} />
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={signingIn}
                  className={cn("w-full bg-gray-50/50 border-2 border-gray-200 rounded-2xl py-3.5 text-sm focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(241,90,36,0.1)] outline-none font-semibold transition-all text-gray-800 placeholder-gray-400", language === 'ar' ? "pr-12 text-right" : "pl-12")}
                  placeholder={language === 'ar' ? "أدخل اسم المستخدم" : "Enter your username"}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold uppercase text-gray-600 ml-2">{language === 'ar' ? 'كلمة المرور' : 'PASSWORD'}</label>
              <div className="relative flex items-center">
                <Lock className={cn("absolute w-5 h-5 text-gray-400", language === 'ar' ? "right-4" : "left-4")} />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={signingIn}
                  className={cn("w-full bg-gray-50/50 border-2 border-gray-200 rounded-2xl py-3.5 text-sm focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_rgba(241,90,36,0.1)] outline-none font-semibold transition-all text-gray-800 placeholder-gray-400", language === 'ar' ? "pr-12 text-right" : "pl-12")}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-gradient-to-r from-accent to-orange-500 text-white font-bold py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-sm tracking-widest uppercase shadow-lg shadow-accent/30 mt-2"
            >
              {signingIn ? '...' : (language === 'ar' ? 'دخول النظام' : 'ACCESS TERMINAL')}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-3 italic">OR</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={signingIn}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-[11px] uppercase tracking-wider"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4 opacity-80" referrerPolicy="no-referrer" />
            {t.login}
          </button>
        </div>
        <p className="mt-8 text-[10px] text-gray-500 font-mono tracking-widest opacity-60 uppercase z-10 font-semibold">
          SECURE_TERMINAL_V2.0 • ENCRYPTED_SESSION
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-transparent text-text-main flex overflow-hidden">
      {/* Sidebar */}
      <nav className="w-20 md:w-60 border-r border-white/20 flex flex-col bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-50">
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
          {canAccess('settings') && <NavItem icon={<UserCog className="w-5 h-5" />} label={t.settings} active={view === 'settings'} onClick={() => setView('settings')} />}
          {canAccess('history') && <NavItem icon={<History className="w-5 h-5" />} label={t.history} active={view === 'history'} onClick={() => setView('history')} />}
        </div>
        
        <div className="mx-4 my-2 p-3 bg-bg-base/80 border-2 border-accent/30 rounded-2xl shadow-inner text-center">
          <div className="text-[9px] font-black uppercase text-accent tracking-[0.25em] mb-2 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            {language === 'ar' ? 'لغة الموقع / LANGUE' : 'LANGUE DU SITE'}
          </div>
          <div className="flex gap-1.5 justify-center">
            {(['en', 'fr', 'ar'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
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
              {theme === 'light' ? (language === 'ar' ? 'الوضع الليلي' : 'Dark Mode') : (language === 'ar' ? 'الوضع النهاري' : 'Light Mode')}
            </span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
                  <p className="text-sm font-mono uppercase tracking-widest">{language === 'ar' ? "وصول محدود // يرجى مراجعة المسؤول" : "RESTRICTED // CONTACT ADMIN"}</p>
                </div>
              ) : (
                <>
                  {view === 'inventory' && <Inventory products={products} categories={categories} suppliers={suppliers} setMessage={setMessage} language={language} onRefresh={refreshData} permissions={userPermissions} />}
                  {view === 'pos' && <POS products={products} categories={categories} customers={customers} user={user} settings={settings} setMessage={setMessage} language={language} onRefresh={refreshData} />}
                  {view === 'customers' && <CustomerList customers={customers} user={user} settings={settings} setMessage={setMessage} language={language} onRefresh={refreshData} payments={payments} sales={sales} products={products} />}
                  {view === 'suppliers' && <SupplierList suppliers={suppliers} checks={checks} user={user} settings={settings} setMessage={setMessage} language={language} onRefresh={refreshData} permissions={userPermissions} />}
                  {view === 'history' && <HistoryView sales={sales} payments={payments} activities={activities} customers={customers} appUsers={appUsers} settings={settings} language={language} onRefresh={refreshData} permissions={userPermissions} currentUserRole={currentUserRole} />}
                  {view === 'financials' && <FinancialDashboardView stats={stats} sales={sales} payments={payments} customers={customers} suppliers={suppliers} language={language} currency={t.currency} products={products} settings={settings} permissions={userPermissions} />}
                  {view === 'checks' && <CheckListView checks={checks} language={language} settings={settings} />}
                  {view === 'settings' && (
                    <SettingsManagement 
                      users={appUsers} 
                      settings={settings} 
                      setMessage={setMessage} 
                      currentUser={user} 
                      language={language} 
                      onRefresh={refreshData}
                      isDriveConnected={isDriveConnected}
                      backingUpToDrive={backingUpToDrive}
                      handleGoogleConnect={handleGoogleConnect}
                      handleDriveBackup={handleDriveBackup}
                      latestBackup={latestBackup}
                      setBackingUpToDrive={setBackingUpToDrive}
                    />
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

// --- Component: Dashboard Highlights ---
function DashboardStats({ products, categories, customers, sales, language, stats, permissions }: { products: Product[], categories: Category[], customers: Customer[], sales: Sale[], language: Language, stats: any, permissions: any }) {
  const t = translations[language];
  
  const upcomingDebts = (customers || []).filter(c => {
    const cDueDate = c.dueDate || c.due_date;
    if (!cDueDate || c.debt <= 0) return false;
    const dueDate = new Date(cDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    // Near if overdue or within next 3 days
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  const totalSalesLifetime = stats?.totalSales || 0;
  const totalStockUnits = stats?.totalStock || 0;
  const totalInventoryValue = stats?.inventoryValue || 0;
  const totalExpectedProfit = stats?.expectedProfit || 0;
  const customersWithDebtCount = (customers || []).filter(c => c.debt > 0).length;
  const totalDebtValue = stats?.outstandingDebt || 0;
  const totalSupplierDebtValue = stats?.supplierDebt || 0;

  const lowStockCount = products.filter(p => p.qty <= (p.minStock ?? 5) && p.qty > 0).length;
  const outOfStockCount = products.filter(p => p.qty === 0).length;
  
  const todayDateStr = new Date().toLocaleDateString();
  const salesToday = sales.filter(s => new Date(s.date).toLocaleDateString() === todayDateStr);
  const revenueTodayValue = salesToday.reduce((acc, curr) => acc + curr.total, 0);

  // Chart Data
  const categoryValueData = (categories || []).map(cat => {
    const value = products
      .filter(p => p.categoryId === cat.id)
      .reduce((acc, p) => acc + ((p.costPrice || 0) * p.qty), 0);
    return { name: cat.name, value };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString();
    const daySales = sales.filter(s => new Date(s.date).toLocaleDateString() === dateStr);
    return {
      date: dateStr.split('/')[0] + '/' + dateStr.split('/')[1], // Short date
      amount: daySales.reduce((acc, s) => acc + s.total, 0)
    };
  }).reverse();

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 mb-8">
      {upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-[13px] font-semibold opacity-90">
              {language === 'ar' 
                ? `هناك ${upcomingDebts.length} زبناء لديهم ديون مستحقة الأداء.` 
                : `There are ${upcomingDebts.length} customers with upcoming or overdue debt payments.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingDebts.slice(0, 3).map(c => {
              const cDueDate = c.dueDate || c.due_date;
              const isOverdue = new Date(cDueDate!) < new Date();
              return (
                <div key={c.id} className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-2",
                  isOverdue ? "bg-red-500 text-white border-red-600" : "bg-bg-base border-border-subtle text-text-main"
                )}>
                  <span>{c.name}</span>
                  <span className="opacity-60">{cDueDate}</span>
                </div>
              );
            })}
            {upcomingDebts.length > 3 && <span className="text-xs items-center flex font-bold">+ {upcomingDebts.length - 3}</span>}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 group/stats">
        <StatCard 
          label={t.totalSales} 
          value={`${formatNumber(totalSalesLifetime)} ${t.currency}`} 
          sub={language === 'ar' ? "إجمالي الأرباح" : "Lifetime Earnings"} 
          highlights
        />
        {permissions.profits && (
          <>
            <StatCard 
              label={t.inventoryValue} 
              value={`${formatNumber(totalInventoryValue)} ${t.currency}`} 
              sub={language === 'ar' ? "قيمة المخزون الإجمالية" : "Current Asset Value"} 
            />
            <StatCard 
              label={t.expectedProfit} 
              value={`${formatNumber(totalExpectedProfit)} ${t.currency}`} 
              sub={language === 'ar' ? "الأرباح المتوقعة" : "Projected Gain"} 
            />
          </>
        )}
        <StatCard 
          label={t.customersWithDebt} 
          value={formatNumber(customersWithDebtCount)} 
          sub={language === 'ar' ? "زبناء بذمتهم مبالغ" : "Customers with balance"} 
        />
        <StatCard 
          label={language === 'ar' ? "الديون المعلقة" : "Outstanding Debt"} 
          value={`${formatNumber(totalDebtValue)} ${t.currency}`} 
          sub={language === 'ar' ? "محفظة الديون" : "Debt Portfolio"} 
          danger={totalDebtValue > 500} 
        />
        <StatCard 
          label={t.totalSupplierDebt} 
          value={`${formatNumber(totalSupplierDebtValue)} ${t.currency}`} 
          sub={t.youOweSupplier} 
          danger={totalSupplierDebtValue > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trend */}
        <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold text-text-main flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              {language === 'ar' ? "اتجاه المبيعات (7 أيام)" : "SALES TREND (LAST 7 DAYS)"}
            </h4>
            <div className="text-xs font-black text-accent bg-accent/10 px-3 py-1 rounded-full">
              {formatNumber(last7Days.reduce((acc, curr) => acc + curr.amount, 0))} {t.currency}
            </div>
          </div>
          <div className="h-[250px] w-full">
            {last7Days.every(d => d.amount === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-bold uppercase tracking-widest">{language === 'ar' ? "لا توجد مبيعات" : "NO SALES"}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} dy={10} />
                  <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} />
                  <ReChartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#6366f1' }}
                    formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'المبيعات' : 'Sales']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                    dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[350px]">
          <h4 className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mb-6 flex items-center justify-between w-full">
            <span>{t.stockAlerts}</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const criticalItems = products.filter(p => p.qty <= (p.minStock ?? 5));
                  generateStockReportPDF({
                    items: criticalItems,
                    generatedAt: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                    language: language
                  });
                }}
                className="bg-bg-base hover:bg-white text-text-secondary hover:text-accent border border-border-subtle hover:border-accent p-1.5 rounded-lg transition-all"
                title={language === 'ar' ? "تصدير" : "Export"}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <span className="bg-danger/10 text-danger px-2 py-0.5 rounded text-[10px] font-black">
                {products.filter(p => p.qty <= (p.minStock ?? 5)).length}
              </span>
            </div>
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {products.filter(p => p.qty <= (p.minStock ?? 5)).sort((a, b) => a.qty - b.qty).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-xl hover:border-danger/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                    p.qty === 0 ? "bg-orange-500 text-white" : "bg-danger text-white"
                  )}>
                    {p.qty}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-text-main group-hover:text-danger transition-colors">{p.name}</div>
                    <div className="text-[10px] text-text-secondary flex items-center gap-2">
                       <span>Min: {p.minStock ?? 5}</span>
                       {p.supplier && <span className="font-bold text-accent">• {p.supplier}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-text-main">{formatNumber(p.price)} {t.currency}</div>
                  <div className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    p.qty === 0 ? "text-orange-600" : "text-danger"
                  )}>
                    {p.qty === 0 ? t.outOfStock : t.lowStock}
                  </div>
                </div>
              </div>
            ))}
            {products.filter(p => p.qty <= (p.minStock ?? 5)).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 py-10">
                <ShieldCheck className="w-10 h-10 text-success" />
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t.noStockAlerts}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlights, danger }: { label: string, value: string | number, sub: string, highlights?: boolean, danger?: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border transition-all duration-300",
      highlights ? "bg-accent text-white border-accent shadow-lg shadow-accent/10" : "bg-white border-border-subtle group-hover/stats:odd:border-accent/20"
    )}>
      <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", highlights ? "text-white/60" : "text-text-secondary")}>{label}</div>
      <div className="text-3xl font-bold tracking-tighter mb-1 font-mono">{value}</div>
      <div className={cn("text-[11px] font-medium", highlights ? "text-white/80" : danger ? "text-danger" : "text-text-secondary")}>{sub}</div>
    </div>
  );
}

// --- View: Inventory ---
// --- View: Financial Dashboard ---
function FinancialDashboardView({ stats, sales, payments, customers, suppliers, language, currency, products, settings, permissions }: { stats: any, sales: any[], payments: any[], customers: any[], suppliers: any[], language: Language, currency: string, products: any[], settings: any, permissions: any }) {
  const t = translations[language];
  const isAr = language === 'ar';

    const totalRevenue = stats?.totalSales || 0;
  const netProfit = stats?.expectedProfit || 0;
  const totalCustomerDebt = stats?.outstandingDebt || 0;
  const dailyProfit = stats?.dailyProfit || 0;
  const weeklyProfit = stats?.weeklyProfit || 0;
  const monthlyProfit = stats?.monthlyProfit || 0;
  const yearlyProfit = stats?.yearlyProfit || 0;
  const totalSupplierDebt = stats?.supplierDebt || 0;
  const inventoryAssetValue = stats?.inventoryValue || 0;

  const lowStock = products.filter(p => p.qty <= (p.minStock ?? settings?.lowStockThreshold ?? 5));

    // Upcoming Debts Logic from DashboardStats
  const upcomingDebts = (customers || []).filter(c => {
    const cDueDate = c.dueDate || c.due_date;
    if (!cDueDate || c.debt <= 0) return false;
    const dueDate = new Date(cDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  const upcomingSupplierDebts = (suppliers || []).filter(s => {
    const sDueDate = s.dueDate || s.due_date;
    if (!sDueDate || s.debt <= 0) return false;
    const dueDate = new Date(sDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).sort((a, b) => new Date((a.dueDate || a.due_date)!).getTime() - new Date((b.dueDate || b.due_date)!).getTime());

  // Trend Data (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const trendData = last7Days.map(date => {
    const total = sales
      .filter(s => s.date && typeof s.date === 'string' && s.date.startsWith(date))
      .reduce((sum, s) => sum + s.total, 0);
    return {
      date: date.split('-').reverse().slice(0, 2).reverse().join('/'),
      amount: total
    };
  });

  const paymentStats = useMemo(() => {
    let cash = 0, card = 0, wallet = 0, debt = 0, total = 0;
    sales.forEach(s => {
      const amount = s.total || 0;
      total += amount;
      const m = (s.paymentMethod || 'cash').toLowerCase();
      if (m === 'cash') cash += amount;
      else if (m === 'card') card += amount;
      else if (m === 'debt') debt += amount;
      else if (m === 'check') wallet += amount; // We'll map check/other to digital wallet/checks
      else wallet += amount; 
    });
    return {
      total,
      cash, cashPct: total > 0 ? Math.round((cash / total) * 100) : 0,
      card, cardPct: total > 0 ? Math.round((card / total) * 100) : 0,
      wallet, walletPct: total > 0 ? Math.round((wallet / total) * 100) : 0,
      debt, debtPct: total > 0 ? Math.round((debt / total) * 100) : 0,
    };
  }, [sales]);

  const renderPaymentMethodsWidget = () => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
          {(t as any).usedPaymentMethods}
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
            3
          </span>
        </div>
      </div>
      <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
        {/* Cash */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-emerald-600">
              <span className="font-bold text-lg">💰</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.cash}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.cashPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-emerald-600">{formatNumber(paymentStats.cash)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Card */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-blue-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-blue-600">
              <span className="font-bold text-lg">💳</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.card}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.cardPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-blue-600">{formatNumber(paymentStats.card)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Check */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-amber-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-amber-600">
              <span className="font-bold text-lg">📝</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{(t as any).check}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.walletPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-amber-600">{formatNumber(paymentStats.wallet)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>

        {/* Debt */}
        <div className="flex items-center justify-between p-4 bg-bg-base/50 rounded-2xl border border-transparent hover:border-red-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-red-600">
              <span className="font-bold text-lg">📒</span>
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">{t.debt}</div>
              <div className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{paymentStats.debtPct}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-red-600">{formatNumber(paymentStats.debt)}</div>
            <div className="text-[9px] font-bold text-text-secondary uppercase">{t.currency}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ title, value, subtext, color = "text-text-main", bg = "bg-card", showCurrency = true }: any) => (
    <div className={`${bg} p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]`}>
      <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{title}</div>
      <div className="flex flex-col items-center">
        <div className={`text-4xl font-black ${color}`}>{value}</div>
        {showCurrency && <div className={`text-sm font-bold mt-1 ${color}`}>{isAr ? 'درهم' : currency}</div>}
      </div>
      <div className="text-[10px] text-text-secondary/60 font-medium mt-4">{subtext}</div>
    </div>
  );

  // Check if no dashboard elements are permitted
  if (!permissions.financialsSales && !permissions.financialsDebts && !permissions.financialsProfits && !permissions.financialsInventory && !permissions.supplierDebt && !permissions.financialsRestricted && !permissions.financialsPaymentMethods) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4 opacity-75">
        <ShieldCheck className="w-16 h-16 text-text-secondary animate-pulse" />
        <p className="text-sm font-bold text-text-secondary uppercase tracking-widest text-center">
          {t.noFinancialPermissions}
        </p>
      </div>
    );
  }

  if (permissions.financialsRestricted && !permissions.financials) {
    const debtorCustomers = customers.filter(c => c.debt > 0);
    const debtorCustomersCount = debtorCustomers.length;
    
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Simplified Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Profit Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[180px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.todayProfit}</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
            </div>
            <div className={cn(isAr && "text-right")}>
              <span className="text-3xl font-black text-emerald-600">{formatNumber(dailyProfit)}</span>
              <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
            </div>
          </div>

          {/* Debtor Customers Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col items-center text-center justify-between min-h-[180px]">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
              {t.debtorCustomers}
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-black text-text-main font-mono">{formatNumber(debtorCustomersCount)}</div>
              <div className="text-sm font-bold text-text-secondary mt-1">{t.customerCountUnit}</div>
            </div>
            <div className="text-[10px] text-text-secondary/60 font-medium mt-4">
              {t.customersWithBalance}
            </div>
          </div>
        </div>

        {/* Simplified Charts & Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                {t.salesTrend7Days}
              </h3>
              <div className="text-sm font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                {formatNumber(trendData.reduce((acc: number, curr: any) => acc + curr.amount, 0))} {t.currency}
              </div>
            </div>
            <div className="h-[250px] w-full">
              {trendData.every((d: any) => d.amount === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.noSalesInPeriod || "NO SALES"}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorSalesRestricted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} />
                    <ReChartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#6366f1' }}
                      formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, language === 'ar' ? 'المبيعات' : 'Sales']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#6366f1" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorSalesRestricted)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                      dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Critical Stock Alerts */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">
                {t.stockAlerts}
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">
                  {lowStock.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
              {lowStock.length > 0 ? (
                lowStock.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white border border-border-subtle flex items-center justify-center text-accent shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-text-main truncate" title={p.name}>{p.name}</div>
                        <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{p.category}</div>
                      </div>
                    </div>
                    <div className="text-right pl-2 shrink-0">
                      <div className="text-base font-black text-danger">{p.qty}</div>
                      <div className="text-[8px] font-bold text-text-secondary uppercase">{t.inStock}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-3xl bg-success/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-sm font-bold text-text-secondary">
                    {t.noStockAlerts}
                  </p>
                </div>
              )}
            </div>
          </div>
          {permissions.financialsPaymentMethods && renderPaymentMethodsWidget()}
        </div>
      </div>
    );
  }

  // Count visible stats cards to dynamically calculate responsive layout columns
  const visibleCardsCount = [
    permissions.financialsDebts, // Pending Debts
    permissions.financialsDebts, // Debtor Customers
    permissions.financialsProfits, // Expected Profit
    permissions.financialsInventory, // Inventory Value
    permissions.financialsSales // Total Revenue (Black Card)
  ].filter(Boolean).length;

  const gridColsClass = 
    visibleCardsCount === 5 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" :
    visibleCardsCount === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
    visibleCardsCount === 3 ? "grid-cols-1 md:grid-cols-3" :
    visibleCardsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {permissions.financialsDebts && upcomingDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-red-500 overflow-hidden relative shadow-sm"
        >
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingDebtPayments}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingDebts.map(c => `${c.name} (${c.dueDate || c.due_date})`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}

      {permissions.supplierDebt && upcomingSupplierDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex flex-wrap items-center gap-4 text-amber-600 overflow-hidden relative shadow-sm"
        >
          <div className="bg-amber-500 p-2 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              {t.upcomingSupplierDebtDueDates}
            </p>
            <p className="text-xs font-bold font-mono">
               {upcomingSupplierDebts.map(s => `${s.name} (${s.dueDate || s.due_date})`).join(', ')}
            </p>
          </div>
        </motion.div>
      )}

            {/* Top Stats Grid */}
      {visibleCardsCount > 0 && (
        <div className={`grid ${gridColsClass} gap-6`}>
          {permissions.financialsDebts && (
            <>
              <StatCard 
                title={t.pendingDebts} 
                value={formatNumber(totalCustomerDebt)} 
                subtext={t.debtWallet}
              />
              <StatCard 
                title={t.debtorCustomers} 
                value={formatNumber(customers.filter(c => c.debt > 0).length)} 
                subtext={t.customersWithBalance}
                color="text-text-main"
                showCurrency={false}
              />
            </>
          )}
          {permissions.financialsProfits && (
            <StatCard 
              title={t.expectedProfit} 
              value={formatNumber(netProfit)} 
              subtext={t.expectedProfit}
            />
          )}
          {permissions.financialsInventory && (
            <StatCard 
              title={t.inventoryValue} 
              value={formatNumber(inventoryAssetValue)} 
              subtext={t.totalInventoryValue}
            />
          )}
                    {permissions.financialsSales && (
            /* Black Card */
            <div className="bg-black p-6 rounded-[2.5rem] flex flex-col items-center text-center justify-between min-h-[180px] shadow-xl shadow-black/10">
              <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">AGRI BOUTABSSIL</div>
              <div className="flex flex-col items-center">
                 <Logo className="w-12 h-12 mb-2 p-1" />
                                <div className="text-3xl font-black text-white">{formatNumber(totalRevenue)}</div>
                <div className="text-sm font-bold mt-1 text-white">{t.currency}</div>
              </div>
              <div className="text-[10px] text-white/50 font-medium mt-4">{t.totalSales}</div>
            </div>
          )}
        </div>
      )}

      {permissions.financialsProfits && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className={cn("text-xs font-black uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-2", isAr && "text-right")}>
            {t.realizedSalesProfits}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.todayProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CalendarClock className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(dailyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.weeklyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(weeklyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.monthlyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(monthlyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.yearlyProfit}</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Sparkles className="w-4 h-4" /></span>
              </div>
              <div className={cn(isAr && "text-right")}>
                <span className="text-3xl font-black text-emerald-600">{formatNumber(yearlyProfit)}</span>
                <span className="text-[10px] font-bold text-text-secondary ml-1">{t.currency}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className={cn(permissions.supplierDebt ? "lg:col-span-3" : "lg:col-span-4", "space-y-6")}>
          {(permissions.financialsInventory || permissions.financialsSales) && (
            <div className={cn("grid grid-cols-1 gap-6", 
              permissions.financialsInventory && permissions.financialsSales ? "md:grid-cols-2" : "grid-cols-1"
            )}>
               {/* Critical Stock Alerts */}
               {permissions.financialsInventory && (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">{t.stockAlerts}</h3>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-danger">{lowStock.length}</span>
                        <button 
                          onClick={() => {
                            const criticalItems = products.filter(p => p.qty <= (p.minStock ?? 5));
                            generateStockReportPDF({
                              items: criticalItems,
                              generatedAt: new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                              language: language
                            });
                          }}
                          className="p-2 hover:bg-bg-base rounded-full transition-colors"
                          title={language === 'ar' ? "تصدير" : "Export"}
                        >
                          <Download className="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin flex flex-col">
                      {lowStock.length > 0 ? (
                        lowStock.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-bg-base/30 rounded-xl border border-transparent hover:border-accent/10 hover:bg-bg-base/50 transition-all">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white border border-border-subtle flex items-center justify-center text-accent shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-xs font-bold text-text-main truncate" title={p.name}>{p.name}</div>
                                <div className="text-[9px] text-text-secondary font-medium uppercase tracking-tight">{p.category}</div>
                              </div>
                            </div>
                            <div className="text-right pl-2 shrink-0">
                              <div className="text-base font-black text-danger">{p.qty}</div>
                              <div className="text-[8px] font-bold text-text-secondary uppercase">{t.inStock}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                          <div className="w-16 h-16 rounded-3xl bg-success/10 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-success" />
                          </div>
                          <p className="text-sm font-bold text-text-secondary">{t.noStockAlerts}</p>
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {/* Sales Trend Chart */}
               {permissions.financialsSales && (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xs font-black uppercase tracking-widest text-text-main flex items-center gap-2">
                         <TrendingUp className="w-5 h-5 text-accent" />
                         {isAr ? 'اتجاه المبيعات (7 أيام)' : 'SALES TREND (7 DAYS)'}
                       </h3>
                       <div className="text-sm font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full">
                         {formatNumber(trendData.reduce((acc: number, curr: any) => acc + curr.amount, 0))} {t.currency}
                       </div>
                    </div>
                    <div className="h-[250px] w-full">
                      {trendData.every((d: any) => d.amount === 0) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                          <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-widest">{isAr ? "لا توجد مبيعات" : "NO SALES"}</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                              dy={10}
                            />
                            <YAxis hide={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => formatNumber(val)} />
                            <ReChartsTooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                              itemStyle={{ color: '#6366f1' }}
                              formatter={(value: number) => [`${formatNumber(value)} ${t.currency}`, isAr ? 'المبيعات' : 'Sales']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="#6366f1" 
                              strokeWidth={4}
                              fillOpacity={1} 
                              fill="url(#colorSales)" 
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                              dot={{ r: 3, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                 </div>
               )}
            </div>
          )}
          {permissions.financialsPaymentMethods && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {renderPaymentMethodsWidget()}
            </div>
          )}
        </div>

        {/* Sidebar Space */}
        {permissions.supplierDebt && (
          <div className="lg:col-span-1 space-y-6">
             {/* Supplier Debt Card */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-border-subtle shadow-sm flex flex-col h-full min-h-[300px]">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-6">{t.totalSupplierDebt}</div>
                  <div className="text-5xl font-black text-text-main my-8">{formatNumber(totalSupplierDebt)}</div>
                  <div className="text-2xl font-black text-text-main">{t.currency}</div>
                  <div className="mt-8 pt-8 border-t border-border-subtle">
                    <div className="text-[11px] font-bold text-danger uppercase tracking-tighter">{t.amountOwedToSuppliers}</div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Inventory({ products, categories, suppliers, setMessage, language, onRefresh, permissions }: { products: Product[], categories: Category[], suppliers: Supplier[], setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, permissions: any }) {
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
        qty: parseInt(qty),
        minStock: parseInt(minStock) || 0,
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
        qty: parseInt(editForm.qty),
        minStock: parseInt(editForm.minStock) || 0,
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
        quantity: parseInt(adjQty),
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
function POS({ products, categories, customers, user, settings, setMessage, language, onRefresh }: { products: Product[], categories: Category[], customers: Customer[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void }) {
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
  const [customerName, setCustomerName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
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
    if (cart.length === 0) return;

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
        checkOwner: paymentMethod === 'check' ? (checkBank && checkBank !== 'بنك آخر...' ? `${checkBank} | ${checkOwner}` : checkOwner) : null
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
          checkOwner: paymentMethod === 'check' ? (checkBank && checkBank !== 'بنك آخر...' ? `${checkBank} | ${checkOwner}` : checkOwner) : undefined
        };

        setCart([]);
        setSelectedCustomerId('');
        setCustomerName('');
        setDiscount('0');
        setReceivedAmount('');
        setCheckNumber('');
        setCheckOwner('');
        setCheckBank('');
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
                <p className="text-xs font-black uppercase tracking-[0.3em]">{language === 'ar' ? "لا توجد نتائج" : "No matches found"}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Right: Checkout / Receipt Panel --- */}
      <div className="w-full lg:w-[420px] h-full flex flex-col bg-card border border-border-subtle rounded-3xl shadow-2xl relative z-10">
        <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-bg-base/20 rounded-t-3xl backdrop-blur-sm">
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{language === 'ar' ? "فاتورة" : "Receipt"}</span>
             <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">{language === 'ar' ? "سلة التسوق" : "Current Cart"}</h3>
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
                      {formatNumber(item.price)} {t.currency} / unit
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
                    <span className="w-8 text-center text-xs font-black text-text-main">{item.qty}</span>
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
                {language === 'ar' ? "أضف منتجات للبدء بالعملية" : "Ready for next transaction"}
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
             {/* Buyer Name Input for Walking Customers */}
             {!selectedCustomerId && !isAddingNewCustomer && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-black uppercase text-text-secondary tracking-widest px-1">{t.buyerName}</label>
                  <div className="relative group">
                    <User className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary opacity-50 transition-colors group-focus-within:text-accent", language === 'ar' ? "right-3.5" : "left-3.5")} />
                    <input 
                      placeholder={t.walkingCustomer}
                      className={cn("w-full bg-white border border-border-subtle rounded-xl py-3 px-10 text-xs font-bold text-text-main focus:border-accent outline-none shadow-sm", language === 'ar' && "text-right")}
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                </div>
             )}

             {paymentMethod === 'debt' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="flex items-center justify-between px-1">
                     <label className="text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "ملف الزبون" : "Customer Link"}</label>
                     <button 
                       onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                       className="text-[9px] font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-1"
                     >
                       {isAddingNewCustomer ? (language === 'ar' ? "إلغاء" : "CANCEL") : (
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
                            placeholder={language === 'ar' ? "رقم الهاتف" : "Phone"}
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
                          value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                        >
                          <option value="">{language === 'ar' ? "إختر زبون..." : "Link to Account..."}</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name} (Debt: {formatNumber(c.debt)})</option>)}
                        </select>
                        <ChevronDown className={cn(
                          "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none opacity-50",
                          language === 'ar' ? "left-3.5" : "right-3.5"
                        )} />
                     </div>
                   )}
                </div>
             )}

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
                disabled={cart.length === 0 || (paymentMethod === 'debt' && !selectedCustomerId)}
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

function CustomerList({ customers, user, settings, setMessage, language, onRefresh, payments, sales, products }: { customers: Customer[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, payments: any[], sales: Sale[], products: Product[] }) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'list' | 'checks'>('list');
  const [name, setName] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ type: 'pay' | 'charge', customer: Customer } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustMethod, setAdjustMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [checkNum, setCheckNum] = useState('');
  const [checkOwnerModal, setCheckOwnerModal] = useState('');
  const [checkBankModal, setCheckBankModal] = useState('');
  const [dueDateModal, setDueDateModal] = useState('');
  
  // Product Return States
  const [returnModal, setReturnModal] = useState<{ customer: Customer } | null>(null);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState('');
  const [returnPrice, setReturnPrice] = useState('');
  const [returnAction, setReturnAction] = useState<'debt' | 'cash'>('debt');
  const [returnDescription, setReturnDescription] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', due_date: '' });
  const [selectedSaleToShow, setSelectedSaleToShow] = useState<Sale | null>(null);

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addCustomer({ 
        name: name.trim(), 
        debt: parseFloat(initialDebt) || 0,
        phone: phone.trim(),
        address: address.trim(),
        due_date: dueDate || null
      });
      setName('');
      setInitialDebt('0');
      setPhone('');
      setAddress('');
      setDueDate('');
      onRefresh();
      setMessage({ text: language === 'ar' ? "تمت إضافة الزبون بنجاح." : "Customer added successfully.", type: 'success' });
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل إضافة الزبون." : "Failed to add customer.", type: 'error' });
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustAmount) return;
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      if (adjustModal.type === 'pay') {
        const paymentData = {
          amount: amt,
          payment_method: adjustMethod,
          check_number: adjustMethod === 'CHECK' ? checkNum : null,
          check_due_date: adjustMethod === 'CHECK' ? dueDateModal : null,
          check_owner: adjustMethod === 'CHECK' ? (checkBankModal && checkBankModal !== 'بنك آخر...' ? `${checkBankModal} | ${checkOwnerModal}` : checkOwnerModal) : null
        };
        await api.addPayment(adjustModal.customer.id, paymentData);
        setMessage({ text: language === 'ar' ? "تم تسجيل الدفعة." : "Payment posted successfully.", type: 'success' });
      } else {
        await api.addCharge(adjustModal.customer.id, amt, '');
        setMessage({ text: language === 'ar' ? "تمت إضافة الدين." : "Charge added successfully.", type: 'success' });
      }
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustMethod('CASH');
      setCheckNum('');
      setCheckOwnerModal('');
      setCheckBankModal('');
      setDueDateModal('');
      onRefresh();
      if (selectedCustomer?.id === adjustModal.customer.id) {
        loadHistory(selectedCustomer.id);
      }
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشلت العملية." : "Operation failed.", type: 'error' });
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModal || !returnProductId || !returnQty || !returnPrice) return;
    const qtyVal = parseInt(returnQty);
    const priceVal = parseFloat(returnPrice);
    if (isNaN(qtyVal) || qtyVal <= 0 || isNaN(priceVal) || priceVal < 0) return;

    try {
      await api.returnProduct(returnModal.customer.id, {
        productId: returnProductId,
        qty: qtyVal,
        price: priceVal,
        action: returnAction,
        description: returnDescription.trim()
      });
      
      setMessage({ text: t.returnSuccess || "Return recorded successfully.", type: 'success' });
      setReturnModal(null);
      setReturnProductId('');
      setReturnQty('');
      setReturnPrice('');
      setReturnAction('debt');
      setReturnDescription('');
      
      onRefresh();
      
      // Refresh current customer history and profile so UI stays in sync
      if (selectedCustomer?.id === returnModal.customer.id) {
        const totalVal = qtyVal * priceVal;
        if (returnAction === 'debt') {
          setSelectedCustomer({
            ...selectedCustomer,
            debt: Math.max(0, selectedCustomer.debt - totalVal)
          });
        }
        loadHistory(selectedCustomer.id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشلت عملية الإرجاع." : "Failed to record return.", type: 'error' });
    }
  };

  const loadHistory = async (customerId: string) => {
    setLoadingHistory(true);
    try {
      const history = await api.getCustomerHistory(customerId);
      setCustomerHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.updateCustomer(selectedCustomer.id, {
        ...editForm,
        debt: selectedCustomer.debt
      });
      setIsEditingProfile(false);
      onRefresh();
      setSelectedCustomer({ 
        ...selectedCustomer, 
        ...editForm, 
        dueDate: editForm.due_date 
      });
      setMessage({ text: t.profileUpdated, type: 'success' });
    } catch (err) {
      setMessage({ text: t.updateFailed, type: 'error' });
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      loadHistory(selectedCustomer.id);
      setEditForm({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone || '',
        address: selectedCustomer.address || '',
        due_date: selectedCustomer.dueDate || selectedCustomer.due_date || ''
      });
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (returnModal && returnModal.customer.id === 'walking') {
      setReturnAction('cash');
    }
  }, [returnModal]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) || 
    (c.phone && c.phone.includes(searchCustomer))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Users className="w-6 h-6 text-accent" />
            </div>
            {t.customers}
          </h2>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] opacity-60 ml-12">MANAGE_YOUR_ACCOUNTS</p>
        </div>
        
        <div className="flex bg-bg-base p-1 rounded-2xl border border-border-subtle shadow-sm">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'list' ? "bg-white text-accent shadow-md shadow-accent/5 ring-1 ring-accent/10" : "text-text-secondary hover:text-text-main")}
          >
            {t.customers}
          </button>
          <button 
            onClick={() => setActiveTab('checks')}
            className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'checks' ? "bg-white text-accent shadow-md shadow-accent/5 ring-1 ring-accent/10" : "text-text-secondary hover:text-text-main")}
          >
            {t.checks}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          <section className="bg-card border border-border-subtle p-8 rounded-[2rem] shadow-xl shadow-accent/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-accent/10 transition-colors" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-text-secondary mb-8 flex items-center gap-3">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              {t.addCustomer}
            </h3>
            <form onSubmit={addCustomer} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.customerName}</label>
                <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.customerName} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.phone}</label>
                <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.address}</label>
                <input value={address || ''} onChange={e => setAddress(e.target.value)} placeholder={t.address} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.dueDate || (language === 'ar' ? 'تاريخ الاستحقاق' : 'Date d\'échéance')}</label>
                <input type="date" value={dueDate || ''} onChange={e => setDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-bold focus:border-accent outline-none shadow-sm transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">{t.initialDebt}</label>
                <div className="relative">
                  <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-2xl py-3 px-4 text-sm font-black text-danger focus:border-accent outline-none shadow-sm transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary/50">{t.currency}</div>
                </div>
              </div>
              <button className="h-fit self-end bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
                {t.confirm}
              </button>
            </form>
          </section>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5 group-focus-within:text-accent transition-colors", language === 'ar' ? "right-6" : "left-6")} />
              <input 
                placeholder={t.customers} 
                className={cn("w-full bg-white border border-border-subtle rounded-[2rem] py-5 shadow-sm text-sm font-bold focus:border-accent outline-none transition-all", language === 'ar' ? "pr-16 pl-6 text-right" : "pl-16 pr-6")}
                value={searchCustomer || ''} onChange={e => setSearchCustomer(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setReturnModal({ customer: { id: 'walking', name: t.walkingCustomer || 'Client de passage', debt: 0, email: '', phone: '', address: '' } })} 
              className="h-full bg-accent text-white py-5 px-8 rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent/20 hover:opacity-90 transition-all shrink-0 active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {language === 'ar' ? 'إرجاع لزبون عابر' : 'Retour Client Passager'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map(c => (
              <div key={c.id} className="bg-card border border-border-subtle p-8 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative border-b-4 border-b-border-subtle/20 hover:border-b-accent/40">
                <div className="flex justify-between items-start mb-6">
                   <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                      <h4 className="font-black text-lg text-text-main group-hover:text-accent transition-colors tracking-tight">{c.name}</h4>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1 opacity-60">
                        <Hash className="w-3 h-3" />
                        {c.id.slice(0, 8)}
                      </p>
                   </div>
                   <div className="bg-bg-base w-12 h-12 rounded-2xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner border border-border-subtle/50">
                      <User className="w-6 h-6" />
                   </div>
                </div>
                
                <div className={cn("p-6 rounded-[1.5rem] mb-6 relative overflow-hidden", c.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
                   <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-8 translate-x-8", c.debt > 0 ? "bg-danger/10" : "bg-success/10")} />
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1 opacity-60">{t.debt}</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                      <span className={cn("text-3xl font-black tracking-tighter font-mono", c.debt > 0 ? "text-danger" : "text-emerald-600")}>{formatNumber(c.debt)}</span>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t.currency}</span>
                   </div>
                   {c.debt > 0 && (c.dueDate || c.due_date) && (
                     <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                       <CalendarClock className={cn("w-3.5 h-3.5", new Date((c.dueDate || c.due_date)) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                       <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date((c.dueDate || c.due_date)) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                         {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.dueDate || c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                       </span>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setAdjustModal({ type: 'pay', customer: c })} className="bg-accent text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95 transition-all hover:bg-accent/90">
                    {t.payDebt}
                  </button>
                  <button onClick={() => setAdjustModal({ type: 'charge', customer: c })} className="bg-white border-2 border-border-subtle text-text-main py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all">
                    {language === 'ar' ? 'إضافة دين' : 'NEW CHARGE'}
                  </button>
                </div>
                <button onClick={() => setSelectedCustomer(c)} className="w-full mt-4 py-2 text-[9px] font-black text-text-secondary hover:text-accent uppercase tracking-[0.3em] transition-colors border-t border-border-subtle/40 pt-4">{t.view} {t.customerDetails}</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {payments.filter(p => p.paymentMethod === 'CHECK').length > 0 ? (
              payments.filter(p => p.paymentMethod === 'CHECK').map(p => (
                <div key={p.id} className="bg-white border-2 border-border-subtle rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-accent/40 transition-all shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                      <div className="text-sm font-black text-text-main group-hover:text-accent transition-colors">{p.customerName}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> #{p.checkNumber}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.checkOwner}</span>
                        <span className={cn("flex items-center gap-1", p.checkDueDate && new Date(p.checkDueDate) < new Date() ? "text-danger" : "text-amber-600")}>
                          <CalendarClock className="w-3 h-3" /> {p.checkDueDate ? new Date(p.checkDueDate).toLocaleDateString() : '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xl font-black text-text-main tracking-tighter">
                      {formatNumber(p.amount)} <span className="text-[10px] text-text-secondary">{t.currency}</span>
                    </div>
                    <div className="text-[10px] font-bold text-text-secondary opacity-60">
                      {new Date(p.date).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 border-4 border-dashed border-border-subtle rounded-3xl mx-auto flex items-center justify-center rotate-12">
                   <FolderOpen className="w-8 h-8 -rotate-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.noChecks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-border-subtle flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.customerDetails}</div>
                   {isEditingProfile ? (
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.customerName}</label>
                        <input className="text-2xl font-bold tracking-tight bg-bg-base border border-border-subtle rounded-lg px-3 py-1 w-full outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                     </div>
                   ) : (
                     <h3 className="text-3xl font-bold tracking-tight">{selectedCustomer.name}</h3>
                   )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={cn("p-2 rounded-full transition-colors", isEditingProfile ? "bg-accent/10 text-accent" : "hover:bg-bg-base text-text-secondary")}>
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-auto space-y-8">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.phone}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.address}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.dueDate}</label>
                        <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.due_date || ''} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-border-subtle">
                       <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-6 py-3 bg-bg-base text-text-secondary font-bold rounded-xl hover:bg-border-subtle transition-all uppercase text-[10px] tracking-widest">{language === 'ar' ? "إلغاء" : "Cancel"}</button>
                       <button type="submit" className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all uppercase text-[10px] tracking-widest">{t.saveChanges}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">{language === 'ar' ? "إجمالي الكريدي" : "Total Accrued"}</div>
                        <div className="text-xl font-black font-mono text-text-main">
                          {formatNumber(customerHistory.filter(h => h.type === 'DEBT').reduce((sum, h) => sum + h.amount, 0))} {t.currency}
                        </div>
                      </div>
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">{language === 'ar' ? "إجمالي السداد" : "Total Paid"}</div>
                        <div className="text-xl font-black font-mono text-success">
                          {formatNumber(customerHistory.filter(h => h.type === 'PAYMENT').reduce((sum, h) => sum + h.amount, 0))} {t.currency}
                        </div>
                      </div>
                      <div className={cn("p-6 rounded-2xl bg-bg-base border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-accent font-black uppercase tracking-widest mb-1">{language === 'ar' ? "الباقي (الرصيد)" : "Remaining Balance"}</div>
                        <div className={cn("text-xl font-black font-mono", selectedCustomer.debt > 0 ? "text-danger" : "text-success")}>
                          {formatNumber(selectedCustomer.debt)} {t.currency}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Phone className="w-3 h-3 text-accent" /> {t.phone}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.phone || '---'}</div>
                      </div>
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-accent" /> {t.address}
                        </div>
                        <div className="text-sm font-bold text-text-main">{selectedCustomer.address || '---'}</div>
                      </div>
                      <div className={cn("p-4 rounded-2xl bg-bg-base/50 border border-border-subtle", language === 'ar' && "text-right")}>
                        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <CalendarClock className="w-3.5 h-3.5 text-accent" /> {t.dueDate}
                        </div>
                        <div className="text-sm font-bold text-text-main">
                          {selectedCustomer.dueDate || selectedCustomer.due_date 
                            ? new Date(selectedCustomer.dueDate || selectedCustomer.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')
                            : '---'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">{language === 'ar' ? "تاريخ الحساب" : "FINANCIAL HISTORY"}</h4>
                      </div>
                      
                      {loadingHistory ? (
                        <div className="py-12 text-center text-text-secondary text-xs font-mono animate-pulse tracking-widest">LOADING_TRANSACTIONS...</div>
                      ) : (customerHistory?.length || 0) === 0 ? (
                        <div className="py-20 text-center text-text-secondary text-sm border-2 border-dashed border-border-subtle rounded-3xl opacity-50 flex flex-col items-center gap-4">
                          <Archive className="w-8 h-8 opacity-40" />
                          {t.historyEmpty}
                        </div>
                      ) : (
                        <div className="space-y-3 pr-1 overflow-y-auto max-h-[350px] no-scrollbar">
                           {(customerHistory || []).map((item) => (
                             <div key={item.id} className="group bg-bg-base/40 p-5 rounded-2xl flex justify-between items-center text-sm border border-border-subtle/40 hover:bg-white hover:border-accent/20 transition-all shadow-sm">
                               <div className={cn("flex flex-col gap-0.5", language === 'ar' && "text-right")}>
                                 <div className="text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-60 flex items-center gap-2">
                                   {item.type === 'SALE' && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-[9px]">FACTURE</span>}
                                   {item.description}
                                   {item.payment_method === 'CHECK' && (
                                     <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                       <CreditCard className="w-3 h-3" /> {t.check} #{item.check_number}
                                     </span>
                                   )}
                                 </div>
                                 <div className={cn("text-lg font-black tracking-tighter", item.type === 'PAYMENT' ? "text-success" : "text-danger")}>
                                    {item.type === 'PAYMENT' ? '+' : '-'}{formatNumber(item.amount)} {t.currency}
                                 </div>
                                 <div className="text-[10px] font-bold text-text-secondary/70 mt-1 flex items-center gap-1.5">
                                   <CalendarClock className="w-3 h-3" /> {new Date(item.date).toLocaleString()}
                                 </div>
                               </div>
                               <div className="flex items-center gap-1">
                                 <button 
                                   onClick={async () => {
                                     if (item.type === 'SALE') {
                                       try {
                                         let sale = sales.find((s: any) => s.id === item.id);
                                         if (!sale) {
                                            const allSales = await api.getSales();
                                            sale = allSales.find((s: any) => s.id === item.id);
                                         }

                                         if (sale) {
                                           if (!sale.items || sale.items.length === 0) {
                                             const items = await api.getSaleItems(sale.id);
                                             sale = { ...sale, items };
                                           }
                                           setSelectedSaleToShow(sale);
                                         }
                                       } catch (e) {
                                         console.error("View error:", e);
                                       }
                                     } 
                                   }}
                                   className={cn("p-2 hover:bg-white rounded-lg transition-colors group/view border border-transparent hover:border-border-subtle", item.type !== 'SALE' && "hidden")}
                                   title={t.view}
                                 >
                                   <Eye className="w-4 h-4 text-text-secondary group-hover/view:text-accent" />
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     if (item.type === 'SALE') {
                                       try {
                                         let sale = sales.find((s: any) => s.id === item.id);
                                         if (!sale) {
                                            const allSales = await api.getSales();
                                            sale = allSales.find((s: any) => s.id === item.id);
                                         }
                                         
                                         if (sale) {
                                           if (!sale.items || sale.items.length === 0) {
                                             const items = await api.getSaleItems(sale.id);
                                             sale = { ...sale, items };
                                           }
                                           generateInvoicePDF({
                                             saleId: sale.id,
                                             invoiceNumber: sale.invoiceNumber,
                                             date: sale.date,
                                             items: (sale.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                                             total: sale.total,
                                             clientName: selectedCustomer?.name
                                           }, language, settings);
                                         }
                                       } catch (e) {
                                         console.error("Print error:", e);
                                       }
                                     } else {
                                       generateTransactionReceiptPDF({
                                         customerName: selectedCustomer.name,
                                         type: item.type,
                                         amount: item.amount,
                                         date: item.date,
                                         description: item.description,
                                         saleId: item.id
                                       }, language, settings);
                                     }
                                   }}
                                   className="p-2 hover:bg-white rounded-lg transition-colors group/print border border-transparent hover:border-border-subtle"
                                 >
                                   <Printer className="w-4 h-4 text-text-secondary group-hover/print:text-accent" />
                                 </button>
                               </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 bg-[#fafafa] border-t border-border-subtle flex flex-col gap-4">
                <div className="flex gap-3">
                  <button onClick={() => generateStatementPDF({ entityName: selectedCustomer.name, remainingDebt: selectedCustomer.debt, transactions: customerHistory, type: 'customer' }, language, settings)} className="flex-1 bg-white border border-border-subtle text-text-main font-bold py-3 rounded-xl hover:bg-bg-base transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
                    <Download className="w-3.5 h-3.5 text-accent" /> {t.generateStatement}
                  </button>
                  <button onClick={() => setReturnModal({ customer: selectedCustomer })} className="flex-1 bg-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> {t.returnProduct}
                  </button>
                  <button onClick={() => setAdjustModal({ type: 'pay', customer: selectedCustomer })} className="flex-1 bg-success text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-1.5">
                    {t.payDebt}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSaleToShow && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-base/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Hash className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main">{(t as any).saleDetails}</h3>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.invoice} #{selectedSaleToShow.invoiceNumber}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSaleToShow(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-4">
                  {(selectedSaleToShow.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-bg-base rounded-xl border border-border-subtle/50">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-text-main">{it.name}</p>
                        <p className="text-xs font-medium text-text-secondary">{it.qty} x {formatNumber(it.price)} {t.currency}</p>
                      </div>
                      <div className="text-sm font-black text-text-main">
                        {formatNumber((it.qty * it.price))} {t.currency}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border-subtle space-y-2">
                  <div className="flex justify-between items-center px-2">
                     <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t.total}</span>
                     <span className="text-2xl font-black text-accent tracking-tighter">{formatNumber(selectedSaleToShow.total)} {t.currency}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-bg-base border-t border-border-subtle flex gap-3">
                <button 
                  onClick={() => {
                    generateInvoicePDF({
                      saleId: selectedSaleToShow.id,
                      invoiceNumber: selectedSaleToShow.invoiceNumber,
                      date: selectedSaleToShow.date,
                      items: (selectedSaleToShow.items || []).map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
                      total: selectedSaleToShow.total,
                      subtotal: selectedSaleToShow.subtotal,
                      discount: selectedSaleToShow.discount,
                      clientName: selectedCustomer?.name
                    }, language, settings);
                  }}
                  className="flex-1 bg-accent text-white font-black py-3 rounded-xl hover:opacity-90 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> {t.invoice}
                </button>
                <button onClick={() => setSelectedSaleToShow(null)} className="flex-1 bg-white border border-border-subtle text-text-secondary font-black py-3 rounded-xl hover:bg-bg-base transition-all text-xs uppercase tracking-widest">
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Debt Adjustment Modal */}
      <AnimatePresence>
        {adjustModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl border border-border-subtle p-8">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-full bg-accent/5 text-accent mb-4">
                  {adjustModal.type === 'pay' ? <ArrowRightLeft className="w-8 h-8 rotate-90" /> : <Plus className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">{adjustModal.type === 'pay' ? t.postPayment : t.newCharge}</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">{adjustModal.customer.name}</p>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.amount}</label>
                  <input autoFocus type="number" step="0.01" className="w-full bg-white border-2 border-border-subtle rounded-2xl py-4 px-6 text-2xl font-black focus:border-accent outline-none shadow-sm transition-all" value={adjustAmount || ''} onChange={e => setAdjustAmount(e.target.value)} />
                </div>
                {adjustModal.type === 'pay' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary px-1">{t.paymentMethod}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setAdjustMethod('CASH')} className={cn("py-3 rounded-xl text-xs font-black border-2 transition-all", adjustMethod === 'CASH' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}>{t.cash}</button>
                      <button type="button" onClick={() => setAdjustMethod('CHECK')} className={cn("py-3 rounded-xl text-xs font-black border-2 transition-all", adjustMethod === 'CHECK' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}>{t.check}</button>
                    </div>
                  </div>
                )}
                {adjustMethod === 'CHECK' && adjustModal.type === 'pay' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={checkBankModal || ''} onChange={e => setCheckBankModal(e.target.value)}>
                      <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                      {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input placeholder={t.checkNumber} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={checkNum || ''} onChange={e => setCheckNum(e.target.value)} />
                    <input placeholder={t.checkOwner} className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={checkOwnerModal || ''} onChange={e => setCheckOwnerModal(e.target.value)} />
                    <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none" value={dueDateModal || ''} onChange={e => setDueDateModal(e.target.value)} />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 py-4 bg-bg-base text-text-secondary font-black rounded-2xl hover:bg-border-subtle transition-all text-[10px] uppercase tracking-widest">{t.cancel || 'Cancel'}</button>
                  <button type="submit" className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all text-[10px] uppercase tracking-widest">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Return Modal */}
      <AnimatePresence>
        {returnModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-card w-full max-w-md rounded-[2rem] shadow-2xl border border-border-subtle p-8 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-accent/5 text-accent mb-4">
                  <ArrowRightLeft className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-text-main uppercase">{t.returnProduct}</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">{returnModal.customer.name}</p>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-4">
                {/* Product Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.selectProduct}</label>
                  <select 
                    required
                    className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                    value={returnProductId} 
                    onChange={e => {
                      const pId = e.target.value;
                      setReturnProductId(pId);
                      const found = products.find(p => p.id === pId);
                      if (found) {
                        setReturnPrice(found.price.toString());
                      } else {
                        setReturnPrice('');
                      }
                    }}
                  >
                    <option value="">-- {t.selectProduct} --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} {t.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnQty || 'Quantity'}</label>
                    <input 
                      required 
                      type="number" 
                      min="1"
                      className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                      value={returnQty} 
                      onChange={e => setReturnQty(e.target.value)} 
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnPrice || 'Unit Price'}</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all"
                      value={returnPrice} 
                      onChange={e => setReturnPrice(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Return Action / Settlement */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.returnAction || 'Settlement'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      disabled={returnModal.customer.id === 'walking'}
                      onClick={() => setReturnAction('debt')} 
                      className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all", 
                        returnModal.customer.id === 'walking' ? "bg-bg-base text-text-secondary/30 border-border-subtle cursor-not-allowed opacity-50" :
                        returnAction === 'debt' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle"
                      )}
                    >
                      {t.deductFromDebt}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setReturnAction('cash')} 
                      className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all", returnAction === 'cash' ? "bg-accent text-white border-accent" : "bg-white text-text-secondary border-border-subtle")}
                    >
                      {t.refundInCash}
                    </button>
                  </div>
                </div>

                {/* Description / Custom Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">{t.note}</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-white border border-border-subtle rounded-xl py-3 px-4 text-xs font-bold focus:border-accent outline-none shadow-sm transition-all resize-none"
                    placeholder="Ex: PVC pipe return..."
                    value={returnDescription} 
                    onChange={e => setReturnDescription(e.target.value)} 
                  />
                </div>

                {/* Total Preview */}
                {returnQty && returnPrice && (
                  <div className="bg-bg-base p-4 rounded-2xl border border-border-subtle flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                    <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">{t.total}:</span>
                    <span className="text-lg font-black text-accent">
                      {formatNumber((parseInt(returnQty) * parseFloat(returnPrice)))} {t.currency}
                    </span>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => {
                    setReturnModal(null);
                    setReturnProductId('');
                    setReturnQty('');
                    setReturnPrice('');
                    setReturnAction('debt');
                    setReturnDescription('');
                  }} className="flex-1 py-4 bg-bg-base text-text-secondary font-black rounded-2xl hover:bg-border-subtle transition-all text-[10px] uppercase tracking-widest">{t.cancel}</button>
                  <button type="submit" className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all text-[10px] uppercase tracking-widest">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// --- View: History ---
function SupplierList({ suppliers, checks, user, settings, setMessage, language, onRefresh, permissions }: { suppliers: Supplier[], checks: CheckDoc[], user: any, settings: any, setMessage: (m: { text: string, type: 'success' | 'error' }) => void, language: Language, onRefresh: () => void, permissions?: any }) {
  const t = translations[language];
  const canViewDebtAmount = permissions ? permissions.viewSupplierDebtAmount !== false : true;
  const [activeTab, setActiveTab] = useState<'suppliers' | 'checks'>('suppliers');
  const [name, setName] = useState('');
  const [initialDebt, setInitialDebt] = useState('0');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
  const [supplierDueDate, setSupplierDueDate] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierHistory, setSupplierHistory] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ type: 'pay' | 'charge', supplier: Supplier } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustMethod, setAdjustMethod] = useState<'CASH' | 'CHECK'>('CASH');
  const [checkNum, setCheckNum] = useState('');
  const [checkOwner, setCheckOwner] = useState('');
  const [checkBankSupplier, setCheckBankSupplier] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', due_date: '' });

  const supplierChecks = checks.filter(c => c.partyRole === 'supplier');

  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
            await api.addSupplier({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        address: address.trim(),
        debt: parseFloat(initialDebt) || 0,
        due_date: supplierDueDate || null
      });
      setName('');
      setInitialDebt('0');
      setEmail('');
      setPhone('');
      setAddress('');
      setSupplierDueDate('');
      onRefresh();
      setMessage({ text: language === 'ar' ? "تمت إضافة المورد بنجاح." : "Supplier added successfully.", type: 'success' });
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشل إضافة المورد." : "Failed to add supplier.", type: 'error' });
      console.error(err);
    }
  };

  const openDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
        setEditForm({ 
      name: supplier.name, 
      email: supplier.email || '', 
      phone: supplier.phone || '', 
      address: supplier.address || '',
      due_date: supplier.dueDate || supplier.due_date || ''
    });
    setIsEditingProfile(false);
    setLoadingHistory(true);
    try {
      const history = await api.getSupplierHistory(supplier.id);
      setSupplierHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustAmount) return;
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      if (adjustModal.type === 'pay') {
        const paymentData = {
          amount: amt,
          payment_method: adjustMethod,
          check_number: adjustMethod === 'CHECK' ? checkNum : null,
          check_due_date: adjustMethod === 'CHECK' ? dueDate : null,
          check_owner: adjustMethod === 'CHECK' ? (checkBankSupplier && checkBankSupplier !== 'بنك آخر...' ? `${checkBankSupplier} | ${checkOwner}` : checkOwner) : null
        };
        await api.addSupplierPayment(adjustModal.supplier.id, paymentData);
        setMessage({ text: language === 'ar' ? "تم تسجيل الدفع للمورد." : "Payment to supplier posted successfully.", type: 'success' });
      } else {
        await api.addSupplierCharge(adjustModal.supplier.id, amt, adjustNote);
        setMessage({ text: language === 'ar' ? "تمت إضافة الدين." : "Supplier debt updated successfully.", type: 'success' });
      }
      
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustMethod('CASH');
      setCheckNum('');
      setCheckOwner('');
      setCheckBankSupplier('');
      setDueDate('');
      setAdjustNote('');
      onRefresh();
    } catch (err) {
      setMessage({ text: language === 'ar' ? "فشلت العملية." : "Operation failed.", type: 'error' });
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await api.updateSupplier(selectedSupplier.id, {
        ...editForm,
        debt: selectedSupplier.debt
      });
      setIsEditingProfile(false);
      onRefresh();
      setSelectedSupplier({ ...selectedSupplier, ...editForm });
      setMessage({ text: t.profileUpdated, type: 'success' });
    } catch (err) {
      setMessage({ text: t.updateFailed, type: 'error' });
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchSupplier.toLowerCase()) || 
    (s.phone && s.phone.includes(searchSupplier))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-20">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle pb-4">
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all uppercase",
            activeTab === 'suppliers' ? "bg-sidebar text-white shadow-lg" : "text-text-secondary hover:bg-bg-base"
          )}
        >
          {t.suppliers}
        </button>
        <button 
          onClick={() => setActiveTab('checks')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all uppercase flex items-center gap-2",
            activeTab === 'checks' ? "bg-sidebar text-white shadow-lg" : "text-text-secondary hover:bg-bg-base"
          )}
        >
          <CreditCard className="w-4 h-4" />
          {t.supplierChecks}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <>
          <section className="bg-card border border-border-subtle p-8 rounded-xl shadow-md">
        <h3 className="section-title text-sm font-bold mb-6 flex items-center justify-between">
          <span className="uppercase tracking-widest text-text-secondary">{t.addSupplier}</span>
          <Store className="w-4 h-4 text-accent" />
        </h3>
        <form onSubmit={addSupplier} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierName}</label>
             <input value={name || ''} onChange={e => setName(e.target.value)} placeholder={t.supplierName} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.phone}</label>
             <input value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.supplierDebt}</label>
             <input type="number" value={initialDebt || ''} onChange={e => setInitialDebt(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-black text-danger" />
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-border-subtle pb-4 md:pb-0 md:pr-4">
             <label className="text-[10px] uppercase font-bold text-text-secondary mb-1.5 block">{t.dueDate}</label>
             <input type="date" value={supplierDueDate || ''} onChange={e => setSupplierDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-lg py-2.5 px-3 text-sm focus:border-accent outline-none font-bold" />
          </div>
          <button className="md:col-span-1 h-fit self-end bg-accent text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
            <Plus className="w-4 h-4" />
            {t.confirm}
          </button>
        </form>
      </section>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-bg-base/30 p-2 rounded-2xl border border-border-subtle/40 backdrop-blur-md">
        <div className="relative flex-1 group">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4 group-focus-within:text-accent transition-colors", language === 'ar' ? "right-4" : "left-4")} />
          <input 
            placeholder={t.suppliers} 
            className={cn("w-full bg-white/50 border border-border-subtle rounded-xl py-3 text-sm font-bold focus:border-accent outline-none", language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4")}
            value={searchSupplier || ''} onChange={e => setSearchSupplier(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(s => (
          <div key={s.id} className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
               <div className={cn("flex flex-col", language === 'ar' && "text-right")}>
                  <h4 className="font-bold text-md text-text-main group-hover:text-accent transition-colors">{s.name}</h4>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{s.phone || 'NO PHONE'}</p>
               </div>
               <div className="bg-bg-base p-2 rounded-xl text-text-secondary">
                  <Store className="w-4 h-4" />
               </div>
            </div>
            
            <div className={cn("p-4 rounded-xl mb-6", s.debt > 0 ? "bg-red-50" : "bg-emerald-50")}>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">{t.youOweSupplier}</p>
               <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-black tracking-tighter", s.debt > 0 ? "text-danger" : "text-emerald-600")}>
                    {canViewDebtAmount ? formatNumber(s.debt) : '***'}
                  </span>
                  <span className="text-[10px] font-bold text-text-secondary">{t.currency}</span>
               </div>
            </div>

            {canViewDebtAmount && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAdjustModal({ type: 'pay', supplier: s })} className="bg-accent text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-accent/10 active:scale-95 transition-all">
                  {t.paySupplier}
                </button>
                <button onClick={() => setAdjustModal({ type: 'charge', supplier: s })} className="bg-white border border-border-subtle text-text-main py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-accent transition-all">
                  {t.newSupplierCharge.toUpperCase()}
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
               <button onClick={() => openDetails(s)} className="flex-1 py-1.5 text-[9px] font-bold text-text-secondary hover:text-accent uppercase tracking-[0.2em]">{t.view} {t.supplierDetails}</button>
               {canViewDebtAmount && (
                 <button 
                   onClick={async () => {
                     const history = await api.getSupplierHistory(s.id);
                     generateStatementPDF({
                       entityName: s.name,
                       remainingDebt: s.debt,
                       transactions: history,
                       type: 'supplier'
                     }, language, settings);
                   }}
                   className="flex-1 py-1.5 text-[9px] font-bold text-accent hover:underline uppercase tracking-[0.2em] flex items-center justify-center gap-1"
                 >
                   <Printer className="w-3 h-3" />
                   {language === 'ar' ? "كشف سريع" : "QUICK PDF"}
                 </button>
               )}
            </div>
          </div>
        ))}
      </div>
        </>
      ) : (
        <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fafafa] border-b border-border-subtle">
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.date}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.supplierName}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.checkNumber}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.amount}</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.checkOwner}</th>
              </tr>
            </thead>
            <tbody>
              {supplierChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-text-secondary italic">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    {t.noChecks}
                  </td>
                </tr>
              ) : (
                supplierChecks.map(c => (
                  <tr key={c.id} className="border-b border-border-subtle hover:bg-bg-base transition-colors group">
                    <td className="p-5 text-sm font-medium">{new Date(c.date).toLocaleDateString()}</td>
                    <td className="p-5 text-sm font-black text-text-main group-hover:text-accent">{c.partyName}</td>
                    <td className="p-5 text-sm font-mono flex items-center gap-2">
                       <Hash className="w-3.5 h-3.5 opacity-40" />
                       {c.checkNumber}
                    </td>
                    <td className="p-5 text-sm font-black text-success">{formatNumber(c.total)} DH</td>
                    <td className="p-5 text-[11px] font-bold text-text-secondary uppercase">{c.checkOwner || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedSupplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-border-subtle flex justify-between items-start">
                <div>
                   <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{t.supplierDetails}</div>
                   {isEditingProfile ? (
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.supplierName}</label>
                        <input className="text-2xl font-bold tracking-tight bg-bg-base border border-border-subtle rounded-lg px-3 py-1 w-full outline-none focus:border-accent" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                     </div>
                   ) : (
                     <h3 className="text-3xl font-bold tracking-tight">{selectedSupplier.name}</h3>
                   )}
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={cn("p-2 rounded-full transition-colors", isEditingProfile ? "bg-accent/10 text-accent" : "hover:bg-bg-base text-text-secondary")}>
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {canViewDebtAmount && !isEditingProfile && (
                    <button 
                      onClick={() => {
                        generateStatementPDF({
                          entityName: selectedSupplier.name,
                          remainingDebt: selectedSupplier.debt,
                          transactions: supplierHistory,
                          type: 'supplier'
                        }, language, settings);
                      }}
                      className="flex items-center gap-2 text-xs font-bold text-accent hover:bg-accent/5 px-4 py-2 rounded-xl transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      {t.generateStatement}
                    </button>
                  )}
                  <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-bg-base rounded-full"><X className="w-5 h-5 text-text-secondary" /></button>
                </div>
              </div>
              <div className="p-8 flex-1 overflow-auto">
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.phone}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.address}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.email}</label>
                        <input className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">{t.dueDate}</label>
                        <input type="date" className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" value={editForm.due_date || ''} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-border-subtle">
                       <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-6 py-3 bg-bg-base text-text-secondary font-bold rounded-xl hover:bg-border-subtle transition-all uppercase text-[10px] tracking-widest">{language === 'ar' ? "إلغاء" : "Cancel"}</button>
                       <button type="submit" className="flex-1 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all uppercase text-[10px] tracking-widest">{t.saveChanges}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-6 border-b pb-4">{t.paymentHistory}</h4>
                    <div className="space-y-4">
                      {supplierHistory.map(h => (
                        <div key={h.id} className="flex justify-between items-center p-4 bg-bg-base/30 rounded-xl border border-border-subtle/40">
                          <div>
                            <p className="text-xs font-bold text-text-main">
                              {h.description}
                              {h.payment_method === 'CHECK' && (
                                <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                  <CreditCard className="w-3 h-3" /> {t.check} #{h.check_number} {h.check_owner && `(${h.check_owner})`}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-text-secondary">
                              {new Date(h.date).toLocaleString()}
                              {h.payment_method === 'CHECK' && h.check_due_date && (
                                <span className="ml-2 text-danger">({t.dueDate}: {new Date(h.check_due_date).toLocaleDateString()})</span>
                              )}
                            </p>
                          </div>
                          <p className={cn("font-black", h.type === 'PAYMENT' ? "text-emerald-500" : "text-danger")}>
                            {h.type === 'PAYMENT' ? '-' : '+'}{canViewDebtAmount ? formatNumber(h.amount) : '***'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {adjustModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-text-main/20 backdrop-blur-sm uppercase">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-8 border border-border-subtle">
              <h3 className="text-xl font-black tracking-tight mb-8">
                {adjustModal.type === 'pay' ? t.paySupplier : t.newSupplierCharge}
              </h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.amount}</label>
                  <input autoFocus type="number" step="any" required value={adjustAmount || ''} onChange={e => setAdjustAmount(e.target.value)} placeholder="0.00" className="w-full bg-bg-base border border-border-subtle rounded-xl py-4 px-6 text-2xl font-black focus:border-accent outline-none" />
                </div>

                {adjustModal.type === 'pay' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.paymentMethod}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => setAdjustMethod('CASH')}
                          className={cn("py-3 rounded-xl text-xs font-bold border transition-all", adjustMethod === 'CASH' ? "bg-accent text-white border-accent" : "bg-bg-base text-text-secondary border-border-subtle")}
                        >
                          {t.cash}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setAdjustMethod('CHECK')}
                          className={cn("py-3 rounded-xl text-xs font-bold border transition-all", adjustMethod === 'CHECK' ? "bg-accent text-white border-accent" : "bg-bg-base text-text-secondary border-border-subtle")}
                        >
                          {t.check}
                        </button>
                      </div>
                    </div>

                    {adjustMethod === 'CHECK' && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{language === 'ar' ? 'البنك' : 'Bank'}</label>
                          <select className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" value={checkBankSupplier || ''} onChange={e => setCheckBankSupplier(e.target.value)}>
                            <option value="">{language === 'ar' ? 'اختر البنك' : 'Select Bank'}</option>
                            {moroccanBanks.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.checkOwner}</label>
                          <input required value={checkOwner || ''} onChange={e => setCheckOwner(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.checkNumber}</label>
                            <input required value={checkNum || ''} onChange={e => setCheckNum(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.dueDate}</label>
                            <input type="date" required value={dueDate || ''} onChange={e => setDueDate(e.target.value)} className="w-full bg-bg-base border border-border-subtle rounded-xl py-2.5 px-4 text-sm font-bold focus:border-accent outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {adjustModal.type === 'charge' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">{t.note}</label>
                    <input value={adjustNote || ''} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Purchase of 50 iPhones" className="w-full bg-bg-base border border-border-subtle rounded-xl py-3 px-6 text-sm font-bold focus:border-accent outline-none" />
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 bg-white border border-border-subtle text-text-secondary py-4 rounded-2xl font-black text-xs tracking-widest active:scale-95 transition-all">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl shadow-accent/20 active:scale-95 transition-all">{t.confirm}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryView({ sales, payments, activities, customers, appUsers, settings, language, onRefresh, permissions, currentUserRole }: { sales: Sale[], payments: Payment[], activities: ActivityLog[], customers: Customer[], appUsers: UserProfile[], settings: any, language: Language, onRefresh: () => void, permissions: any, currentUserRole?: string }) {
  const t = translations[language];
  const [subView, setSubView] = useState<'sales' | 'payments' | 'activity'>('activity');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchHistory, setSearchHistory] = useState('');
  const [filterActivityType, setFilterActivityType] = useState<string>('all');

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
      clientName: customer?.name,
      staffName: staff?.email,
      paymentMethod: sale.paymentMethod?.toUpperCase(),
      checkNumber: sale.checkNumber,
      checkOwner: sale.checkOwner
    }, language, settings);
  };

  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const customer = customers.find(c => c.id === s.customerId);
    const matchesSearch = (customer?.name || '').toLowerCase().includes(searchHistory.toLowerCase()) || 
                          ((s as any).customerName || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                          (s.invoiceNumber?.toString() || '').includes(searchHistory.replace('#', '')) ||
                         s.id.toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (s.checkNumber || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (s.checkOwner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });

    const filteredPayments = payments.filter(p => {
    const d = new Date(p.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesSearch = (p.customerName || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_number || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_owner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });

    const translateActivityDetails = (details: string) => {
    if (language === 'en') return details;
    let d = details;
    if (language === 'ar') {
      d = d.replace(/User logged in:/i, 'تسجيل دخول المستخدم:');
      d = d.replace(/Admin login:/i, 'تسجيل دخول المدير:');
      d = d.replace(/Forced logout from all devices for user:/i, 'تسجيل خروج إجباري من جميع الأجهزة للمستخدم:');
      d = d.replace(/Created new user:/i, 'تم إنشاء مستخدم جديد:');
      d = d.replace(/Deleted user account:/i, 'تم حذف حساب المستخدم:');
      d = d.replace(/Added product:/i, 'تمت إضافة منتج:');
      d = d.replace(/Updated product:/i, 'تم تحديث منتج:');
      d = d.replace(/Updated customer:/i, 'تم تحديث زبون:');
      d = d.replace(/Updated supplier:/i, 'تم تحديث مورد:');
      d = d.replace(/\| Changes:/i, '| التغييرات:');
      d = d.replace(/Price:/g, 'السعر:');
      d = d.replace(/Cost:/g, 'التكلفة:');
      d = d.replace(/MinStock:/g, 'الحد الأدنى:');
      d = d.replace(/Barcode:/g, 'الباركود:');
      d = d.replace(/Name:/g, 'الاسم:');
      d = d.replace(/Phone:/g, 'الهاتف:');
      d = d.replace(/Debt:/g, 'الدين:');
      d = d.replace(/Stock IN:/i, 'إدخال مخزون:');
      d = d.replace(/Stock OUT:/i, 'إخراج مخزون:');
      d = d.replace(/via Supplier/i, 'عبر المورد');
      d = d.replace(/Created category:/i, 'تم إنشاء فئة:');
      d = d.replace(/Added customer:/i, 'تمت إضافة زبون:');
      d = d.replace(/Payment of/i, 'دفعة بقيمة');
      d = d.replace(/from/i, 'من');
      d = d.replace(/Return of/i, 'إرجاع');
      d = d.replace(/Value:/i, 'القيمة:');
      d = d.replace(/Initial Debt:/i, 'الديون الأولية:');
      d = d.replace(/Qty:/g, 'الكمية:');
      d = d.replace(/units/i, 'وحدات');
    } else if (language === 'fr') {
      d = d.replace(/User logged in:/i, 'Utilisateur connecté :');
      d = d.replace(/Admin login:/i, 'Connexion admin :');
      d = d.replace(/Forced logout from all devices for user:/i, 'Déconnexion forcée de tous les appareils pour l\'utilisateur :');
      d = d.replace(/Created new user:/i, 'Nouvel utilisateur créé :');
      d = d.replace(/Deleted user account:/i, 'Compte utilisateur supprimé :');
      d = d.replace(/Added product:/i, 'Produit ajouté :');
      d = d.replace(/Updated product:/i, 'Produit mis à jour :');
      d = d.replace(/Updated customer:/i, 'Client mis à jour :');
      d = d.replace(/Updated supplier:/i, 'Fournisseur mis à jour :');
      d = d.replace(/\| Changes:/i, '| Modifications :');
      d = d.replace(/Price:/g, 'Prix :');
      d = d.replace(/Cost:/g, 'Coût :');
      d = d.replace(/MinStock:/g, 'Stock min :');
      d = d.replace(/Barcode:/g, 'Code-barres :');
      d = d.replace(/Name:/g, 'Nom :');
      d = d.replace(/Phone:/g, 'Tél :');
      d = d.replace(/Debt:/g, 'Dette :');
      d = d.replace(/Stock IN:/i, 'Entrée de stock :');
      d = d.replace(/Stock OUT:/i, 'Sortie de stock :');
      d = d.replace(/via Supplier/i, 'via Fournisseur');
      d = d.replace(/Created category:/i, 'Catégorie créée :');
      d = d.replace(/Added customer:/i, 'Client ajouté :');
      d = d.replace(/Payment of/i, 'Paiement de');
      d = d.replace(/from/i, 'de');
      d = d.replace(/Return of/i, 'Retour de');
      d = d.replace(/Value:/i, 'Valeur :');
      d = d.replace(/Initial Debt:/i, 'Dette initiale :');
      d = d.replace(/Qty:/g, 'Qté :');
      d = d.replace(/units/i, 'unités');
    }
    return d;
  };

  const filteredActivities = (activities || []).filter(a => {
    if (currentUserRole !== 'admin' && (a.actorId === 'admin' || a.actorName === 'gamra')) {
      return false;
    }
    const d = new Date(a.timestamp);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesType = filterActivityType === 'all' || a.type === filterActivityType;
    const translatedDetails = translateActivityDetails(a.details);
    const matchesSearch = (translatedDetails || '').toLowerCase().includes(searchHistory.toLowerCase()) || 
                         (a.actorName || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesType && matchesSearch;
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { v: 1, n: 'Jan' }, { v: 2, n: 'Feb' }, { v: 3, n: 'Mar' }, { v: 4, n: 'Apr' },
    { v: 5, n: 'May' }, { v: 6, n: 'Jun' }, { v: 7, n: 'Jul' }, { v: 8, n: 'Aug' },
    { v: 9, n: 'Sep' }, { v: 10, n: 'Oct' }, { v: 11, n: 'Nov' }, { v: 12, n: 'Dec' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <ShoppingCart className="w-4 h-4 text-accent" />;
      case 'PAYMENT': return <Save className="w-4 h-4 text-success" />;
      case 'PRODUCT': return <Package className="w-4 h-4 text-warning" />;
      case 'CUSTOMER': return <Users className="w-4 h-4 text-info" />;
      case 'STAFF': return <UserCog className="w-4 h-4 text-danger" />;
      case 'STOCK': return <Archive className="w-4 h-4 text-indigo-500" />;
      default: return <AlertCircle className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 pb-20">
      <div className="bg-card border border-border-subtle p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          <div className="flex flex-wrap gap-2 bg-sidebar border border-border-subtle p-1.5 rounded-xl self-start lg:self-center">
             <button 
              onClick={() => setSubView('activity')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'activity' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {t.allActivities}
            </button>
            <button 
              onClick={() => setSubView('sales')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'sales' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {t.sales}
            </button>
            <button 
              onClick={() => setSubView('payments')}
              className={cn("px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", subView === 'payments' ? "bg-accent text-white shadow-lg shadow-accent/20 scale-[1.02]" : "text-text-secondary hover:text-text-main")}
            >
              <Save className="w-3.5 h-3.5" />
              {t.payments}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
             <button 
              onClick={() => onRefresh()}
              className="p-2.5 rounded-xl border border-border-subtle hover:bg-bg-base text-text-secondary transition-colors"
              title="Refresh"
            >
              <ArrowRightLeft className="w-4 h-4 rotate-90" />
            </button>
            <button 
              onClick={() => {
                const currentList = subView === 'sales' ? filteredSales : (subView === 'payments' ? filteredPayments : filteredActivities);
                let periodStr = filterYear.toString();
                if (filterMonth > 0) {
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
                      return { date: a.timestamp, amount: 0, description: `[${a.type}] ${a.details} (by ${a.actorName || 'System'})` };
                    }
                    const customerMatch = customers.find(c => c.id === (item as Sale).customerId);
                    return {
                      date: item.date,
                      amount: subView === 'sales' ? (item as Sale).total : (item as Payment).amount,
                      description: subView === 'sales' ? (customerMatch?.name || 'Walk-in') : (item as Payment).customerName
                    };
                  })
                }, language, settings);
              }}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-[11px] font-black border border-border-subtle px-6 py-2.5 rounded-xl hover:border-accent transition-all bg-white shadow-sm hover:shadow-md"
            >
              <Printer className="w-4 h-4 text-accent" />
              {language === 'ar' ? "تحميل التقرير" : "EXPORT REPORT"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
           <div className="md:col-span-12 lg:col-span-6 relative">
             <Search className={cn("absolute top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4", language === 'ar' ? "right-4" : "left-4")} />
             <input 
               placeholder={language === 'ar' ? "بحث في السجلات..." : "Search history records..."} 
               className={cn(
                 "w-full bg-bg-base border border-border-subtle rounded-xl py-3 text-sm focus:border-accent outline-none",
                 language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
               )}
               value={searchHistory} onChange={e => setSearchHistory(e.target.value)}
             />
           </div>
           
           <div className="md:col-span-4 lg:col-span-2">
             <select 
               className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
               value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}
             >
               <option value={0}>{language === 'ar' ? "جميع الشهور" : "All Months"}</option>
               {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
             </select>
           </div>

           <div className="md:col-span-4 lg:col-span-2">
             <select 
               className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
               value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}
             >
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>

           {subView === 'activity' && (
             <div className="md:col-span-4 lg:col-span-2">
               <select 
                 className={cn("w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-xs focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
                 value={filterActivityType} onChange={e => setFilterActivityType(e.target.value)}
               >
                 <option value="all">{t.allCategories}</option>
                 <option value="SALE">SALE</option>
                 <option value="PAYMENT">PAYMENT</option>
                 <option value="PRODUCT">PRODUCT</option>
                 <option value="CUSTOMER">CUSTOMER</option>
                 <option value="STAFF">STAFF</option>
                 <option value="STOCK">STOCK</option>
               </select>
             </div>
           )}
        </div>
      </div>

      <div className="bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {subView === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sidebar/50 border-b border-border-subtle">
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "المعرف / التاريخ" : "REFERENCE / DATE"}</th>
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "المنتجات" : "PRODUCTS"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{language === 'ar' ? "المبلغ" : "AMOUNT"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredSales.map(s => (
                  <tr key={s.id} className="group hover:bg-bg-base/30 transition-colors">
                    <td className="p-5">
                       <div className="font-bold text-text-main text-sm">#{s.invoiceNumber}</div>
                       <div className="text-text-secondary text-[11px] mt-1 font-medium">{new Date(s.date).toLocaleDateString()} • {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       {s.paymentMethod === 'check' && (
                         <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-blue-100">
                           <CreditCard className="w-3 h-3" />
                           {s.checkNumber} {s.checkOwner && `| ${s.checkOwner}`}
                         </div>
                       )}
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1">
                        {(s.items || []).slice(0, 3).map((i, idx) => (
                          <span key={idx} className="bg-bg-base px-2 py-0.5 rounded text-[10px] font-bold border border-border-subtle">{i.qty}x {i.name}</span>
                        ))}
                        {(s.items?.length || 0) > 3 && <span className="text-[10px] text-text-secondary font-bold">+{(s.items?.length || 0) - 3} more</span>}
                      </div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                       <div className="text-base font-black text-text-main tracking-tight">{formatNumber(s.total)} {t.currency}</div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                      <button 
                        onClick={() => printInvoice(s)}
                        className={cn("p-2.5 rounded-xl hover:bg-accent hover:text-white text-accent transition-all", language === 'ar' ? "mr-auto" : "ml-auto")}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-sidebar/50 border-b border-border-subtle">
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "الزبون" : "CUSTOMER"}</th>
                  <th className="p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">{language === 'ar' ? "التاريخ والوقت" : "TIMESTAMP"}</th>
                  <th className={cn("p-5 text-[10px] font-black text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{t.amount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="group hover:bg-bg-base/30 transition-colors">
                    <td className="p-5">
                       <div className="font-bold text-text-main">{p.customerName}</div>
                       {p.payment_method === 'check' && (
                         <div className="mt-2 inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-purple-100">
                           <CreditCard className="w-3 h-3" />
                           {p.check_number} {p.check_owner && `| ${p.check_owner}`}
                         </div>
                       )}
                    </td>
                    <td className="p-5">
                       <div className="text-text-secondary text-[11px] font-medium">{new Date(p.date).toLocaleDateString()} • {new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className={cn("p-5", language === 'ar' ? "text-left" : "text-right")}>
                       <div className="text-base font-black text-success tracking-tight">+{formatNumber(p.amount)} {t.currency}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subView === 'activity' && (
          <div className="divide-y divide-border-subtle">
            {filteredActivities.map(a => (
              <div key={a.id} className="p-5 hover:bg-bg-base/30 transition-colors flex gap-4 items-start">
                <div className="mt-1 w-8 h-8 rounded-full bg-sidebar flex items-center justify-center shrink-0 border border-border-subtle shadow-sm">
                  {getActivityIcon(a.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="text-[13px] font-bold text-text-main leading-tight">{translateActivityDetails(a.details)}</div>
                    <div className="text-[10px] text-text-secondary font-medium whitespace-nowrap ml-4">
                      {new Date(a.timestamp).toLocaleDateString()} • {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-base border border-border-subtle rounded text-[9px] font-black text-text-secondary uppercase tracking-tighter">
                      <UserCog className="w-2.5 h-2.5" />
                      {a.actorName || 'System'}
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                      a.action === 'create' ? "bg-success/10 text-success" : 
                      a.action === 'update' ? "bg-accent/10 text-accent" : 
                      a.action === 'delete' ? "bg-danger/10 text-danger" : "bg-sidebar text-text-secondary"
                    )}>
                      {a.action}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {((subView === 'sales' && filteredSales.length === 0) || 
          (subView === 'payments' && filteredPayments.length === 0) || 
          (subView === 'activity' && filteredActivities.length === 0)) && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Archive className="w-12 h-12 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">{language === 'ar' ? "لا توجد سجلات" : t.historyEmpty}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: Staff Management ---
// --- Component: Settings & User Management ---
function SettingsManagement({ 
  users, 
  settings, 
  setMessage, 
  currentUser, 
  language, 
  onRefresh,
  isDriveConnected,
  backingUpToDrive,
  handleGoogleConnect,
  handleDriveBackup,
  latestBackup,
  setBackingUpToDrive
}: { 
  users: UserProfile[], 
  settings: any, 
  setMessage: (m: { text: string, type: 'success' | 'error' }) => void, 
  currentUser: any, 
  language: Language, 
  onRefresh: () => void,
  isDriveConnected: boolean,
  backingUpToDrive: boolean,
  handleGoogleConnect: () => Promise<void>,
  handleDriveBackup: () => Promise<void>,
  latestBackup: any,
  setBackingUpToDrive: (b: boolean) => void
}) {
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
          users={users} 
          setMessage={setMessage} 
          currentUser={currentUser} 
          language={language} 
          onRefresh={onRefresh}
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

function StaffManagement({ 
  users, 
  setMessage, 
  currentUser, 
  language, 
  onRefresh,
  isDriveConnected,
  backingUpToDrive,
  handleGoogleConnect,
  handleDriveBackup,
  latestBackup,
  setBackingUpToDrive
}: { 
  users: UserProfile[], 
  setMessage: (m: { text: string, type: 'success' | 'error' }) => void, 
  currentUser: any, 
  language: Language, 
  onRefresh: () => void,
  isDriveConnected: boolean,
  backingUpToDrive: boolean,
  handleGoogleConnect: () => Promise<void>,
  handleDriveBackup: () => Promise<void>,
  latestBackup: any,
  setBackingUpToDrive: (b: boolean) => void
}) {
  const t = translations[language];
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'manager'>('staff');
  const [newPerms, setNewPerms] = useState({ stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [changingPasswordUser, setChangingPasswordUser] = useState<UserProfile | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser || !newPasswordVal.trim()) return;

    setUpdatingPassword(true);
    try {
      await api.updateUser(changingPasswordUser.id, {
        role: changingPasswordUser.role,
        permissions: changingPasswordUser.permissions,
        password: newPasswordVal.trim()
      });
      setMessage({ 
        text: language === 'ar' ? "تم تغيير كلمة المرور بنجاح." : "Password changed successfully.", 
        type: 'success' 
      });
      setChangingPasswordUser(null);
      setNewPasswordVal('');
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: language === 'ar' ? "فشل تغيير كلمة المرور." : "Failed to change password.", 
        type: 'error' 
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id || userId === currentUser?.uid) {
      setMessage({ 
        text: language === 'ar' ? "لا يمكنك حذف حسابك الشخصي." : "Cannot delete your own account.", 
        type: 'error' 
      });
      return;
    }

    if (!window.confirm(language === 'ar' ? "هل أنت متأكد من حذف هذا الموظف نهائياً؟" : "Are you sure you want to permanently delete this staff member?")) {
      return;
    }

    try {
      await api.deleteUser(userId);
      setMessage({ 
        text: language === 'ar' ? "تم حذف حساب الموظف نهائياً." : "Staff member account permanently deleted.", 
        type: 'success' 
      });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: language === 'ar' ? "فشل حذف حساب الموظف." : "Failed to delete staff member.", 
        type: 'error' 
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setMessage({ text: language === 'ar' ? "يرجى ملء كافة الخانات." : "Please fill all fields.", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const usernameLower = newUsername.toLowerCase().trim();
      const isPowerUser = newRole === 'admin';
      const result = await api.register(usernameLower, newPassword, newRole, isPowerUser ? { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true, financialsPaymentMethods: true } : newPerms);
      
      if (result.status === "success") {
        setMessage({ text: language === 'ar' ? "تم تسجيل الموظف بنجاح." : "Staff member registered successfully.", type: 'success' });
        setNewUsername('');
        setNewPassword('');
        setNewPerms({ stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false });
        onRefresh();
      } else {
        setMessage({ text: result.message || "Registration failed", type: 'error' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Registration failed", type: 'error' });
    } finally {
      setIsSubmitting(false);
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
          // Reset file input
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

  const toggleRole = async (userId: string, currentRole: 'admin' | 'staff' | 'manager') => {
    if (userId === currentUser?.id || userId === currentUser?.uid) {
      setMessage({ text: language === 'ar' ? "لا يمكنك تغيير رتبتك." : "Cannot change your own role.", type: 'error' });
      return;
    }
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    let nextRole: 'admin' | 'staff' | 'manager' = 'staff';
    if (currentRole === 'staff') nextRole = 'manager';
    else if (currentRole === 'manager') nextRole = 'admin';
    else nextRole = 'staff';

    try {
      await api.updateUser(userId, {
        role: nextRole
      });
      setMessage({ text: language === 'ar' ? "تم تحديث الرتبة." : "User role updated.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشل التحديث." : "Update failed.", type: 'error' });
    }
  };

  const togglePermission = async (userId: string, permission: 'stock' | 'customers' | 'history' | 'profits' | 'viewCostPrice' | 'editStock' | 'supplierDebt' | 'financials' | 'financialsSales' | 'financialsDebts' | 'financialsProfits' | 'financialsInventory' | 'viewSupplierDebtAmount' | 'financialsRestricted' | 'financialsPaymentMethods') => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    const currentPerms = targetUser.permissions || {};
    try {
      await api.updateUser(userId, {
        permissions: { ...currentPerms, [permission]: !currentPerms[permission] }
      });
      setMessage({ text: language === 'ar' ? "تم تحديث الصلاحيات بنجاح." : "Permissions updated successfully.", type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ text: language === 'ar' ? "فشل التحديث." : "Update failed.", type: 'error' });
    }
  };

  const handleForceLogoutAllDevices = async (userId: string) => {
    if (!window.confirm(language === 'ar' ? "هل أنت متأكد من تسجيل خروج هذا الحساب من جميع الأجهزة والمتصفحات؟" : "Are you sure you want to force logout this account from all devices and browsers?")) {
      return;
    }

    try {
      await api.logoutAllDevices(userId);
      setMessage({ 
        text: language === 'ar' ? "تم تسجيل خروج الحساب من جميع الأجهزة بنجاح." : "Account successfully logged out from all devices.", 
        type: 'success' 
      });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        text: language === 'ar' ? "فشل تسجيل الخروج من الأجهزة." : "Failed to force logout from devices.", 
        type: 'error' 
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-12">
      <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4", language === 'ar' && "md:flex-row-reverse")}>
        <div className={cn(language === 'ar' && "text-right")}>
          <h3 className="text-3xl font-black tracking-tighter mb-1 uppercase italic font-serif opacity-90">{t.staff}</h3>
          <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">{language === 'ar' ? "إدارة الأدوار وصلاحيات الوصول" : "IDENTITY & ACCESS MANAGEMENT"}</p>
        </div>
      </div>

      {/* Register Form */}
      <div className="bg-white border-2 border-border-subtle rounded-2xl p-6 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        <h4 className={cn("font-bold text-sm mb-6 flex items-center gap-2", language === 'ar' && "flex-row-reverse")}>
          <UserPlus className="w-4 h-4 text-accent" />
          {language === 'ar' ? "إضافة موظف جديد" : "REGISTER NEW STAFF"}
        </h4>
        <form onSubmit={handleAddUser} className="space-y-6">
          <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", language === 'ar' && "md:flex-row-reverse")}>
            <div className="flex-1">
              <input 
                type="text" 
                placeholder={language === 'ar' ? "اسم المستخدم" : "Username"}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className={cn("w-full bg-bg-base border-2 border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium transition-all", language === 'ar' && "text-right")}
                required
              />
            </div>
            <div className="flex-1">
              <input 
                type="password" 
                placeholder={language === 'ar' ? "كلمة المرور" : "Password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={cn("w-full bg-bg-base border-2 border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium transition-all", language === 'ar' && "text-right")}
                required
              />
            </div>
            <select 
              value={newRole}
              onChange={e => {
                const role = e.target.value as 'admin' | 'staff' | 'manager';
                setNewRole(role);
                if (role === 'manager') {
                  setNewPerms({
                    stock: true,
                    customers: true,
                    history: true,
                    profits: true,
                    viewCostPrice: true,
                    editStock: true,
                    supplierDebt: true,
                    financials: true,
                    financialsSales: true,
                    financialsDebts: true,
                    financialsProfits: true,
                    financialsInventory: true,
                    viewSupplierDebtAmount: true,
                    financialsRestricted: true,
                    financialsPaymentMethods: true
                  });
                } else if (role === 'staff') {
                  setNewPerms({
                    stock: true,
                    customers: false,
                    history: false,
                    profits: false,
                    viewCostPrice: false,
                    editStock: false,
                    supplierDebt: false,
                    financials: false,
                    financialsSales: false,
                    financialsDebts: false,
                    financialsProfits: false,
                    financialsInventory: false,
                    viewSupplierDebtAmount: false,
                    financialsRestricted: false,
                    financialsPaymentMethods: false
                  });
                }
              }}
              className={cn("bg-bg-base border-2 border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-bold", language === 'ar' && "text-right")}
            >
              <option value="staff">{language === 'ar' ? "موظف مبيعات" : "SALES STAFF"}</option>
              <option value="manager">{language === 'ar' ? "مسؤول (بدون إدارة الموظفين)" : "MANAGER (NO STAFF MGMT)"}</option>
              <option value="admin">{language === 'ar' ? "مدير نظام" : "ADMINISTRATOR"}</option>
            </select>
          </div>

          {(newRole === 'staff' || newRole === 'manager') && (
            <div className={cn("p-4 bg-bg-base rounded-xl border border-border-subtle", language === 'ar' && "text-right")}>
              <p className="text-[10px] font-black tracking-widest text-text-secondary uppercase mb-3 px-1">{language === 'ar' ? "تحديد الصلاحيات الإضافية" : "ASSIGN MODULE PERMISSIONS"}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.stock} onChange={e => setNewPerms({...newPerms, stock: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.inventory}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.customers} onChange={e => setNewPerms({...newPerms, customers: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.customers}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.history} onChange={e => setNewPerms({...newPerms, history: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.history}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.profits} onChange={e => setNewPerms({...newPerms, profits: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.canViewProfits}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.viewCostPrice} onChange={e => setNewPerms({...newPerms, viewCostPrice: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.canViewCostPrice}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.editStock} onChange={e => setNewPerms({...newPerms, editStock: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{t.canEditStock}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.supplierDebt} onChange={e => setNewPerms({...newPerms, supplierDebt: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permSupplierDebt}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.viewSupplierDebtAmount} onChange={e => setNewPerms({...newPerms, viewSupplierDebtAmount: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permSupplierDebtAmount}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financials} onChange={e => setNewPerms({...newPerms, financials: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancials}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsRestricted} onChange={e => setNewPerms({...newPerms, financialsRestricted: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsRestricted}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsPaymentMethods} onChange={e => setNewPerms({...newPerms, financialsPaymentMethods: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsPaymentMethods}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsSales} onChange={e => setNewPerms({...newPerms, financialsSales: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsSales}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsDebts} onChange={e => setNewPerms({...newPerms, financialsDebts: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsDebts}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsProfits} onChange={e => setNewPerms({...newPerms, financialsProfits: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsProfits}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsInventory} onChange={e => setNewPerms({...newPerms, financialsInventory: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsInventory}</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-accent text-white px-10 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 shadow-lg shadow-accent/20"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? '...' : (language === 'ar' ? 'إنشاء حساب الموظف' : 'CREATE STAFF ACCOUNT')}
            </button>
          </div>
        </form>
      </div>

      <div className="section-container bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#fafafa] border-b border-border-subtle">
              <th className="p-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest">{language === 'ar' ? "الهوية" : "IDENTITY"}</th>
              <th className="p-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest text-center">{language === 'ar' ? "الدور" : "ACCESS ROLE"}</th>
              <th className="p-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest text-center">{language === 'ar' ? "صلاحيات الوصول" : "MODULE ACCESS"}</th>
              <th className={cn("p-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest", language === 'ar' ? "text-left" : "text-right")}>{language === 'ar' ? "الإجراءات" : "ACTIONS"}</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => {
              const getIsPermActive = (permission: string) => {
                const defaultAdminPerms: any = { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true };
                const defaultStaffPerms: any = { stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false };
                
                if (u.permissions && u.permissions[permission] !== undefined) {
                  return u.permissions[permission];
                }
                return (u.role === 'admin' || u.role === 'manager') ? defaultAdminPerms[permission] : defaultStaffPerms[permission];
              };

              return (
                <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-base transition-colors text-[13px] group">
                  <td className="p-4">
                    <div className="flex flex-col font-mono text-xs">
                      <span className="font-bold text-text-main flex items-center gap-2 text-sm italic">
                        {(u as any).username || u.email}
                        {u.id === currentUser.uid && (
                          <span className="not-italic text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-black tracking-tighter uppercase border border-accent/20">
                            {language === 'ar' ? 'أنت' : 'YOU'}
                          </span>
                        )}
                      </span>
                      {u.createdAt && (
                        <span className="text-[10px] text-text-secondary">
                          {language === 'ar' ? 'منذ: ' : 'SINCE: '}
                          {new Date(u.createdAt.seconds ? u.createdAt.seconds * 1000 : u.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border",
                      u.role === 'admin' ? "bg-accent/5 border-accent text-accent" : 
                      u.role === 'manager' ? "bg-emerald-500/5 border-emerald-500 text-emerald-600" :
                      "bg-bg-base border-border-subtle text-text-secondary"
                    )}>
                      {u.role === 'admin' ? (language === 'ar' ? 'مسؤول' : 'admin') : 
                       u.role === 'manager' ? (language === 'ar' ? 'مسؤول (بدون موظفين)' : 'manager') : 
                       (language === 'ar' ? 'موظف' : 'staff')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                       <PermissionBadge label={t.permStock} active={getIsPermActive('stock')} onClick={() => togglePermission(u.id, 'stock')} language={language} />
                       <PermissionBadge label={t.permCustomers} active={getIsPermActive('customers')} onClick={() => togglePermission(u.id, 'customers')} language={language} />
                       <PermissionBadge label={t.permHistory} active={getIsPermActive('history')} onClick={() => togglePermission(u.id, 'history')} language={language} />
                       <PermissionBadge label={t.canViewProfits} active={getIsPermActive('profits')} onClick={() => togglePermission(u.id, 'profits')} language={language} />
                       <PermissionBadge label={t.canViewCostPrice} active={getIsPermActive('viewCostPrice')} onClick={() => togglePermission(u.id, 'viewCostPrice')} language={language} />
                       <PermissionBadge label={t.canEditStock} active={getIsPermActive('editStock')} onClick={() => togglePermission(u.id, 'editStock')} language={language} />
                       <PermissionBadge label={(t as any).permSupplierDebt} active={getIsPermActive('supplierDebt')} onClick={() => togglePermission(u.id, 'supplierDebt')} language={language} />
                       <PermissionBadge label={(t as any).permSupplierDebtAmount} active={getIsPermActive('viewSupplierDebtAmount')} onClick={() => togglePermission(u.id, 'viewSupplierDebtAmount')} language={language} />
                       <PermissionBadge label={(t as any).permFinancials} active={getIsPermActive('financials')} onClick={() => togglePermission(u.id, 'financials')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsRestricted} active={getIsPermActive('financialsRestricted')} onClick={() => togglePermission(u.id, 'financialsRestricted')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsPaymentMethods} active={getIsPermActive('financialsPaymentMethods')} onClick={() => togglePermission(u.id, 'financialsPaymentMethods')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsSales} active={getIsPermActive('financialsSales')} onClick={() => togglePermission(u.id, 'financialsSales')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsDebts} active={getIsPermActive('financialsDebts')} onClick={() => togglePermission(u.id, 'financialsDebts')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsProfits} active={getIsPermActive('financialsProfits')} onClick={() => togglePermission(u.id, 'financialsProfits')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsInventory} active={getIsPermActive('financialsInventory')} onClick={() => togglePermission(u.id, 'financialsInventory')} language={language} />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={cn("flex items-center gap-3 justify-end", language === 'ar' && "flex-row-reverse justify-start")}>
                      {/* Promote/Demote */}
                       <button 
                        disabled={u.id === currentUser.uid}
                        onClick={() => toggleRole(u.id, u.role as any)}
                        className="text-[10px] font-black tracking-widest text-text-main/60 hover:text-accent hover:border-accent border border-border-subtle rounded px-2.5 py-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={language === 'ar' ? 'تغيير الرتبة' : 'CHANGE ROLE'}
                      >
                        {u.role === 'admin' 
                          ? (language === 'ar' ? 'مسؤول 🔄' : 'ADMIN 🔄') 
                          : u.role === 'manager'
                          ? (language === 'ar' ? 'مسؤول (بدون موظفين) 🔄' : 'MANAGER 🔄')
                          : (language === 'ar' ? 'موظف 🔄' : 'STAFF 🔄')
                        }
                      </button>

                      {/* Change Password */}
                      <button 
                        onClick={() => setChangingPasswordUser(u)}
                        className="p-1.5 hover:bg-accent/10 hover:text-accent text-text-secondary border border-border-subtle rounded transition-all"
                        title={language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      {/* Force Logout Everywhere */}
                      <button 
                        onClick={() => handleForceLogoutAllDevices(u.id)}
                        className="p-1.5 hover:bg-amber-500/10 hover:text-amber-500 text-text-secondary border border-border-subtle rounded transition-all"
                        title={language === 'ar' ? 'تسجيل الخروج من كافة الأجهزة' : 'Force Logout from all devices'}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button 
                        disabled={u.id === currentUser.uid}
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 hover:bg-danger/10 hover:text-danger text-text-secondary border border-border-subtle rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={language === 'ar' ? 'حذف الحساب' : 'Delete Account'}
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
      
      <div className="bg-bg-base/30 border border-dashed border-border-subtle p-6 rounded-2xl flex items-start gap-4">
        <div className="p-3 rounded-full bg-accent/5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-accent" />
        </div>
        <div className={cn(language === 'ar' && "text-right")}>
          <h4 className="font-bold text-xs uppercase tracking-widest mb-1">{language === 'ar' ? "بروتوكول الوصول" : "ACCESS PROTOCOL"}</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
            {language === 'ar' 
              ? "يتم تأمين كافة العمليات عبر تشفير Google Auth. يمكن للمسؤولين فقط تعديل الرتب أو الوصول لبيانات النظام الحساسة. يتم تسجيل كل تعديل في سجلات النظام."
              : "System security is enforced via Google Authentication. Only administrators can modify roles or access sensitive infrastructure. All role transitions are cryptographically logged."
            }
          </p>
        </div>
      </div>

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
                {language === 'ar' ? "آخر نسخة احتياطية تلقائية:" : "LAST AUTO-BACKUP:"} {new Date(latestBackup.created_at).toLocaleString()}
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
                  <Cloud className={cn("w-4 h-4", backingUpToDrive && "animate-pulse")} />
                  {t.backupToDrive}
                </button>

                <button
                  onClick={async () => {
                    try {
                      setBackingUpToDrive(true);
                      await api.sendBackupEmail();
                      setMessage({ text: language === 'ar' ? "تم إرسال النسخة الاحتياطية للبريد!" : "Backup sent to email!", type: 'success' });
                    } catch (e: any) {
                      const msg = e.message || '';
                      if (msg.includes('SMTP_AUTH_FAILED')) {
                        setMessage({ text: t.smtpError, type: 'error' });
                      } else {
                        setMessage({ text: msg || t.backupError, type: 'error' });
                      }
                    } finally {
                      setBackingUpToDrive(false);
                    }
                  }}
                  disabled={backingUpToDrive}
                  className="px-6 py-3 bg-white border-2 border-accent text-accent font-black rounded-xl hover:bg-accent/5 active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                >
                  <Mail className="w-4 h-4" />
                  {t.backupToEmail}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGoogleConnect}
                  className="px-6 py-3 bg-white border-2 border-border-subtle text-[#4285F4] font-black rounded-xl hover:bg-white active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                >
                  <img src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="Drive" className="w-5 h-5" />
                  {t.googleDriveConnect}
                </button>

                <button
                  onClick={async () => {
                    try {
                      setBackingUpToDrive(true);
                      await api.sendBackupEmail();
                      setMessage({ text: language === 'ar' ? "تم إرسال النسخة الاحتياطية للبريد!" : "Backup sent to email!", type: 'success' });
                    } catch (e: any) {
                      const msg = e.message || '';
                      if (msg.includes('SMTP_AUTH_FAILED')) {
                        setMessage({ text: t.smtpError, type: 'error' });
                      } else {
                        setMessage({ text: msg || t.backupError, type: 'error' });
                      }
                    } finally {
                      setBackingUpToDrive(false);
                    }
                  }}
                  disabled={backingUpToDrive}
                  className="px-6 py-3 bg-white border-2 border-accent text-accent font-black rounded-xl hover:bg-accent/5 active:scale-95 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                >
                  <Mail className="w-4 h-4" />
                  {t.backupToEmail}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {changingPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md p-6 rounded-3xl border border-border-subtle shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setChangingPasswordUser(null);
                  setNewPasswordVal('');
                }}
                className="absolute top-4 right-4 p-2 hover:bg-bg-base rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>

              <div className={cn("space-y-4", language === 'ar' && "text-right")}>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-accent/15 text-accent">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main">
                      {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono uppercase tracking-wider">
                      {changingPasswordUser.username || changingPasswordUser.email}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSavePassword} className="space-y-4 pt-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                      {language === 'ar' ? 'كلمة المرور الجديدة' : 'NEW PASSWORD'}
                    </label>
                    <input 
                      type="password"
                      required
                      value={newPasswordVal}
                      onChange={e => setNewPasswordVal(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 focus:ring-2 focus:ring-accent outline-none font-medium text-text-main"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setChangingPasswordUser(null);
                        setNewPasswordVal('');
                      }}
                      className="bg-bg-base hover:bg-border-subtle/50 text-text-main px-6 py-3 rounded-xl font-bold text-sm transition-all"
                    >
                      {language === 'ar' ? 'إلغاء' : 'CANCEL'}
                    </button>
                    <button 
                      type="submit"
                      disabled={updatingPassword}
                      className="bg-accent text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {updatingPassword ? '...' : (language === 'ar' ? 'حفظ' : 'SAVE')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PermissionBadge({ label, active, onClick, language }: { label: string, active?: boolean, onClick: () => void, language: Language }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded text-[9px] font-bold transition-all border",
        active 
          ? "bg-success/10 border-success/30 text-success shadow-sm" 
          : "bg-bg-base border-border-subtle text-text-secondary opacity-40 hover:opacity-100 hover:bg-white"
      )}
    >
      {label}
    </button>
  );
}

function CheckListView({ checks, language, settings }: { checks: CheckDoc[], language: Language, settings: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkTypeFilter, setCheckTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const t = translations[language];

  const filteredChecks = checks.filter(c => {
    const matchesSearch = c.checkNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.checkOwner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.partyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = checkTypeFilter === 'all' || c.partyRole === checkTypeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 pb-12">
      <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4", language === 'ar' && "md:flex-row-reverse")}>
        <div className={cn(language === 'ar' && "text-right")}>
          <h3 className="text-3xl font-black tracking-tighter mb-1 uppercase italic font-serif opacity-90">{t.checks}</h3>
          <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">{language === 'ar' ? "إدارة الشيكات الصادرة والواردة" : "INCOMING & OUTGOING CHECK MANAGEMENT"}</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-2xl border border-border-subtle shadow-inner">
            {(['all', 'customer', 'supplier'] as const).map(type => (
              <button
                key={type}
                onClick={() => setCheckTypeFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  checkTypeFilter === type ? "bg-accent text-white shadow-md shadow-accent/20" : "text-text-secondary hover:bg-bg-base"
                )}
              >
                {type === 'all' ? (language === 'ar' ? "الكل" : "ALL") : 
                 type === 'customer' ? t.customerChecks : t.supplierChecks}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary transition-colors group-focus-within:text-accent", language === 'ar' ? "right-4" : "left-4")} />
            <input 
              type="text"
              placeholder={language === 'ar' ? "بحث في الشيكات..." : "Search checks..."}
              className={cn("bg-white border-2 border-border-subtle rounded-2xl py-3 px-10 text-sm focus:border-accent outline-none w-full md:w-80 font-bold transition-all shadow-sm", language === 'ar' && "text-right")}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-base/50 border-b border-border-subtle text-center">
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "رقم الشيك" : "CHECK NUMBER"}</th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "صاحب الشيك" : "CHECK OWNER"}</th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "الجهة" : "OWNER / ENTITY"}</th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "التصنيف" : "CATEGORY"}</th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest">{language === 'ar' ? "المبلغ" : "AMOUNT"}</th>
              <th className="p-5 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right">{language === 'ar' ? "التاريخ" : "DATE"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Archive className="w-12 h-12" />
                    <p className="text-xs font-black uppercase tracking-widest">{t.noChecks}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredChecks.map(check => (
                <tr key={check.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-base transition-colors group text-center">
                  <td className="p-5 text-left">
                    <div className="font-mono text-sm font-black text-accent">{check.checkNumber || '-'}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-sm font-bold text-text-main uppercase">{check.checkOwner || '-'}</div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-text-main uppercase">{check.partyName || t.walkingCustomer}</span>
                      <span className={cn("text-[8px] font-black px-2 py-0.5 rounded uppercase mt-1", 
                        check.partyRole === 'customer' ? "bg-blue-50 text-blue-500 border border-blue-100" : "bg-orange-50 text-orange-500 border border-orange-100")}>
                        {check.partyRole === 'customer' ? (language === 'ar' ? 'زبون' : 'CUSTOMER') : (language === 'ar' ? 'مورد' : 'SUPPLIER')}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block", 
                      check.type === 'sale' ? "bg-success/10 text-success" : 
                      check.type === 'payment' ? "bg-purple-100 text-purple-600" :
                      "bg-danger/10 text-danger")}>
                      {check.type === 'sale' ? (language === 'ar' ? 'مبيع' : 'SALE') : 
                       check.type === 'payment' ? (language === 'ar' ? 'تأدية دين' : 'DEBT PAYMENT') :
                       (language === 'ar' ? 'أداء للمورد' : 'SUPPLIER PAY')}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className={cn("inline-block px-3 py-1 rounded-full text-xs font-black", 
                      check.partyRole === 'customer' ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                      {check.partyRole === 'customer' ? '+' : '-'}{formatNumber(check.total)} DH
                    </div>
                  </td>
                  <td className="p-5 text-right font-mono text-[11px] text-text-secondary">
                    {new Date(check.date).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


