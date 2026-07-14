"use client";

import { Chrome, Eye, Lock, LogOut, RefreshCw, Save, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/authProvider";
import { hasFirebaseConfig } from "@/lib/env";
import {
  isPlatformAdminEmail,
  PlatformService
} from "@/services/platformService";
import type { ManagedAccountSummary, PlatformMessageDisplayType } from "@/types/platform";

function formatDate(value: unknown) {
  if (!value || typeof value !== "object" || !("toDate" in value) || typeof value.toDate !== "function") {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value.toDate());
}

function storeName(name?: string, fallback?: string) {
  return name || fallback || "Loja";
}

export function ManagementView() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [unauthorized, setUnauthorized] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<ManagedAccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [displayType, setDisplayType] = useState<PlatformMessageDisplayType>("login");
  const [messageActive, setMessageActive] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const configured = hasFirebaseConfig();
  const isAllowed = isPlatformAdminEmail(user?.email);

  const selected = useMemo(
    () => accounts.find((item) => item.account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  async function loadAccounts() {
    if (!isPlatformAdminEmail(user?.email)) return;
    setLoadingAccounts(true);
    setLoadError(null);
    try {
      const nextAccounts = await PlatformService.listManagedAccounts();
      setAccounts(nextAccounts);
      setSelectedAccountId((current) =>
        current && nextAccounts.some((item) => item.account.id === current) ? current : null
      );
    } catch (error) {
      console.error("Falha ao carregar contas da gerência", error);
      setAccounts([]);
      setSelectedAccountId(null);
      setLoadError(
        "Não foi possível carregar os cadastros. O Firestore bloqueou a consulta administrativa por permissão."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!isPlatformAdminEmail(user.email)) {
      setUnauthorized(true);
      void logout();
      return;
    }
    void loadAccounts();
  }, [loading, logout, user]);

  useEffect(() => {
    if (!selected) return;
    setMessageText(selected.message?.message ?? "");
    setDisplayType(selected.message?.displayType ?? "login");
    setMessageActive(selected.message?.status === "active");
  }, [selected?.account.id]);

  async function handleManagementLogin() {
    setUnauthorized(false);
    try {
      const { AuthService } = await import("@/services/authService");
      const signedUser = await AuthService.signInWithGoogle();
      if (!isPlatformAdminEmail(signedUser.email)) {
        await AuthService.logout();
        setUnauthorized(true);
        return;
      }
      router.replace("/gerencia/dashboard");
    } catch (error) {
      console.error("Falha ao entrar na gerência", error);
    }
  }

  async function persistAccount(summary: ManagedAccountSummary) {
    await PlatformService.ensureAccountForStore({
      accountId: summary.account.id,
      ownerId: summary.account.ownerId,
      ownerEmail: summary.account.ownerEmail,
      ownerName: summary.account.ownerName
    });
  }

  async function handleSaveMessage() {
    if (!selected || !user?.email) return;
    setSaving(true);
    try {
      await persistAccount(selected);
      await PlatformService.saveMessage({
        accountId: selected.account.id,
        messageId: selected.message?.id,
        message: messageText,
        displayType,
        active: messageActive,
        adminEmail: user.email
      });
      await loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetMessageActive(active: boolean) {
    if (!selected?.message) return;
    setSaving(true);
    try {
      await PlatformService.setMessageStatus(selected.message.id, active);
      await loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetAccountStatus(status: "active" | "suspended") {
    if (!selected || !user?.email) return;
    setSaving(true);
    try {
      await persistAccount(selected);
      await PlatformService.setAccountStatus({
        accountId: selected.account.id,
        status,
        adminEmail: user.email
      });
      await loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Verificando acesso da gerência...
      </main>
    );
  }

  if (!user || !isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-xl font-semibold text-foreground">Gerência da plataforma</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesso exclusivo para administração da plataforma.
          </p>
          {!configured && (
            <div className="mt-5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              Configure o arquivo .env.local com as chaves públicas do Firebase antes do login.
            </div>
          )}
          {unauthorized && (
            <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Você não possui permissão para acessar esta área.
            </div>
          )}
          <Button
            className="mt-6 w-full"
            disabled={!configured}
            onClick={() => void handleManagementLogin()}
          >
            <Chrome className="h-4 w-4" />
            Entrar na gerência com Google
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Gerência da plataforma</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void loadAccounts()} disabled={loadingAccounts}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Contas principais</h2>
          </div>
          {loadError && (
            <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </div>
          )}
          <div className="grid gap-3 p-4 md:hidden">
            {accounts.map((item) => {
              const active = selected?.account.id === item.account.id;
              return (
                <div
                  key={item.account.id}
                  className={active ? "rounded-md border border-border bg-muted/60 p-3 text-sm" : "rounded-md border border-border p-3 text-sm"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{item.account.ownerName}</p>
                      <p className="break-all text-xs text-muted-foreground">{item.account.ownerEmail}</p>
                    </div>
                    <Badge tone={item.account.status === "suspended" ? "danger" : "success"} className="shrink-0">
                      {item.account.status === "suspended" ? "Suspensa" : "Ativa"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-muted-foreground">
                    <p>Lojas<br /><span className="font-medium text-foreground">{item.stores.length}</span></p>
                    <p>Funcionários<br /><span className="font-medium text-foreground">{item.members.filter((member) => member.role !== "owner").length}</span></p>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {item.stores.map((store) => storeName(store.name, store.nome)).join(", ") || "-"}
                  </p>
                  <Button className="mt-3 w-full" variant="secondary" onClick={() => setSelectedAccountId(item.account.id)}>
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                </div>
              );
            })}
            {!loadingAccounts && accounts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Proprietário</th>
                  <th className="px-4 py-3 font-medium">Lojas</th>
                  <th className="px-4 py-3 font-medium">Funcionários</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Mensagem</th>
                  <th className="px-4 py-3 font-medium">Criada em</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((item) => {
                  const active = selected?.account.id === item.account.id;
                  return (
                    <tr key={item.account.id} className={active ? "bg-muted/60" : undefined}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.account.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{item.account.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{item.stores.length}</p>
                        <p className="max-w-56 truncate text-xs text-muted-foreground">
                          {item.stores.map((store) => storeName(store.name, store.nome)).join(", ") || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{item.members.filter((member) => member.role !== "owner").length}</td>
                      <td className="px-4 py-3">
                        <Badge tone={item.account.status === "suspended" ? "danger" : "success"}>
                          {item.account.status === "suspended" ? "Suspensa" : "Ativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-64 truncate">{item.message?.message ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.message ? `${item.message.status} · ${item.message.displayType}` : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(item.account.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="secondary" onClick={() => setSelectedAccountId(item.account.id)}>
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!loadingAccounts && accounts.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                      Nenhuma conta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          {selected && (
            <>
              <Card className="p-4">
                <h2 className="text-sm font-semibold text-foreground">Informações da conta</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{selected.account.ownerName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">E-mail</dt>
                    <dd className="font-medium">{selected.account.ownerEmail}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-muted-foreground">Lojas</dt>
                      <dd className="font-medium">{selected.stores.length}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Funcionários</dt>
                      <dd className="font-medium">{selected.members.filter((member) => member.role !== "owner").length}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cadastro</dt>
                    <dd className="font-medium">{formatDate(selected.account.createdAt)}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="p-4">
                <h2 className="text-sm font-semibold text-foreground">Lojas vinculadas</h2>
                <div className="mt-3 space-y-3">
                  {selected.stores.map((store) => (
                    <div key={store.id} className="rounded-md border border-border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{storeName(store.name, store.nome)}</p>
                          <p className="text-xs text-muted-foreground">{store.document ?? "Sem CPF/CNPJ"}</p>
                        </div>
                        <Badge tone={store.status === "active" ? "success" : "warning"}>{store.status}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selected.members.filter((member) => member.storeId === store.id && member.role !== "owner").length} funcionários
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="text-sm font-semibold text-foreground">Mensagem da plataforma</h2>
                <div className="mt-4 space-y-3">
                  <Textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Texto da mensagem"
                  />
                  <Select value={displayType} onChange={(event) => setDisplayType(event.target.value as PlatformMessageDisplayType)}>
                    <option value="login">login</option>
                    <option value="navigation">navigation</option>
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={messageActive}
                      onChange={(event) => setMessageActive(event.target.checked)}
                    />
                    Mensagem ativa
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button onClick={() => void handleSaveMessage()} disabled={saving || !messageText.trim()}>
                      <Save className="h-4 w-4" />
                      Salvar mensagem
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void handleSetMessageActive(false)}
                      disabled={saving || !selected.message}
                    >
                      Desativar mensagem
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="text-sm font-semibold text-foreground">Acesso da conta</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="danger"
                    onClick={() => void handleSetAccountStatus("suspended")}
                    disabled={saving || selected.account.ownerEmail === user.email?.trim().toLowerCase()}
                  >
                    <Lock className="h-4 w-4" />
                    Suspender conta
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleSetAccountStatus("active")}
                    disabled={saving}
                  >
                    <Unlock className="h-4 w-4" />
                    Reativar conta
                  </Button>
                </div>
              </Card>
            </>
          )}
          {!selected && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-foreground">Selecione uma conta</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Clique em Visualizar em uma conta principal para abrir informações da conta, lojas vinculadas, mensagem da plataforma e acesso da conta.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}
