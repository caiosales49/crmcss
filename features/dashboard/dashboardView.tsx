"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, Boxes, PackageCheck, Receipt, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/authProvider";
import { formatCurrency, numberFormatter } from "@/lib/format";
import { DashboardService } from "@/services/dashboardService";

const metricIcons = [Banknote, TrendingUp, Receipt, Boxes, AlertTriangle, PackageCheck];

export function DashboardView() {
  const { companyId } = useAuth();
  const query = useQuery({
    queryKey: ["dashboard", companyId],
    queryFn: () => DashboardService.getOverview(companyId ?? ""),
    enabled: Boolean(companyId)
  });

  const metrics = query.data?.metrics;
  const cards = [
    { label: "Vendido hoje", value: formatCurrency(metrics?.soldToday ?? 0) },
    { label: "Vendido no mês", value: formatCurrency(metrics?.soldThisMonth ?? 0) },
    { label: "Vendas no mês", value: numberFormatter.format(metrics?.salesCount ?? 0) },
    { label: "Itens em estoque", value: numberFormatter.format(metrics?.productsInStock ?? 0) },
    { label: "Estoque baixo", value: numberFormatter.format(metrics?.lowStockProducts ?? 0) },
    { label: "Lucro", value: formatCurrency(metrics?.profit ?? 0) }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão executiva de vendas, estoque, financeiro e alertas."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = metricIcons[index] ?? Banknote;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={query.data?.monthlyChart ?? []}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(query.data?.alerts ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum alerta crítico agora.</p>
            )}
            {query.data?.alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <Badge tone={alert.tone === "warning" ? "warning" : "neutral"}>{alert.tone}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(query.data?.topProducts ?? []).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-sm">{item.name}</span>
                <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimas vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(query.data?.latestSales ?? []).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-sm">{sale.code}</span>
                <span className="text-sm font-medium">{formatCurrency(sale.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
