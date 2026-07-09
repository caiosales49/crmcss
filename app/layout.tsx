import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "CRM SaaS",
  description: "CRM comercial multi-tenant com Firebase"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
