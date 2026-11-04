import { z } from 'zod';

const parseNumber = (val: unknown, fallback: number = 0) => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(',', '.').trim();
    if (!cleaned) return fallback;
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
};

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.preprocess((val) => parseNumber(val, NaN), z.number().min(0, "Price must be positive")),
  costPrice: z.preprocess((val) => parseNumber(val, 0), z.number().min(0, "Cost price must be positive")).optional().default(0),
  qty: z.preprocess((val) => parseNumber(val, 0), z.number()).optional().default(0),
  minStock: z.preprocess((val) => parseNumber(val, 5), z.number().min(0)).optional().default(5),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  actor: z.string().optional().nullable(),
});

export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    qty: z.number().positive(),
    price: z.number().min(0),
    name: z.string()
  })).min(1, "Sale must have at least one item"),
  total: z.number().min(0),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  paymentMethod: z.string(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  checkOwner: z.string().optional().nullable(),
  checkDueDate: z.string().optional().nullable(),
  checkStatus: z.string().optional().nullable(),
  checkAmount: z.number().optional().nullable(),
  cashAmount: z.number().optional().nullable(),
  debtAmount: z.number().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  debt: z.number().optional().default(0),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  debt: z.number().optional().default(0),
});

export const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});
