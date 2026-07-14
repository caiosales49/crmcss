"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "@/firebase/client";
import type {
  ManagedAccountSummary,
  PlatformAccount,
  PlatformMessage,
  PlatformMessageDisplayType
} from "@/types/platform";
import type { Store, StoreMember } from "@/types/store";

export const PLATFORM_ADMIN_EMAIL = "caiosales49@gmail.com";

function assertDb() {
  if (!db) throw new Error("Firebase não configurado.");
  return db;
}

export function normalizePlatformEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

export function isPlatformAdminEmail(email?: string | null) {
  return normalizePlatformEmail(email) === PLATFORM_ADMIN_EMAIL;
}

function timestampMillis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

function accountFromStore(store: Store): PlatformAccount {
  const accountId = store.accountId ?? store.companyId;
  return {
    id: accountId,
    ownerId: store.ownerId,
    ownerEmail: normalizePlatformEmail(store.ownerEmail),
    ownerName: store.name || store.nome || store.ownerEmail || "Cliente",
    status: "active",
    suspensionReason: null,
    suspendedAt: null,
    suspendedBy: null,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt
  };
}

export const PlatformService = {
  async ensureAccountForStore(input: {
    accountId: string;
    ownerId: string;
    ownerEmail: string;
    ownerName?: string | null;
  }) {
    const firestore = assertDb();
    const accountRef = doc(firestore, "platformAccounts", input.accountId);
    const snapshot = await getDoc(accountRef);
    const current = snapshot.exists() ? snapshot.data() : {};
    await setDoc(accountRef, {
      ownerId: input.ownerId,
      ownerEmail: normalizePlatformEmail(input.ownerEmail),
      ownerName: input.ownerName || current.ownerName || input.ownerEmail || "Cliente",
      status: current.status ?? "active",
      suspensionReason: current.suspensionReason ?? null,
      suspendedAt: current.suspendedAt ?? null,
      suspendedBy: current.suspendedBy ?? null,
      createdAt: current.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async getAccount(accountId: string) {
    const firestore = assertDb();
    const snapshot = await getDoc(doc(firestore, "platformAccounts", accountId));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as PlatformAccount) : null;
  },

  async getActiveMessage(accountId: string) {
    const firestore = assertDb();
    const snapshot = await getDocs(
      query(
        collection(firestore, "platformMessages"),
        where("accountId", "==", accountId),
        where("status", "==", "active")
      )
    );
    const messages = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PlatformMessage);
    return messages.sort((a, b) => timestampMillis(b.updatedAt) - timestampMillis(a.updatedAt))[0] ?? null;
  },

  async listManagedAccounts() {
    const firestore = assertDb();
    const [accountsSnapshot, storesSnapshot, membersSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(collection(firestore, "platformAccounts")),
      getDocs(collection(firestore, "stores")),
      getDocs(collection(firestore, "storeMembers")),
      getDocs(collection(firestore, "platformMessages"))
    ]);

    const accounts = new Map<string, PlatformAccount>();
    accountsSnapshot.docs.forEach((item) => {
      accounts.set(item.id, { id: item.id, ...item.data() } as PlatformAccount);
    });

    const stores = storesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Store);
    stores.forEach((store) => {
      const accountId = store.accountId ?? store.companyId;
      if (!accounts.has(accountId)) accounts.set(accountId, accountFromStore(store));
    });

    const messagesByAccount = new Map<string, PlatformMessage>();
    messagesSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as PlatformMessage)
      .sort((a, b) => timestampMillis(b.updatedAt) - timestampMillis(a.updatedAt))
      .forEach((message) => {
        if (!messagesByAccount.has(message.accountId)) messagesByAccount.set(message.accountId, message);
      });

    const members = membersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StoreMember);

    return Array.from(accounts.values())
      .map((account) => {
        const accountStores = stores.filter((store) => (store.accountId ?? store.companyId) === account.id);
        const storeIds = new Set(accountStores.map((store) => store.id));
        return {
          account,
          stores: accountStores,
          members: members.filter((member) => member.accountId === account.id || storeIds.has(member.storeId)),
          message: messagesByAccount.get(account.id) ?? null
        } satisfies ManagedAccountSummary;
      })
      .sort((a, b) => timestampMillis(b.account.createdAt) - timestampMillis(a.account.createdAt));
  },

  async saveMessage(input: {
    accountId: string;
    messageId?: string;
    message: string;
    displayType: PlatformMessageDisplayType;
    active: boolean;
    adminEmail: string;
  }) {
    const firestore = assertDb();
    const messageRef = input.messageId
      ? doc(firestore, "platformMessages", input.messageId)
      : doc(collection(firestore, "platformMessages"));
    const current = input.messageId ? await getDoc(messageRef) : null;
    await setDoc(messageRef, {
      accountId: input.accountId,
      message: input.message.trim(),
      displayType: input.displayType,
      status: input.active ? "active" : "inactive",
      createdBy: normalizePlatformEmail(input.adminEmail),
      createdAt: current?.exists() ? current.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return messageRef.id;
  },

  async setMessageStatus(messageId: string, active: boolean) {
    const firestore = assertDb();
    await updateDoc(doc(firestore, "platformMessages", messageId), {
      status: active ? "active" : "inactive",
      updatedAt: serverTimestamp()
    });
  },

  async setAccountStatus(input: {
    accountId: string;
    status: "active" | "suspended";
    adminEmail: string;
    reason?: string | null;
  }) {
    const firestore = assertDb();
    const batch = writeBatch(firestore);
    const accountRef = doc(firestore, "platformAccounts", input.accountId);
    batch.set(accountRef, {
      status: input.status,
      suspensionReason: input.status === "suspended" ? input.reason ?? "Suspensão administrativa" : null,
      suspendedAt: input.status === "suspended" ? serverTimestamp() : null,
      suspendedBy: input.status === "suspended" ? normalizePlatformEmail(input.adminEmail) : null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const [storesByAccountSnapshot, storesByCompanySnapshot, membersByAccountSnapshot, membersByCompanySnapshot] = await Promise.all([
      getDocs(query(collection(firestore, "stores"), where("accountId", "==", input.accountId))),
      getDocs(query(collection(firestore, "stores"), where("companyId", "==", input.accountId))),
      getDocs(query(collection(firestore, "storeMembers"), where("accountId", "==", input.accountId))),
      getDocs(query(collection(firestore, "storeMembers"), where("companyId", "==", input.accountId)))
    ]);
    const storeDocs = new Map([...storesByAccountSnapshot.docs, ...storesByCompanySnapshot.docs].map((item) => [item.id, item]));
    const memberDocs = new Map([...membersByAccountSnapshot.docs, ...membersByCompanySnapshot.docs].map((item) => [item.id, item]));
    storeDocs.forEach((item) => {
      batch.set(item.ref, { accountId: input.accountId, accountStatus: input.status, updatedAt: serverTimestamp() }, { merge: true });
    });
    memberDocs.forEach((item) => {
      batch.set(item.ref, { accountId: input.accountId, accountStatus: input.status, updatedAt: serverTimestamp() }, { merge: true });
    });

    await batch.commit();
  }
};
