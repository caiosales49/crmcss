"use client";

import { AuthProvider } from "@/contexts/authProvider";
import { QueryProvider } from "@/contexts/queryProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
