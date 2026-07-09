import type { Timestamp } from "firebase/firestore";
import type { TenantEntity } from "@/types/common";

export type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "pix"
  | "bank_slip"
  | "store_credit"
  | "mixed";

export type SaleStatus = "draft" | "paid" | "canceled" | "refunded";

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  subtotal: number;
  total: number;
}

export interface Sale extends TenantEntity {
  code: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  paidAt?: Timestamp;
  canceledAt?: Timestamp;
}
