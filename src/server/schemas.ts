import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be positive"),
  costPrice: z.number().min(0, "Cost price must be positive"),
  qty: z.number().int(),
  minStock: z.number().int().min(0),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
});

export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    qty: z.number().int().min(1),
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
