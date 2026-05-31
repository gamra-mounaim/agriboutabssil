const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const startStr = '// --- Component: Dashboard Highlights ---';
const endStr = '// --- View: Inventory ---';

const startIdx = app.indexOf(startStr);
const endIdx = app.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
  console.log('Failed to find boundaries');
  process.exit(1);
}

const componentCode = app.substring(startIdx, endIdx);

const imports = `import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReChartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Package, Users, Wallet, AlertTriangle, TrendingUp, PieChart as PieChartIcon, Calendar, DollarSign, Activity, CreditCard, ShoppingCart, LayoutGrid, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatNumber, cn } from '../utils';
import { Product, Category, Customer, Sale } from '../types';
import { Language, translations } from '../translations';
import { generateStockReportPDF } from '../services/invoiceService';

export default ` + componentCode.replace('function DashboardStats', 'function DashboardStats');

fs.writeFileSync('src/pages/DashboardStats.tsx', imports);

// Remove the component from App.tsx and add import
const newApp = app.substring(0, startIdx) + 
  app.substring(endIdx);

// We need to add the import statement to App.tsx near the top
const typesImportStr = "import { Notification } from './types';";
const insertIdx = newApp.indexOf(typesImportStr) + typesImportStr.length;

const finalApp = newApp.substring(0, insertIdx) + 
  "\nimport DashboardStats from './pages/DashboardStats';\n" + 
  newApp.substring(insertIdx);

fs.writeFileSync('src/App.tsx', finalApp);
console.log('Successfully extracted DashboardStats!');
