"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Upload } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { CompanyService } from "@/services/companyService";
import { StorageService } from "@/services/storageService";
import { companySchema, type CompanyFormValues } from "@/validators/companySchema";

export function SettingsView() {
  const { companyId, subscription } = useAuth();
  const client = useQueryClient();
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      taxId: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      zipCode: "",
      currency: "BRL",
      theme: "system",
      lowStockAlertsEnabled: true
    }
  });

  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => CompanyService.get(companyId ?? ""),
    enabled: Boolean(companyId)
  });

  useEffect(() => {
    if (!company.data) return;
    form.reset({
      name: company.data.name,
      taxId: company.data.taxId ?? "",
      phone: company.data.phone ?? "",
      email: company.data.email ?? "",
      city: company.data.address?.city ?? "",
      state: company.data.address?.state ?? "",
      zipCode: company.data.address?.zipCode ?? "",
      currency: company.data.currency,
      theme: company.data.theme,
      lowStockAlertsEnabled: company.data.lowStockAlertsEnabled
    });
  }, [company.data, form]);

  const update = useMutation({
    mutationFn: (values: CompanyFormValues) => {
      if (!companyId) throw new Error("Empresa inválida.");
      return CompanyService.update(companyId, {
        name: values.name,
        taxId: values.taxId,
        phone: values.phone,
        email: values.email,
        currency: values.currency,
        theme: values.theme,
        lowStockAlertsEnabled: values.lowStockAlertsEnabled,
        address: {
          city: values.city,
          state: values.state,
          zipCode: values.zipCode
        }
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["company"] })
  });

  const uploadLogo = async (file?: File) => {
    if (!file || !companyId) return;
    const logoUrl = await StorageService.uploadCompanyLogo(companyId, file);
    await CompanyService.update(companyId, { logoUrl });
    await client.invalidateQueries({ queryKey: ["company"] });
  };

  return (
    <>
      <PageHeader title="Configurações" description="Empresa, logo, moeda, tema, dados fiscais e assinatura.">
        <Button form="settings-form" disabled={update.isPending}>
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </PageHeader>
      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
          <CardContent>
            <form id="settings-form" className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => update.mutate(values))}>
              <Input className="sm:col-span-2" placeholder="Nome da empresa" {...form.register("name")} />
              <Input placeholder="CNPJ" {...form.register("taxId")} />
              <Input placeholder="Telefone" {...form.register("phone")} />
              <Input placeholder="Email" {...form.register("email")} />
              <Input placeholder="Cidade" {...form.register("city")} />
              <Input placeholder="Estado" {...form.register("state")} />
              <Input placeholder="CEP" {...form.register("zipCode")} />
              <Select {...form.register("currency")}><option value="BRL">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option></Select>
              <Select {...form.register("theme")}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("lowStockAlertsEnabled")} /> Alertar estoque baixo</label>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
            <CardContent>
              {company.data?.logoUrl && <img src={company.data.logoUrl} alt="Logo da empresa" className="mb-4 h-20 rounded-md object-contain" />}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted">
                <Upload className="h-4 w-4" />
                Enviar logo
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => void uploadLogo(event.target.files?.[0])} />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Assinatura</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Plano</span><Badge>{subscription?.plan ?? "trial"}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge tone={subscription?.status === "active" || subscription?.status === "trialing" ? "success" : "danger"}>{subscription?.status ?? "trialing"}</Badge></div>
              <div className="rounded-md bg-muted p-3 text-sm">
                Usuários: {subscription?.limits.users ?? 1}<br />
                Produtos: {subscription?.limits.products ?? 500}<br />
                Vendas/mês: {subscription?.limits.monthlySales ?? 1000}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
