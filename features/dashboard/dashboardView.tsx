"use client";

import { useQuery } from "@tanstack/react-query";
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { AlertTriangle, Banknote, Boxes, PackageCheck, Receipt, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { cn } from "@/lib/cn";
import { formatCurrency, numberFormatter } from "@/lib/format";
import { DashboardService } from "@/services/dashboardService";

const metricIcons = [Banknote, TrendingUp, Receipt, Boxes, AlertTriangle, PackageCheck];
type PeriodPreset = "today" | "last7" | "last30" | "thisMonth" | "custom";

function formatDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseDateInput(value: string, fallback: Date) {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day);
}

function getPresetRange(preset: Exclude<PeriodPreset, "custom">) {
  const now = new Date();
  if (preset === "last7") {
    return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
  }
  if (preset === "last30") {
    return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
  }
  if (preset === "thisMonth") {
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
  return { startDate: startOfDay(now), endDate: endOfDay(now) };
}

export function DashboardView() {
  const { companyId } = useAuth();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const todayRange = useMemo(() => getPresetRange("today"), []);
  const [customStartDate, setCustomStartDate] = useState(formatDateInput(todayRange.startDate));
  const [customEndDate, setCustomEndDate] = useState(formatDateInput(todayRange.endDate));
  const selectedPeriod = useMemo(() => {
    if (periodPreset !== "custom") return getPresetRange(periodPreset);
    const parsedStartDate = parseDateInput(customStartDate, todayRange.startDate);
    const parsedEndDate = parseDateInput(customEndDate, todayRange.endDate);
    const firstDate = parsedStartDate <= parsedEndDate ? parsedStartDate : parsedEndDate;
    const lastDate = parsedStartDate <= parsedEndDate ? parsedEndDate : parsedStartDate;
    return { startDate: startOfDay(firstDate), endDate: endOfDay(lastDate) };
  }, [customEndDate, customStartDate, periodPreset, todayRange.endDate, todayRange.startDate]);

  const query = useQuery({
    queryKey: [
      "dashboard",
      companyId,
      selectedPeriod.startDate.toISOString(),
      selectedPeriod.endDate.toISOString()
    ],
    queryFn: () => DashboardService.getOverview(companyId ?? "", selectedPeriod),
    enabled: Boolean(companyId)
  });

  const metrics = query.data?.metrics;
  const isWaitingForData = query.isLoading;
  const formatMetric = (value: string) => (isWaitingForData ? "Carregando..." : value);
  const cards = [
    { label: "Vendido no período", value: formatMetric(formatCurrency(metrics?.soldInPeriod ?? 0)) },
    { label: "Vendas no período", value: formatMetric(numberFormatter.format(metrics?.salesCount ?? 0)) },
    { label: "Lucro no período", value: formatMetric(formatCurrency(metrics?.profit ?? 0)) },
    { label: "Despesas no período", value: formatMetric(formatCurrency(metrics?.expenses ?? 0)) },
    { label: "Itens em estoque", value: formatMetric(numberFormatter.format(metrics?.productsInStock ?? 0)) },
    { label: "Estoque baixo", value: formatMetric(numberFormatter.format(metrics?.lowStockProducts ?? 0)) }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão executiva de vendas, estoque, financeiro e alertas."
      >
        <div className="grid w-full gap-2 sm:w-auto sm:min-w-[460px] sm:grid-cols-[180px_1fr_1fr]">
          <Select value={periodPreset} onChange={(event) => setPeriodPreset(event.target.value as PeriodPreset)}>
            <option value="today">Hoje</option>
            <option value="last7">Últimos 7 dias</option>
            <option value="last30">Últimos 30 dias</option>
            <option value="thisMonth">Este mês</option>
            <option value="custom">Personalizado</option>
          </Select>
          <Input
            type="date"
            value={periodPreset === "custom" ? customStartDate : formatDateInput(selectedPeriod.startDate)}
            disabled={periodPreset !== "custom"}
            onChange={(event) => setCustomStartDate(event.target.value)}
          />
          <Input
            type="date"
            value={periodPreset === "custom" ? customEndDate : formatDateInput(selectedPeriod.endDate)}
            disabled={periodPreset !== "custom"}
            onChange={(event) => setCustomEndDate(event.target.value)}
          />
        </div>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = metricIcons[index] ?? Banknote;
          return (
            <Card
              key={card.label}
              className={cn(
                card.label === "Estoque baixo" &&
                  (metrics?.lowStockProducts ?? 0) > 0 &&
                  "border-destructive bg-destructive/5 ring-1 ring-destructive/20"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle
                  className={cn(
                    "text-sm text-muted-foreground",
                    card.label === "Estoque baixo" && (metrics?.lowStockProducts ?? 0) > 0 && "text-destructive"
                  )}
                >
                  {card.label}
                </CardTitle>
                <Icon
                  className={cn(
                    "h-4 w-4 text-primary",
                    card.label === "Estoque baixo" && (metrics?.lowStockProducts ?? 0) > 0 && "text-destructive"
                  )}
                />
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-semibold", isWaitingForData && "text-base text-muted-foreground")}>
                  {card.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo do período</CardTitle>
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
