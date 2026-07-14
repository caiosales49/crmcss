"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/authProvider";
import { QueryProvider } from "@/contexts/queryProvider";
import { StoreProvider } from "@/contexts/storeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipStoreProvider = pathname?.startsWith("/gerencia") || pathname === "/conta-suspensa";

  return (
    <QueryProvider>
      <AuthProvider>
        {skipStoreProvider ? children : <StoreProvider>{children}</StoreProvider>}
      </AuthProvider>
    </QueryProvider>
  );
}
