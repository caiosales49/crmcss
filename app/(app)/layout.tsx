"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/appShell";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useStore } from "@/contexts/storeProvider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, logout, profile, user } = useRequireAuth();
  const store = useStore();
  const [hasUnlockedApp, setHasUnlockedApp] = useState(false);
  const isCreateStorePage = pathname === "/create-store";
  const canCreateFirstStore = Boolean(user);
  const isSuspended = store.activeStore?.accountStatus === "suspended" || store.platformAccount?.status === "suspended";

  useEffect(() => {
    // A loja pode continuar carregando em conexoes moveis; isso nao deve
    // bloquear a interface inteira depois que a sessao ja foi validada.
    if (!loading && user) {
      setHasUnlockedApp(true);
    }
  }, [loading, user]);

  useEffect(() => {
    if (loading || store.loading || !user) return;
    if (isSuspended) {
      router.replace("/conta-suspensa");
      return;
    }
    if (store.needsFirstStore && canCreateFirstStore && !isCreateStorePage) {
      router.replace("/create-store");
      return;
    }
    if (!store.needsFirstStore && store.activeStoreId && isCreateStorePage) {
      router.replace("/dashboard");
    }
  }, [canCreateFirstStore, isCreateStorePage, isSuspended, loading, router, store.activeStoreId, store.loading, store.needsFirstStore, user]);

  if ((loading || !user) && !hasUnlockedApp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && profile && store.needsFirstStore && canCreateFirstStore && isCreateStorePage) {
    return <>{children}</>;
  }

  if (user && profile && store.needsFirstStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-md border border-border bg-card p-6 text-center shadow-soft">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Nenhuma loja liberada</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este e-mail ainda não possui uma loja ativa. Peça para o proprietário liberar o acesso em Configurações, Usuários e permissões.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {children}
      {loading && <SessionRefreshIndicator />}
      <PlatformMessageModal />
    </AppShell>
  );
}

function SessionRefreshIndicator() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-end bg-background/10 p-4 backdrop-blur-[1px]">
      <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 shadow-soft">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  );
}

function PlatformMessageModal() {
  const pathname = usePathname();
  const { activeStoreId, platformMessage } = useStore();
  const [open, setOpen] = useState(false);
  const [lastSignal, setLastSignal] = useState("");

  useEffect(() => {
    if (!platformMessage || platformMessage.status !== "active") {
      setOpen(false);
      return;
    }
    const signal = platformMessage.displayType === "navigation"
      ? `${platformMessage.id}:${activeStoreId ?? ""}:${pathname}`
      : `${platformMessage.id}:${activeStoreId ?? ""}`;
    if (signal !== lastSignal) {
      setLastSignal(signal);
      setOpen(true);
    }
  }, [activeStoreId, lastSignal, pathname, platformMessage]);

  if (!open || !platformMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-foreground">Aviso da plataforma</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {platformMessage.message}
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setOpen(false)}>Entendi</Button>
        </div>
      </div>
    </div>
  );
}
