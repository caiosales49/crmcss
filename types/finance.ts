import type { Timestamp } from "firebase/firestore";
import type { TenantEntity } from "@/types/common";

export type FinancialTransactionType = "revenue" | "expense";
export type FinancialTransactionStatus = "open" | "paid" | "overdue" | "canceled";

export interface FinancialTransaction extends TenantEntity {
  type: FinancialTransactionType;
  category: string;
  costCenter?: string;
  description: string;
  amount: number;
  dueAt: Timestamp;
  paidAt?: Timestamp;
  recurring: boolean;
  status: FinancialTransactionStatus;
  saleId?: string;
}

export interface CashFlowPoint {
  label: string;
  revenue: number;
  expense: number;
  balance: number;
}
