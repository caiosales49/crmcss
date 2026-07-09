"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { formatCurrency } from "@/lib/format";
import { FinanceService } from "@/services/financeService";
import { financeSchema, type FinanceFormValues } from "@/validators/financeSchema";

const defaultValues: FinanceFormValues = {
  type: "expense",
  category: "",
  costCenter: "",
  description: "",
  amount: 0,
  dueAt: new Date(),
  recurring: false,
  status: "open"
};

export function FinanceView() {
  const { companyId, user } = useAuth();
  const client = useQueryClient();
  const form = useForm<FinanceFormValues>({ resolver: zodResolver(financeSchema), defaultValues });
  const transactions = useQuery({
    queryKey: ["finance", companyId],
    queryFn: () => FinanceService.list(companyId ?? ""),
    enabled: Boolean(companyId)
  });

  const create = useMutation({
    mutationFn: (values: FinanceFormValues) => {
      if (!companyId || !user) throw new Error("Sessão inválida.");
      return FinanceService.create({
        companyId,
        createdBy: user.uid,
        updatedBy: user.uid,
        type: values.type,
        category: values.category,
        costCenter: values.costCenter,
        description: values.description,
        amount: values.amount,
        dueAt: Timestamp.fromDate(values.dueAt),
        paidAt: values.paidAt ? Timestamp.fromDate(values.paidAt) : undefined,
        recurring: values.recurring,
        status: values.status
      });
    },
    onSuccess: async () => {
      form.reset(defaultValues);
      await client.invalidateQueries({ queryKey: ["finance"] });
    }
  });

  const revenue = (transactions.data ?? [])
    .filter((item) => item.type === "revenue")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = (transactions.data ?? [])
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <PageHeader title="Financeiro" description="Receitas, despesas, contas, recorrência e fluxo de caixa.">
        <Button form="finance-form" disabled={create.isPending}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </PageHeader>
      <section className="mb-4 grid min-w-0 gap-4 sm:grid-cols-3">
        <Card className="min-w-0"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Receitas</p><p className="mt-1 truncate text-2xl font-semibold">{formatCurrency(revenue)}</p></CardContent></Card>
        <Card className="min-w-0"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Despesas</p><p className="mt-1 truncate text-2xl font-semibold">{formatCurrency(expenses)}</p></CardContent></Card>
        <Card className="min-w-0"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Saldo</p><p className="mt-1 truncate text-2xl font-semibold">{formatCurrency(revenue - expenses)}</p></CardContent></Card>
      </section>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Lançamento</CardTitle></CardHeader>
          <CardContent>
            <form id="finance-form" className="grid gap-3" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
              <Select {...form.register("type")}><option value="revenue">Receita</option><option value="expense">Despesa</option></Select>
              <Input placeholder="Categoria" {...form.register("category")} />
              <Input placeholder="Centro de custo" {...form.register("costCenter")} />
              <Input placeholder="Descrição" {...form.register("description")} />
              <Input type="number" step="0.01" placeholder="Valor" {...form.register("amount")} />
              <Input type="date" {...form.register("dueAt")} />
              <Select {...form.register("status")}><option value="open">Aberto</option><option value="paid">Pago</option><option value="overdue">Atrasado</option><option value="canceled">Cancelado</option></Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("recurring")} /> Recorrente</label>
            </form>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Fluxo de caixa</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {(transactions.data ?? []).map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.description}</p>
                      <p className="mt-1 truncate text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge tone={item.type === "revenue" ? "success" : "danger"}>{item.type}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-medium">{formatCurrency(item.amount)}</p>
                    <Badge>{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2">Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
              <tbody>
                {(transactions.data ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3 font-medium">{item.description}</td>
                    <td>{item.category}</td>
                    <td><Badge tone={item.type === "revenue" ? "success" : "danger"}>{item.type}</Badge></td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td><Badge>{item.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
