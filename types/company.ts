import type { Timestamp } from "firebase/firestore";
import type { Address, CurrencyCode, ThemePreference } from "@/types/common";

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  logoUrl?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: Address;
  currency: CurrencyCode;
  theme: ThemePreference;
  lowStockAlertsEnabled: boolean;
  fiscalData?: {
    legalName?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  id: string;
  companyId: string;
  lastActiveStoreId?: string | null;
  displayName: string;
  email: string;
  photoURL?: string;
  role: "owner" | "manager" | "employee" | "admin" | "seller" | "viewer";
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
