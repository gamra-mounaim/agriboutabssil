export interface Product {
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
  soldQty?: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: any;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Sale {
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
  checkAmount?: number;
  cashAmount?: number;
}

export interface Customer {
  id: string;
  name: string;
  debt: number;
  email?: string;
  phone?: string;
  address?: string;
  due_date?: string;
  dueDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  debt: number;
  due_date?: string;
  dueDate?: string;
}

export interface UserProfile {
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
    financialsTopProducts?: boolean;
    financialsTopDebtors?: boolean;
    manageInvoices?: boolean;
  };
  createdAt: any;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  staffId: string;
  payment_method?: string;
  checkNumber?: string;
  checkOwner?: string;
  checkAmount?: number;
  cashAmount?: number;
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

export type View = 'pos' | 'inventory' | 'customers' | 'suppliers' | 'history' | 'financials' | 'users' | 'settings' | 'checks' | 'invoices' | 'damages';

export interface TransactionRecord {
  id: string;
  type: 'PAYMENT' | 'DEBT' | 'SALE';
  amount: number;
  date: string;
  description: string;
}

export interface ActivityLog {
  id: string;
  type: 'SALE' | 'PAYMENT' | 'PRODUCT' | 'CUSTOMER' | 'STAFF' | 'STOCK' | 'CATEGORY';
  action: 'create' | 'update' | 'delete' | 'login';
  details: string;
  actorId: string;
  actorName: string;
  timestamp: string;
}

export interface CheckDoc {
  id: string;
  checkNumber: string;
  checkOwner: string;
  total: number;
  date: string;
  partyName: string;
  partyRole: 'customer' | 'supplier';
  type: 'sale' | 'payment' | 'supplier_payment';
}

export interface Notification {
  id: string;
  type: 'STOCK' | 'DEBT' | 'SYSTEM';
  title: string;
  message: string;
  isRead: number;
  createdAt: string;
}
