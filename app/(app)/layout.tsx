"use client";

import { AppShell } from "@/components/layout/appShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando ambiente seguro...
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
