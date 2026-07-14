"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear, subMonths } from "date-fns";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currencyInput";
import { formatCurrency, formatStatus, formatTransactionType } from "@/lib/format";
import { FinanceService } from "@/services/financeService";
import { financeSchema, type FinanceFormValues } from "@/validators/financeSchema";
import type { FinancePeriod, FinancePeriodRange, FinancialTransaction } from "@/types/finance";
import type { Sale } from "@/types/sale";

const defaultValues: FinanceFormValues = {
  type: "expense",
  category: "",
  costCenter: "",
  description: "",
  amount: 0,
  dueAt: new Date(),
  recurring: false,
  periodicity: "one_time",
  status: "open",
  active: true
};

function periodRange(period: FinancePeriod, customStart: string, customEnd: string): FinancePeriodRange {
  const now = new Date();
  if (period === "today") return { startDate: startOfDay(now), endDate: endOfDay(now) };
  if (period === "week") return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
  if (period === "previous_month") {
    const previous = subMonths(now, 1);
    return { startDate: startOfMonth(previous), endDate: endOfMonth(previous) };
  }
  if (period === "year") return { startDate: startOfYear(now), endDate: endOfYear(now) };
  if (period === "custom" && customStart && customEnd) {
    return { startDate: startOfDay(new Date(`${customStart}T00:00:00`)), endDate: endOfDay(new Date(`${customEnd}T00:00:00`)) };
  }
  return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
}

