import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.coerce.number().positive("A quantidade deve ser maior que zero."),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0)
});

export const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um produto."),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum([
    "cash",
    "credit_card",
    "debit_card",
    "pix",
    "bank_slip",
    "store_credit",
    "mixed"
  ])
});

export type SaleFormValues = z.infer<typeof saleSchema>;
