"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatCurrency, formatStatus } from "@/lib/format";
import { CustomerService } from "@/services/customerService";
import type { FirestorePage } from "@/services/firestoreRepository";
import type { Customer } from "@/types/customer";
import { customerSchema, type CustomerFormValues } from "@/validators/customerSchema";

const defaultValues: CustomerFormValues = {
  name: "",
  document: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  state: "",
  zipCode: "",
  notes: "",
  status: "active"
};

export function CustomersView() {
  const { companyId, user } = useAuth();
  const { activeStoreId } = useStore();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const form = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema), defaultValues });
  const customers = useInfiniteQuery<
    FirestorePage<Customer>,
    Error,
    InfiniteData<FirestorePage<Customer>>,
    [string, string | undefined, string],
    QueryDocumentSnapshot<DocumentData> | null
  >({
    queryKey: ["customers", activeStoreId, debouncedSearch],
    queryFn: ({ pageParam }) => CustomerService.searchPage(activeStoreId ?? "", debouncedSearch, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    enabled: Boolean(activeStoreId)
  });
  const customerItems = customers.data?.pages.flatMap((page) => page.items) ?? [];

  const create = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      if (!companyId || !activeStoreId || !user) throw new Error("Sessão inválida.");
      return CustomerService.create({
        companyId,
        storeId: activeStoreId,
        createdBy: user.uid,
        updatedBy: user.uid,
        name: values.name,
        document: values.document,
        phone: values.phone,
        whatsapp: values.whatsapp,
        email: values.email,
        address: { city: values.city, state: values.state, zipCode: values.zipCode },
        notes: values.notes,
        totalSpent: 0,
        status: values.status
      });
    },
    onSuccess: async () => {
      form.reset(defaultValues);
      await client.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  return (
    <>
      <PageHeader title="Clientes" description="Cadastro, histórico de compras e relacionamento.">
        <Button form="customer-form" disabled={create.isPending}>
          <UserPlus className="h-4 w-4" />
          Salvar cliente
        </Button>
      </PageHeader>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="customer-form" className="grid gap-3" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
              <Input placeholder="Nome" {...form.register("name")} />
              <Input placeholder="CPF/CNPJ" {...form.register("document")} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Telefone" {...form.register("phone")} />
                <Input placeholder="WhatsApp" {...form.register("whatsapp")} />
              </div>
              <Input placeholder="Email" {...form.register("email")} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input placeholder="Cidade" {...form.register("city")} />
                <Input placeholder="UF" {...form.register("state")} />
                <Input placeholder="CEP" {...form.register("zipCode")} />
              </div>
              <Textarea placeholder="Observações" {...form.register("notes")} />
              <Select {...form.register("status")}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="archived">Arquivado</option>
              </Select>
            </form>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Base de clientes</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Pesquisar cliente" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:hidden">
              {customerItems.map((customer) => (
                <div key={customer.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{customer.name}</p>
                      <p className="mt-1 truncate text-muted-foreground">
                        {customer.whatsapp || customer.phone || customer.email || "Sem contato"}
                      </p>
                    </div>
                    <Badge tone={customer.status === "active" ? "success" : "neutral"}>{formatStatus(customer.status)}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-muted-foreground">
                    <p>Cidade: <span className="font-medium text-foreground">{customer.address?.city || "-"}</span></p>
                    <p>Total gasto: <span className="font-medium text-foreground">{formatCurrency(customer.totalSpent)}</span></p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2">Nome</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                  <th>Total gasto</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customerItems.map((customer) => (
                  <tr key={customer.id} className="border-t border-border">
                    <td className="py-3 font-medium">{customer.name}</td>
                    <td>{customer.whatsapp || customer.phone || customer.email}</td>
                    <td>{customer.address?.city}</td>
                    <td>{formatCurrency(customer.totalSpent)}</td>
                    <td><Badge tone={customer.status === "active" ? "success" : "neutral"}>{formatStatus(customer.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {customers.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={customers.isFetchingNextPage}
                  onClick={() => void customers.fetchNextPage()}
                >
                  {customers.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
