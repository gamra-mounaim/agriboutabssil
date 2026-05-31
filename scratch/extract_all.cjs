const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const components = [
  { name: 'FinancialDashboardView', search: 'function FinancialDashboardView({' },
  { name: 'Inventory', search: 'function Inventory({' },
  { name: 'POS', search: 'function POS({' },
  { name: 'CustomerList', search: 'function CustomerList({' },
  { name: 'SupplierList', search: 'function SupplierList({' },
  { name: 'HistoryView', search: 'function HistoryView({' },
  { name: 'SettingsManagement', search: 'function SettingsManagement({' },
  { name: 'StaffManagement', search: 'function StaffManagement({' },
  { name: 'CheckListView', search: 'function CheckListView({' }
];

// Add the end of file boundary
const boundaries = components.map(c => ({ name: c.name, idx: app.indexOf(c.search) })).filter(c => c.idx !== -1);
boundaries.sort((a, b) => a.idx - b.idx);
boundaries.push({ name: 'EOF', idx: app.length });

const baseImports = `import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Customer, Sale, Supplier, UserProfile, Payment, ActivityLog, CheckDoc, Notification } from '../types';
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
const { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, AlertTriangle, Printer, FileText, ChevronDown, ChevronUp, Image as ImageIcon, Camera, RefreshCw, X, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, Package, Users, Wallet, TrendingUp, Calendar, Activity, CreditCard, LayoutGrid, Download, ShieldCheck, AlertCircle, Save, Undo, History, UserPlus, Lock, Key, LogOut, Settings: SettingsIcon, MapPin, Phone, Mail, Link, Globe } = LucideIcons;

`;

let newApp = app.substring(0, boundaries[0].idx);

for (let i = 0; i < boundaries.length - 1; i++) {
  const current = boundaries[i];
  const next = boundaries[i+1];
  
  let code = app.substring(current.idx, next.idx);
  
  // Make it default export
  code = code.replace(/^function ([a-zA-Z0-9_]+)/m, 'export default function $1');
  
  fs.writeFileSync(`src/pages/${current.name}.tsx`, baseImports + code);
  
  // Add import to newApp
  newApp = `import ${current.name} from './pages/${current.name}';\n` + newApp;
}

// Write the modified App.tsx
fs.writeFileSync('src/App.tsx', newApp);
console.log('Extraction complete!');
