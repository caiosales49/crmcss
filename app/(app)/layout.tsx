"use client";

import { AppShell } from "@/components/layout/appShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useRequireAuth();

  if (loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Preparando sua sessão...
      </div>
    );
  }

  return (
    <AppShell>
      {loading && (
        <div className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Atualizando sessão em segundo plano...
        </div>
      )}
      {children}
    </AppShell>
  );
}
