"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Store, Upload, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";
import { formatPlan, formatRole, formatStatus } from "@/lib/format";
import { CompanyService } from "@/services/companyService";
import { StorageService } from "@/services/storageService";
import { StoreService } from "@/services/storeService";
import type { StoreMember, StoreRole } from "@/types/store";
import { companySchema, type CompanyFormValues } from "@/validators/companySchema";

export function SettingsView() {
  const { companyId, subscription, profile } = useAuth();
  const { stores, activeStore, activeStoreId, setActiveStoreId, canManageStores } = useStore();
  const client = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StoreRole>("employee");
  const [inviteStoreIds, setInviteStoreIds] = useState<string[]>([]);
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

  const members = useQuery({
    queryKey: ["storeMembers", companyId],
    queryFn: () => StoreService.listMembers(companyId ?? ""),
    enabled: Boolean(companyId && canManageStores)
  });

  const invitations = useQuery({
    queryKey: ["storeInvitations", stores.map((store) => store.id).join(",")],
    queryFn: () => StoreService.listInvitationsByStores(stores.map((store) => store.id)),
    enabled: Boolean(canManageStores && stores.length > 0)
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
    if (!file || !companyId || !activeStoreId) return;
    const logoUrl = await StorageService.uploadCompanyLogo(companyId, activeStoreId, file);
    await CompanyService.update(companyId, { logoUrl });
    await client.invalidateQueries({ queryKey: ["company"] });
  };

  const invite = useMutation({
    mutationFn: async () => {
      const fallbackCompanyId = companyId ?? activeStore?.companyId;
      if (!fallbackCompanyId) throw new Error("Empresa inválida.");
      const storeIds = inviteStoreIds.length > 0 ? inviteStoreIds : stores.map((store) => store.id);
      if (storeIds.length === 0) throw new Error("Crie uma loja antes de convidar usuários.");
      await StoreService.upsertMember({
        companyId: fallbackCompanyId,
        email: inviteEmail,
        role: inviteRole,
        storeIds,
        invitedBy: profile?.id
      });
    },
    onSuccess: async () => {
      setInviteEmail("");
      setInviteRole("employee");
      setInviteStoreIds([]);
      await client.invalidateQueries({ queryKey: ["storeMembers"] });
      await client.invalidateQueries({ queryKey: ["storeInvitations"] });
    }
  });

  async function renameStore(storeId: string, currentName: string) {
    const nome = window.prompt("Novo nome da loja", currentName);
    if (!nome?.trim()) return;
    await StoreService.updateStore(storeId, { name: nome.trim() });
    await client.invalidateQueries({ queryKey: ["accessibleStores"] });
  }

  async function archiveStore(storeId: string) {
    if (stores.length <= 1) {
      window.alert("Mantenha pelo menos uma loja ativa.");
      return;
    }
    const confirmed = window.confirm("Arquivar esta loja? Os dados deixam de aparecer para os usuários.");
    if (!confirmed) return;
    await StoreService.deleteStore(storeId);
    if (activeStoreId === storeId) {
      const nextStore = stores.find((store) => store.id !== storeId);
      if (nextStore) setActiveStoreId(nextStore.id);
    }
    await client.invalidateQueries({ queryKey: ["accessibleStores"] });
  }

  async function updateMember(member: StoreMember, input: Partial<Pick<StoreMember, "role" | "status">>) {
    await StoreService.updateMember(member, input);
    await client.invalidateQueries({ queryKey: ["storeMembers"] });
  }

  async function removeMember(member: StoreMember) {
    const confirmed = window.confirm(`Remover acesso de ${member.email}?`);
    if (!confirmed) return;
    await StoreService.removeMember(member.id);
    await client.invalidateQueries({ queryKey: ["storeMembers"] });
  }

  async function removeInvitation(invitationId: string, email: string) {
    const confirmed = window.confirm(`Remover convite de ${email}?`);
    if (!confirmed) return;
    await StoreService.removeInvitation(invitationId);
    await client.invalidateQueries({ queryKey: ["storeInvitations"] });
  }

  function toggleInviteStore(storeId: string) {
    setInviteStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((item) => item !== storeId)
        : [...current, storeId]
    );
  }

  return (
    <>
      <PageHeader title="Configurações" description="Empresa, logo, moeda, tema, dados fiscais e assinatura.">
        <Button form="settings-form" disabled={update.isPending}>
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </PageHeader>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
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
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0">
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
          <Card className="min-w-0">
            <CardHeader><CardTitle>Assinatura</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Plano</span><Badge>{formatPlan(subscription?.plan ?? "trial")}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><Badge tone={subscription?.status === "active" || subscription?.status === "trialing" ? "success" : "danger"}>{formatStatus(subscription?.status ?? "trialing")}</Badge></div>
              <div className="rounded-md bg-muted p-3 text-sm">
                Usuários: {subscription?.limits.users ?? 1}<br />
                Produtos: {subscription?.limits.products ?? 500}<br />
                Vendas/mês: {subscription?.limits.monthlySales ?? 1000}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      {canManageStores && (
        <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Lojas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stores.map((store) => (
                <div key={store.id} className="min-w-0 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{StoreService.storeName(store)}</p>
                      <p className="break-all text-xs text-muted-foreground">{store.id}</p>
                    </div>
                    <Badge tone={store.status === "active" ? "success" : "neutral"} className="shrink-0">{formatStatus(store.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void renameStore(store.id, StoreService.storeName(store))}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => void archiveStore(store.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" />
                Usuários e permissões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid min-w-0 gap-3 rounded-md border border-border p-3 md:grid-cols-[minmax(0,1fr)_160px]">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as StoreRole)}>
                  <option value="manager">Gerente</option>
                  <option value="employee">Funcionário</option>
                </Select>
                <div className="grid gap-2 md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Lojas liberadas</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stores.map((store) => (
                      <label key={store.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={inviteStoreIds.includes(store.id)}
                          onChange={() => toggleInviteStore(store.id)}
                        />
                        {StoreService.storeName(store)}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se nenhuma loja for marcada, o acesso libera todas as lojas atuais.
                  </p>
                </div>
                <Button
                  className="md:col-span-2"
                  disabled={invite.isPending || !inviteEmail.trim() || inviteEmail.trim().toLowerCase() === profile?.email?.toLowerCase()}
                  onClick={() => invite.mutate()}
                >
                  Liberar acesso
                </Button>
              </div>

              <div className="grid gap-3 md:hidden">
                {(members.data ?? []).map((member) => {
                  const store = stores.find((item) => item.id === member.storeId);
                  const isOwner = member.role === "owner";
                  return (
                    <div key={member.id} className="min-w-0 rounded-md border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-all font-medium">{member.email}</p>
                          <p className="mt-1 truncate text-muted-foreground">
                            {store ? StoreService.storeName(store) : member.storeId}
                          </p>
                        </div>
                        <Badge tone={member.status === "active" ? "success" : "danger"} className="shrink-0">
                          {formatStatus(member.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <Select
                          value={member.role}
                          disabled={isOwner}
                          onChange={(event) => void updateMember(member, { role: event.target.value as StoreRole })}
                        >
                          <option value="owner">Proprietário</option>
                          <option value="manager">Gerente</option>
                          <option value="employee">Funcionário</option>
                        </Select>
                        {!isOwner && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              variant="secondary"
                              onClick={() => void updateMember(member, { status: member.status === "blocked" ? "active" : "blocked" })}
                            >
                              {member.status === "blocked" ? "Liberar" : "Bloquear"}
                            </Button>
                            <Button variant="danger" onClick={() => void removeMember(member)}>
                              Remover
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(invitations.data ?? [])
                  .filter((invitation) => invitation.status === "pending")
                  .map((invitation) => {
                    const store = stores.find((item) => item.id === invitation.storeId);
                    return (
                      <div key={invitation.id} className="min-w-0 rounded-md border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all font-medium">{invitation.email}</p>
                            <p className="mt-1 truncate text-muted-foreground">
                              {store ? StoreService.storeName(store) : invitation.storeId}
                            </p>
                          </div>
                          <Badge tone="warning" className="shrink-0">{formatStatus("pending")}</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{formatRole(invitation.role)}</span>
                          <Button variant="danger" onClick={() => void removeInvitation(invitation.id, invitation.email)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2">Email</th>
                      <th>Loja</th>
                      <th>Papel</th>
                      <th>Status</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(members.data ?? []).map((member) => {
                      const store = stores.find((item) => item.id === member.storeId);
                      const isOwner = member.role === "owner";
                      return (
                        <tr key={member.id} className="border-t border-border">
                          <td className="py-3 font-medium">{member.email}</td>
                          <td>{store ? StoreService.storeName(store) : member.storeId}</td>
                          <td>
                            <Select
                              value={member.role}
                              disabled={isOwner}
                              onChange={(event) => void updateMember(member, { role: event.target.value as StoreRole })}
                            >
                              <option value="owner">Proprietário</option>
                              <option value="manager">Gerente</option>
                              <option value="employee">Funcionário</option>
                            </Select>
                          </td>
                          <td><Badge tone={member.status === "active" ? "success" : "danger"}>{formatStatus(member.status)}</Badge></td>
                          <td className="text-right">
                            {!isOwner && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => void updateMember(member, { status: member.status === "blocked" ? "active" : "blocked" })}
                                >
                                  {member.status === "blocked" ? "Liberar" : "Bloquear"}
                                </Button>
                                <Button variant="danger" onClick={() => void removeMember(member)}>
                                  Remover
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(invitations.data ?? [])
                      .filter((invitation) => invitation.status === "pending")
                      .map((invitation) => {
                        const store = stores.find((item) => item.id === invitation.storeId);
                        return (
                          <tr key={invitation.id} className="border-t border-border">
                            <td className="py-3 font-medium">{invitation.email}</td>
                            <td>{store ? StoreService.storeName(store) : invitation.storeId}</td>
                            <td>{formatRole(invitation.role)}</td>
                            <td><Badge tone="warning">{formatStatus("pending")}</Badge></td>
                            <td className="text-right">
                              <Button variant="danger" onClick={() => void removeInvitation(invitation.id, invitation.email)}>
                                Remover
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}
