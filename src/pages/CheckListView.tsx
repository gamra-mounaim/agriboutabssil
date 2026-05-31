import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Customer, Sale, SaleItem, Supplier, UserProfile, Payment, ActivityLog, CheckDoc, Notification, TransactionRecord, moroccanBanks } from '../types';
import { Language, translations } from '../translations';
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

export default function CheckListView({ checks, language, settings }: { checks: CheckDoc[], language: Language, settings: any }) {
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


