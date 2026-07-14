"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useAuth } from "@/contexts/authProvider";
import { PlatformService } from "@/services/platformService";
import { StoreService } from "@/services/storeService";
import type { PlatformAccount, PlatformMessage } from "@/types/platform";
import type { Store } from "@/types/store";

const activeStoreKey = "crm.activeStoreId";
const storeScopedQueryKeys = [
  "dashboard",
  "products",
  "pos-products",
  "customers",
  "finance",
  "inventoryMovements",
  "reports"
];

interface StoreContextValue {
  stores: Store[];
  activeStore: Store | null;
  activeStoreId?: string;
  loading: boolean;
  needsFirstStore: boolean;
  platformAccount: PlatformAccount | null;
  platformMessage: PlatformMessage | null;
  canManageStores: boolean;
  setActiveStoreId: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  createOwnedStore: (input: { name: string; document?: string }) => Promise<string>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function readLastStoreId(userId?: string) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return window.localStorage.getItem(`${activeStoreKey}.${userId}`);
  } catch {
    return null;
  }
}

function writeLastStoreId(userId: string | undefined, storeId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(`${activeStoreKey}.${userId}`, storeId);
  } catch {
    // The user can still use the selected store this session.
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsFirstStore, setNeedsFirstStore] = useState(false);
  const [platformAccount, setPlatformAccount] = useState<PlatformAccount | null>(null);
  const [platformMessage, setPlatformMessage] = useState<PlatformMessage | null>(null);

  const resolveStores = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setStores([]);
      setSelectedStoreId(null);
      setNeedsFirstStore(false);
      setPlatformAccount(null);
      setPlatformMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userStores = await StoreService.findUserStores(user);
      if (userStores.length > 0) {
        const lastLocalStoreId = readLastStoreId(user.uid);
        const lastLocalStore = userStores.find((store) => store.id === lastLocalStoreId);
        const selected = lastLocalStore ?? await StoreService.selectLastOrFirstStore(user.uid, userStores);
        setStores(userStores);
        setSelectedStoreId(selected?.id ?? userStores[0].id);
        setNeedsFirstStore(false);
        if (selected?.id) {
          writeLastStoreId(user.uid, selected.id);
          void StoreService.updateLastActiveStore(user.uid, selected.id);
        }
        const accountId = selected?.accountId ?? selected?.companyId ?? userStores[0].accountId ?? userStores[0].companyId;
        const [account, message] = accountId
          ? await Promise.all([
            PlatformService.getAccount(accountId).catch(() => null),
            PlatformService.getActiveMessage(accountId).catch(() => null)
          ])
          : [null, null];
        setPlatformAccount(account);
        setPlatformMessage(message);
        return;
      }

      setStores([]);
      setSelectedStoreId(null);
      setNeedsFirstStore(true);
      setPlatformAccount(null);
      setPlatformMessage(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    void resolveStores();
  }, [resolveStores]);

  const activeStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null;

  useEffect(() => {
    if (user && activeStore?.id) writeLastStoreId(user.uid, activeStore.id);
  }, [activeStore?.id, user]);

  const changeStore = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);
    if (user) void StoreService.updateLastActiveStore(user.uid, storeId);
    const nextStore = stores.find((store) => store.id === storeId);
    const accountId = nextStore?.accountId ?? nextStore?.companyId;
    if (accountId) {
      void Promise.all([
        PlatformService.getAccount(accountId).catch(() => null),
        PlatformService.getActiveMessage(accountId).catch(() => null)
      ]).then(([account, message]) => {
        setPlatformAccount(account);
        setPlatformMessage(message);
      });
    }
    for (const queryKey of storeScopedQueryKeys) {
      void queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  }, [queryClient, stores, user]);

  const createOwnedStore = useCallback(async (input: { name: string; document?: string }) => {
    if (!user) throw new Error("Sessão inválida.");
    const storeId = await StoreService.createStore({
      ownerId: user.uid,
      ownerEmail: user.email ?? "",
      companyId: user.uid,
      name: input.name,
      document: input.document
    });
    const store = await StoreService.get(storeId);
    if (store) {
      setStores((current) => [...current.filter((item) => item.id !== store.id), store]);
      setSelectedStoreId(store.id);
      setNeedsFirstStore(false);
      writeLastStoreId(user.uid, store.id);
      await StoreService.updateLastActiveStore(user.uid, store.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accessibleStores"] }),
        ...storeScopedQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }))
      ]);
    }
    return storeId;
  }, [queryClient, user]);

  const value = useMemo<StoreContextValue>(() => ({
    stores,
    activeStore,
    activeStoreId: activeStore?.id,
    loading: authLoading || loading,
    needsFirstStore,
    platformAccount,
    platformMessage,
    canManageStores: activeStore?.ownerId === user?.uid || stores.some((store) => store.ownerId === user?.uid),
    setActiveStoreId: changeStore,
    refreshStores: resolveStores,
    createOwnedStore
  }), [activeStore, authLoading, changeStore, createOwnedStore, loading, needsFirstStore, platformAccount, platformMessage, resolveStores, stores, user?.uid]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore deve ser usado dentro de StoreProvider.");
  return context;
}
