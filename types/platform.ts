import type { Timestamp } from "firebase/firestore";
import type { Store, StoreMember } from "@/types/store";

export type PlatformAccountStatus = "active" | "suspended";
export type PlatformMessageDisplayType = "login" | "navigation";
export type PlatformMessageStatus = "active" | "inactive";

export interface PlatformAccount {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  status: PlatformAccountStatus;
  suspensionReason: string | null;
  suspendedAt: Timestamp | null;
  suspendedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlatformMessage {
  id: string;
  accountId: string;
  message: string;
  displayType: PlatformMessageDisplayType;
  status: PlatformMessageStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ManagedAccountSummary {
  account: PlatformAccount;
  stores: Store[];
  members: StoreMember[];
  message: PlatformMessage | null;
}
