import type { Timestamp } from "firebase/firestore";
import type { TenantEntity } from "@/types/common";

export type FinancialTransactionType = "revenue" | "expense";
export type FinancialTransactionStatus = "open" | "paid" | "overdue" | "canceled";
export type FinancialTransactionPeriodicity = "weekly" | "monthly" | "annual" | "one_time" | "custom";

export interface FinancialTransaction extends TenantEntity {
  type: FinancialTransactionType;
  category: string;
  costCenter?: string;
  description?: string;
  amount: number;
  dueAt: Timestamp;
  paidAt?: Timestamp;
  recurring: boolean;
  periodicity?: FinancialTransactionPeriodicity;
  status: FinancialTransactionStatus;
  active?: boolean;
  saleId?: string;
}

export type FinancePeriod = "today" | "week" | "month" | "previous_month" | "year" | "custom";

export interface FinancePeriodRange {
  startDate: Date;
  endDate: Date;
}

export interface CashFlowPoint {
  label: string;
  revenue: number;
  expense: number;
  balance: number;
}