export function FinanceView() {
  const { companyId, user } = useAuth();
  const { activeStore, activeStoreId } = useStore();
  const client = useQueryClient();
  const [period, setPeriod] = useState<FinancePeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const form = useForm<FinanceFormValues>({ resolver: zodResolver(financeSchema), defaultValues });
  const amountValue = form.watch("amount");
  const range = useMemo(() => periodRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const transactions = useQuery({
    queryKey: ["finance", activeStoreId, period, customStart, customEnd],
    queryFn: () => Promise.all([
      FinanceService.listInPeriod(activeStoreId ?? "", range),
      FinanceService.listSalesInPeriod(activeStoreId ?? "", range)
    ]),
    enabled: Boolean(activeStoreId),
    staleTime: 30_000
  });

  const create = useMutation({
    mutationFn: (values: FinanceFormValues) => {
      const transactionCompanyId = companyId ?? activeStore?.companyId;
      if (!transactionCompanyId || !activeStoreId || !user) throw new Error("Sessão inválida. Aguarde a loja carregar e tente novamente.");
      return FinanceService.create({
        companyId: transactionCompanyId,
        storeId: activeStoreId,
        createdBy: user.uid,
        updatedBy: user.uid,
        type: values.type,
        category: values.category,
        ...(values.description?.trim() ? { description: values.description.trim() } : {}),
        amount: values.amount,
        dueAt: Timestamp.fromDate(values.dueAt),
        ...(values.paidAt ? { paidAt: Timestamp.fromDate(values.paidAt) } : {}),
        recurring: values.recurring,
        periodicity: values.periodicity,
        status: values.status,
        active: values.active
      });
    },
    onSuccess: async () => {
      form.reset(defaultValues);
      setEditing(null);
      await client.invalidateQueries({ queryKey: ["finance"] });
    }
  });

  const update = useMutation({
    mutationFn: (values: FinanceFormValues) => {
      if (!editing) throw new Error("Lançamento não selecionado.");
      return FinanceService.update(editing.id, {
        type: values.type,
        category: values.category,
        costCenter: "",
        description: values.description?.trim() ?? "",
        amount: values.amount,
        dueAt: Timestamp.fromDate(values.dueAt),
        ...(values.paidAt ? { paidAt: Timestamp.fromDate(values.paidAt) } : {}),
        recurring: values.recurring,
        periodicity: values.periodicity,
        status: values.status,
        active: values.active
      });
    },
    onSuccess: async () => {
      form.reset(defaultValues);
      setEditing(null);
      await client.invalidateQueries({ queryKey: ["finance"] });
    }
  });

  const remove = useMutation({
    mutationFn: (item: FinancialTransaction) => FinanceService.update(item.id, { active: false, status: "canceled" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["finance"] })
  });

  const [financeTransactions, paidSales] = transactions.data ?? ([[], []] as [FinancialTransaction[], Sale[]]);
  const expenses = financeTransactions.filter((item) => item.type === "expense");
  const revenue = paidSales.reduce((sum, sale) => sum + safeNumber(sale.total), 0);
  const cost = paidSales.reduce((sum, sale) => sum + sale.items.reduce((total, item) => total + safeNumber(item.costPrice) * safeNumber(item.quantity), 0), 0);
  const grossProfit = revenue - cost;
  const fixedExpenses = expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const paidExpenses = expenses.filter((item) => item.status === "paid").reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const pendingExpenses = expenses.filter((item) => item.status === "open" || item.status === "overdue").reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const netProfit = grossProfit - fixedExpenses;
  const details = aggregateProducts(paidSales);
  const missingCosts = paidSales.some((sale) => sale.items.some((item) => !Number.isFinite(item.costPrice)));

  function editTransaction(item: FinancialTransaction) {
    setEditing(item);
    form.reset({
      type: item.type,
      category: item.category,
      costCenter: item.costCenter ?? "",
      description: item.description,
      amount: item.amount,
      dueAt: item.dueAt.toDate(),
      paidAt: item.paidAt?.toDate(),
      recurring: item.recurring,
      periodicity: item.periodicity ?? "one_time",
      status: item.status,
      active: item.active !== false
    });
  }

  function submit(values: FinanceFormValues) {
    if (editing) update.mutate(values);
    else create.mutate(values);
  }

  return (
    <>
      <PageHeader title="Financeiro" description="Visão de vendas, custos, despesas e resultado do período." />
      <section className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
          <Select value={period} onChange={(event) => setPeriod(event.target.value as FinancePeriod)} aria-label="Período financeiro">
            <option value="today">Hoje</option><option value="week">Esta semana</option><option value="month">Este mês</option><option value="previous_month">Mês anterior</option><option value="year">Este ano</option><option value="custom">Personalizado</option>
          </Select>
          {period === "custom" && <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-label="Data inicial" />}
          {period === "custom" && <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} aria-label="Data final" />}
        </div>
      </section>
      <section className="mb-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Faturamento bruto" value={revenue} />
        <Metric label="Custo dos produtos" value={cost} />
        <Metric label="Lucro bruto" value={grossProfit} tone={grossProfit >= 0 ? "success" : "danger"} />
        <Metric label="Despesas fixas" value={fixedExpenses} />
        <Metric label="Lucro líquido estimado" value={netProfit} tone={netProfit >= 0 ? "success" : "danger"} />
        <Metric label="Despesas pagas" value={paidExpenses} />
        <Metric label="Despesas pendentes" value={pendingExpenses} />
        <Metric label="Quantidade de vendas" value={paidSales.length} isCurrency={false} />
        <Metric label="Ticket médio" value={paidSales.length ? revenue / paidSales.length : 0} />
        <Metric label="Margem de lucro" value={revenue ? (grossProfit / revenue) * 100 : 0} isCurrency={false} suffix="%" />
      </section>
      {missingCosts && <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-amber-800 dark:text-amber-200">Há vendas antigas com custo não informado. O lucro dessas vendas pode estar subestimado; novas vendas preservam o custo no momento da venda.</div>}
      <section className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card><CardHeader><CardTitle>Resumo do período</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Summary label="Faturamento" value={revenue} /><Summary label="Custos" value={cost} /><Summary label="Resultado" value={netProfit} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Despesas por categoria</CardTitle></CardHeader><CardContent className="space-y-2">{categoryTotals(expenses).map(([category, amount]) => <div key={category} className="flex justify-between gap-3 text-sm"><span>{category}</span><strong>{formatCurrency(amount)}</strong></div>)}{expenses.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>}</CardContent></Card>
      </section>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
            <CardHeader><CardTitle>{editing ? "Editar despesa" : "Nova despesa"}</CardTitle></CardHeader>
          <CardContent>
            <form id="finance-form" className="grid gap-3" onSubmit={form.handleSubmit(submit)}>
              <Select {...form.register("type")}><option value="expense">Despesa</option><option value="revenue">Receita manual</option></Select>
              <Input placeholder="Categoria" {...form.register("category")} />
              {form.formState.errors.category && <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>}
              <Input placeholder="Descrição opcional" {...form.register("description")} />
              <Input
                inputMode="numeric"
                placeholder="Valor"
                value={formatCurrencyInput(amountValue)}
                onChange={(event) => {
                  form.setValue("amount", parseCurrencyInput(event.target.value), {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                }}
              />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
              <Input type="date" {...form.register("dueAt")} />
              <Select {...form.register("periodicity")}><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="annual">Anual</option><option value="one_time">Única</option><option value="custom">Personalizada</option></Select>
              <Select {...form.register("status")}><option value="open">Aberto</option><option value="paid">Pago</option><option value="overdue">Atrasado</option><option value="canceled">Cancelado</option></Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("recurring")} /> Recorrente</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("active")} /> Ativa</label>
              <Button disabled={create.isPending || update.isPending}>
                <Plus className="h-4 w-4" />
                {editing ? "Salvar despesa" : "Novo lançamento"}
              </Button>
              {(create.isError || update.isError) && (
                <p className="text-sm text-destructive">
                  {(create.error ?? update.error) instanceof Error
                    ? (create.error ?? update.error)?.message
                    : "Não foi possível salvar a despesa."}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Despesas e lançamentos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {financeTransactions.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.description}</p>
                      <p className="mt-1 truncate text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge tone={item.type === "revenue" ? "success" : "danger"}>{formatTransactionType(item.type)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-medium">{formatCurrency(item.amount)}</p>
                    <div className="flex items-center gap-1"><Badge>{formatStatus(item.status)}</Badge><Button variant="ghost" aria-label="Editar lançamento" onClick={() => editTransaction(item)}><Pencil className="h-4 w-4" /></Button></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2">Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                {financeTransactions.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3 font-medium">{item.description}</td>
                    <td>{item.category}</td>
                    <td><Badge tone={item.type === "revenue" ? "success" : "danger"}>{formatTransactionType(item.type)}</Badge></td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td><div className="flex items-center gap-1"><Badge>{formatStatus(item.status)}</Badge><Button variant="ghost" aria-label="Editar lançamento" onClick={() => editTransaction(item)}><Pencil className="h-4 w-4" /></Button>{item.status !== "paid" && <Button variant="ghost" aria-label="Marcar como pago" onClick={() => FinanceService.update(item.id, { status: "paid", paidAt: Timestamp.now() }).then(() => client.invalidateQueries({ queryKey: ["finance"] }))}><Check className="h-4 w-4" /></Button>}<Button variant="ghost" aria-label="Desativar lançamento" onClick={() => { if (window.confirm("Desativar este lançamento?")) remove.mutate(item); }}><Trash2 className="h-4 w-4" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </section>
      {transactions.isError && <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">Não foi possível carregar os dados financeiros deste período.</div>}
      {transactions.isLoading && <div className="mt-4 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">Carregando dados financeiros...</div>}
      <section className="mt-4">
        <Card><CardHeader><CardTitle>Detalhamento por produto</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="py-2">Produto</th><th>Qtd.</th><th>Venda unit.</th><th>Total vendido</th><th>Custo unit.</th><th>Custo total</th><th>Lucro</th><th>Margem</th></tr></thead><tbody>{details.map((item) => <tr key={item.productId} className="border-t border-border"><td className="py-3 font-medium">{item.name}</td><td>{item.quantity}</td><td>{formatCurrency(item.total / item.quantity)}</td><td>{formatCurrency(item.total)}</td><td>{formatCurrency(item.cost / item.quantity)}</td><td>{formatCurrency(item.cost)}</td><td className={item.profit < 0 ? "text-destructive" : "text-success"}>{formatCurrency(item.profit)}</td><td>{item.total ? `${((item.profit / item.total) * 100).toFixed(1)}%` : "0.0%"}</td></tr>)}</tbody></table></div>{details.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda concluída no período.</p>}</CardContent></Card>
      </section>
    </>
  );
}

function safeNumber(value: unknown) {
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function aggregateProducts(sales: Sale[]) {
  const map = new Map<string, { productId: string; name: string; quantity: number; total: number; cost: number; profit: number }>();
  for (const sale of sales) for (const item of sale.items) {
    const current = map.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, total: 0, cost: 0, profit: 0 };
    const total = safeNumber(item.total);
    const cost = safeNumber(item.costPrice) * safeNumber(item.quantity);
    map.set(item.productId, { ...current, quantity: current.quantity + safeNumber(item.quantity), total: current.total + total, cost: current.cost + cost, profit: current.profit + total - cost });
  }
  return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
}

function categoryTotals(items: FinancialTransaction[]) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.category, (totals.get(item.category) ?? 0) + safeNumber(item.amount));
  return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
}

function Metric({ label, value, tone, isCurrency = true, suffix = "" }: { label: string; value: number; tone?: "success" | "danger"; isCurrency?: boolean; suffix?: string }) {
  return <Card className="min-w-0"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-1 truncate text-xl font-semibold ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""}`}>{isCurrency ? formatCurrency(value) : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`}</p></CardContent></Card>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{formatCurrency(value)}</p></div>;
}
