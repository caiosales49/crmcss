"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileBarChart,
  Home,
  LogOut,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/authProvider";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/inventory", label: "Estoque", icon: Boxes },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/sales", label: "PDV", icon: ShoppingCart },
  { href: "/finance", label: "Financeiro", icon: CreditCard },
  { href: "/reports", label: "Relatórios", icon: FileBarChart },
  { href: "/settings", label: "Configurações", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card px-3 py-4 lg:block">
        <Link href="/dashboard" className="flex h-12 items-center gap-3 rounded-md px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">CRM SaaS</p>
            <p className="text-xs text-muted-foreground">Gestão comercial</p>
          </div>
        </Link>

        <nav className="mt-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar produtos, clientes, vendas, códigos..."
                aria-label="Pesquisa global"
              />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile?.displayName ?? "Usuário"}</p>
              <p className="text-xs text-muted-foreground">{profile?.role ?? "owner"}</p>
            </div>
            <Button variant="ghost" aria-label="Sair" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-20 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground",
                    active && "bg-muted text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
