"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Copy, PackagePlus, Power, RotateCcw, Search, Trash2 } from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BarcodeScanner } from "@/features/products/barcodeScanner";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/cn";
import { formatCurrency, formatPercent, formatStatus } from "@/lib/format";
import { ProductService } from "@/services/productService";
import { calculateMargin, productSchema, type ProductFormValues } from "@/validators/productSchema";
import type { Product } from "@/types/product";
import type { FirestorePage } from "@/services/firestoreRepository";

const defaultValues: ProductFormValues = {
  name: "",
  description: "",
  sku: "",
  costPrice: 0,
  salePrice: 0,
  quantity: 0,
  minimumStock: 1,
  unit: "un",
  status: "active",
  lotTrackingEnabled: false
};

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function productHasLowStock(product: Product) {
  const quantity = parseStockNumber(product.quantity);
  const minimumStock = parseStockNumber(product.minimumStock);
  return Number.isFinite(quantity) && Number.isFinite(minimumStock) && quantity <= minimumStock;
}

function parseStockNumber(value: unknown) {
  const parsed = typeof value === "string"
    ? Number(value.replace(",", "."))
    : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ProductsView() {
  const { companyId, user } = useAuth();
  const { activeStoreId } = useStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [restockProductId, setRestockProductId] = useState<string | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues
  });
  const costPrice = useWatch({ control: form.control, name: "costPrice" });
  const salePrice = useWatch({ control: form.control, name: "salePrice" });

  const productsQuery = useInfiniteQuery<
    FirestorePage<Product>,
    Error,
    InfiniteData<FirestorePage<Product>>,
    [string, string | undefined, string],
    QueryDocumentSnapshot<DocumentData> | null
  >({
    queryKey: ["products", activeStoreId, debouncedSearch],
    queryFn: ({ pageParam }) => ProductService.searchPage(activeStoreId ?? "", debouncedSearch, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    enabled: Boolean(activeStoreId)
  });
  const products = productsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      if (!companyId || !activeStoreId || !user) throw new Error("Sessão inválida.");
      return ProductService.create({
        ...values,
        companyId,
        storeId: activeStoreId,
        createdBy: user.uid,
        updatedBy: user.uid,
        margin: calculateMargin(values.costPrice, values.salePrice)
      });
    },
    onSuccess: async () => {
      setActionError(null);
      form.reset(defaultValues);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    }
  });

  const restockMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error("Sessão inválida.");
      return ProductService.replenishStock(productId, quantity, user.uid);
    },
    onSuccess: async () => {
      setRestockProductId(null);
      setRestockQuantity("");
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Não foi possível repor o estoque.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => ProductService.delete(productId),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir o produto.");
    }
  });

  const margin = calculateMargin(Number(costPrice), Number(salePrice));

  const setBarcode = useCallback(
    (code: string) => {
      form.setValue("barcode", code);
      if (!form.getValues("sku")) form.setValue("sku", code);
    },
    [form]
  );

  function openRestock(productId: string) {
    setActionError(null);
    setRestockQuantity("");
    setRestockProductId((current) => (current === productId ? null : productId));
  }

  function submitRestock(productId: string) {
    const quantity = Number(restockQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setActionError("Informe uma quantidade maior que zero para repor.");
      return;
    }
    restockMutation.mutate({ productId, quantity });
  }

  function deleteProduct(productId: string, productName: string) {
    const confirmed = window.confirm(`Excluir o produto "${productName}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;
    deleteMutation.mutate(productId);
  }

  return (
    <>
      <PageHeader title="Produtos" description="Cadastro, estoque, código de barras e status." />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="gap-3">
            <CardTitle>Novo produto</CardTitle>
            <BarcodeScanner onDetected={setBarcode} />
          </CardHeader>
          <CardContent>
            <form
              id="product-form"
              className="grid gap-3"
              onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            >
              <Field label="Nome do produto">
                <Input placeholder="Ex.: Camiseta básica" {...form.register("name")} />
              </Field>
              <Field label="SKU">
                <Input placeholder="Código único do produto" {...form.register("sku")} />
              </Field>
              <Field label="Código de barras">
                <Input placeholder="Leia com scanner ou digite" {...form.register("barcode")} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Preço de custo">
                  <Input type="number" step="0.01" placeholder="0,00" {...form.register("costPrice")} />
                </Field>
                <Field label="Preço de venda">
                  <Input type="number" step="0.01" placeholder="0,00" {...form.register("salePrice")} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Quantidade">
                  <Input type="number" placeholder="0" {...form.register("quantity")} />
                </Field>
                <Field label="Estoque mínimo">
                  <Input type="number" placeholder="1" {...form.register("minimumStock")} />
                </Field>
                <Field label="Unidade">
                  <Select {...form.register("unit")}>
                    <option value="un">Un</option>
                    <option value="kg">Kg</option>
                    <option value="g">g</option>
                    <option value="l">L</option>
                    <option value="ml">ml</option>
                    <option value="cx">Cx</option>
                    <option value="pc">Pc</option>
                  </Select>
                </Field>
              </div>
              <Field label="Categoria">
                <Input placeholder="Ex.: Vestuário" {...form.register("categoryName")} />
              </Field>
              <Field label="Marca">
                <Input placeholder="Marca do produto" {...form.register("brand")} />
              </Field>
              <Field label="Fornecedor">
                <Input placeholder="Nome do fornecedor" {...form.register("supplierName")} />
              </Field>
              <Field label="Status">
                <Select {...form.register("status")}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="archived">Arquivado</option>
                </Select>
              </Field>
              <div className="rounded-md bg-muted p-3 text-sm">
                Margem estimada: <strong>{formatPercent(margin)}</strong>
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                <PackagePlus className="h-4 w-4" />
                Salvar produto
              </Button>
              {Object.values(form.formState.errors).at(0)?.message && (
                <p className="text-sm text-destructive">
                  {Object.values(form.formState.errors).at(0)?.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Catálogo</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Pesquisar" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {actionError && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {actionError}
              </div>
            )}
            {productsQuery.error && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : "Não foi possível carregar o catálogo."}
              </div>
            )}
            <div className="grid gap-3 md:hidden">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "rounded-md border border-border p-3 text-sm",
                    productHasLowStock(product) && "border-destructive bg-destructive/5 ring-1 ring-destructive/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="mt-1 truncate text-muted-foreground">{product.sku}</p>
                    </div>
                    <Badge tone={product.status === "active" ? "success" : "neutral"}>{formatStatus(product.status)}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-muted-foreground">
                    <p>Preço: <span className="font-medium text-foreground">{formatCurrency(product.salePrice)}</span></p>
                    <p>
                      Estoque:{" "}
                      <Badge tone={productHasLowStock(product) ? "danger" : "neutral"}>
                        {product.quantity} {product.unit}
                      </Badge>
                    </p>
                    <p>Mínimo: <span className="font-medium text-foreground">{product.minimumStock} {product.unit}</span></p>
                    {productHasLowStock(product) && (
                      <p className="font-medium text-destructive">
                        Estoque abaixo do mínimo: {product.minimumStock} {product.unit}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <Button
                      variant="secondary"
                      aria-label="Repor estoque"
                      onClick={() => openRestock(product.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Duplicar produto"
                      onClick={() => user && void ProductService.duplicate(product, user.uid).then(() => queryClient.invalidateQueries({ queryKey: ["products"] }))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Inativar produto"
                      onClick={() => void ProductService.update(product.id, { status: "inactive" }).then(() => queryClient.invalidateQueries({ queryKey: ["products"] }))}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      aria-label="Excluir produto"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteProduct(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {restockProductId === product.id && (
                    <div className="mt-3 grid gap-2 rounded-md bg-muted p-3">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Quantidade para repor"
                        value={restockQuantity}
                        onChange={(event) => setRestockQuantity(event.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          disabled={restockMutation.isPending}
                          onClick={() => submitRestock(product.id)}
                        >
                          Confirmar reposição
                        </Button>
                        <Button variant="secondary" onClick={() => setRestockProductId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2">Produto</th>
                  <th>SKU</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <Fragment key={product.id}>
                  <tr
                    className={cn(
                      "border-t border-border",
                      productHasLowStock(product) && "border-destructive bg-destructive/5"
                    )}
                  >
                    <td className="py-3 font-medium">{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{formatCurrency(product.salePrice)}</td>
                    <td>
                      <Badge tone={productHasLowStock(product) ? "danger" : "neutral"}>
                        {product.quantity} {product.unit}
                      </Badge>
                      {productHasLowStock(product) && (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          Mínimo: {product.minimumStock} {product.unit}
                        </p>
                      )}
                    </td>
                    <td>{product.minimumStock} {product.unit}</td>
                    <td>
                      <Badge tone={product.status === "active" ? "success" : "neutral"}>{formatStatus(product.status)}</Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        aria-label="Repor estoque"
                        onClick={() => openRestock(product.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Duplicar produto"
                        onClick={() => user && void ProductService.duplicate(product, user.uid).then(() => queryClient.invalidateQueries({ queryKey: ["products"] }))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="Inativar produto"
                        onClick={() => void ProductService.update(product.id, { status: "inactive" }).then(() => queryClient.invalidateQueries({ queryKey: ["products"] }))}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger"
                        aria-label="Excluir produto"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteProduct(product.id, product.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                  {restockProductId === product.id && (
                    <tr className="border-t border-border bg-muted/50">
                      <td colSpan={7} className="py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span className="mr-auto text-sm text-muted-foreground">
                            Repor estoque de <strong className="text-foreground">{product.name}</strong>
                          </span>
                          <Input
                            className="w-40"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Quantidade"
                            value={restockQuantity}
                            onChange={(event) => setRestockQuantity(event.target.value)}
                          />
                          <Button
                            disabled={restockMutation.isPending}
                            onClick={() => submitRestock(product.id)}
                          >
                            Confirmar
                          </Button>
                          <Button variant="secondary" onClick={() => setRestockProductId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
            {productsQuery.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={productsQuery.isFetchingNextPage}
                  onClick={() => void productsQuery.fetchNextPage()}
                >
                  {productsQuery.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
