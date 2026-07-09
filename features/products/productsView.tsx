"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, PackagePlus, Power, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BarcodeScanner } from "@/features/products/barcodeScanner";
import { useAuth } from "@/contexts/authProvider";
import { formatCurrency, formatPercent } from "@/lib/format";
import { ProductService } from "@/services/productService";
import { calculateMargin, productSchema, type ProductFormValues } from "@/validators/productSchema";

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

export function ProductsView() {
  const { companyId, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues
  });
  const costPrice = useWatch({ control: form.control, name: "costPrice" });
  const salePrice = useWatch({ control: form.control, name: "salePrice" });

  const productsQuery = useQuery({
    queryKey: ["products", companyId, search],
    queryFn: () => ProductService.search(companyId ?? "", search),
    enabled: Boolean(companyId)
  });

  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      if (!companyId || !user) throw new Error("Sessão inválida.");
      return ProductService.create({
        ...values,
        companyId,
        createdBy: user.uid,
        updatedBy: user.uid,
        margin: calculateMargin(values.costPrice, values.salePrice)
      });
    },
    onSuccess: async () => {
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
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

  return (
    <>
      <PageHeader title="Produtos" description="Cadastro, estoque, código de barras e status." />

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço de custo">
                  <Input type="number" step="0.01" placeholder="0,00" {...form.register("costPrice")} />
                </Field>
                <Field label="Preço de venda">
                  <Input type="number" step="0.01" placeholder="0,00" {...form.register("salePrice")} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
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

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Catálogo</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Pesquisar" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2">Produto</th>
                  <th>SKU</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(productsQuery.data ?? []).map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="py-3 font-medium">{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{formatCurrency(product.salePrice)}</td>
                    <td>
                      <Badge tone={product.quantity <= product.minimumStock ? "warning" : "neutral"}>
                        {product.quantity} {product.unit}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={product.status === "active" ? "success" : "neutral"}>{product.status}</Badge>
                    </td>
                    <td className="text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
