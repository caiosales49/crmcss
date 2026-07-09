import type { Timestamp } from "firebase/firestore";

export type EntityStatus = "active" | "inactive" | "archived";
export type CurrencyCode = "BRL" | "USD" | "EUR";
export type ThemePreference = "light" | "dark" | "system";

export interface TenantEntity {
  id: string;
  companyId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy?: string;
}

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface MoneyRange {
  min?: number;
  max?: number;
}

export interface PaginationInput {
  pageSize: number;
  cursor?: string;
}

export interface PagedResult<T> {
  data: T[];
  nextCursor?: string;
}
