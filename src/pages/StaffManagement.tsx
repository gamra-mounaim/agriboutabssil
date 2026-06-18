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

export default function StaffManagement({ 
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
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'manager'>('staff');
  const [newPerms, setNewPerms] = useState({ stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false, financialsTopProducts: false, financialsTopDebtors: false });
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
      const result = await api.register(usernameLower, newPassword, newRole, isPowerUser ? { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true, financialsPaymentMethods: true, financialsTopProducts: true, financialsTopDebtors: true } : newPerms);
      
      if (result.status === "success") {
        setMessage({ text: language === 'ar' ? "تم تسجيل الموظف بنجاح." : "Staff member registered successfully.", type: 'success' });
        setNewUsername('');
        setNewPassword('');
        setNewPerms({ stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false, financialsTopProducts: false, financialsTopDebtors: false });
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

  const togglePermission = async (userId: string, permission: 'stock' | 'customers' | 'history' | 'profits' | 'viewCostPrice' | 'editStock' | 'supplierDebt' | 'financials' | 'financialsSales' | 'financialsDebts' | 'financialsProfits' | 'financialsInventory' | 'viewSupplierDebtAmount' | 'financialsRestricted' | 'financialsPaymentMethods' | 'financialsTopProducts' | 'financialsTopDebtors' | 'manageInvoices') => {
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
                    financialsPaymentMethods: true,
                    financialsTopProducts: true,
                    financialsTopDebtors: true
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
                    financialsPaymentMethods: false,
                    financialsTopProducts: false,
                    financialsTopDebtors: false
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
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsTopProducts} onChange={e => setNewPerms({...newPerms, financialsTopProducts: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsTopProducts}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={newPerms.financialsTopDebtors} onChange={e => setNewPerms({...newPerms, financialsTopDebtors: e.target.checked})} className="w-4 h-4 accent-accent" />
                  <span className="text-xs font-bold text-text-main group-hover:text-accent transition-colors">{(t as any).permFinancialsTopDebtors}</span>
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
                const defaultAdminPerms: any = { stock: true, customers: true, history: true, profits: true, viewCostPrice: true, editStock: true, supplierDebt: true, financials: true, financialsSales: true, financialsDebts: true, financialsProfits: true, financialsInventory: true, viewSupplierDebtAmount: true, financialsRestricted: true, financialsPaymentMethods: true, financialsTopProducts: true, financialsTopDebtors: true };
                const defaultStaffPerms: any = { stock: true, customers: false, history: false, profits: false, viewCostPrice: false, editStock: false, supplierDebt: false, financials: false, financialsSales: false, financialsDebts: false, financialsProfits: false, financialsInventory: false, viewSupplierDebtAmount: false, financialsRestricted: false, financialsPaymentMethods: false, financialsTopProducts: false, financialsTopDebtors: false };
                
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
                        {(u.id === currentUser?.id || u.id === currentUser?.uid) && (
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
                       <PermissionBadge label={(t as any).manageInvoices} active={getIsPermActive('manageInvoices')} onClick={() => togglePermission(u.id, 'manageInvoices')} language={language} />
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
                       <PermissionBadge label={(t as any).permFinancialsTopProducts} active={getIsPermActive('financialsTopProducts')} onClick={() => togglePermission(u.id, 'financialsTopProducts')} language={language} />
                       <PermissionBadge label={(t as any).permFinancialsTopDebtors} active={getIsPermActive('financialsTopDebtors')} onClick={() => togglePermission(u.id, 'financialsTopDebtors')} language={language} />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={cn("flex items-center gap-3 justify-end", language === 'ar' && "flex-row-reverse justify-start")}>
                      {/* Promote/Demote */}
                       <button 
                        disabled={u.id === currentUser?.id || u.id === currentUser?.uid}
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
                        disabled={u.id === currentUser?.id || u.id === currentUser?.uid}
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

