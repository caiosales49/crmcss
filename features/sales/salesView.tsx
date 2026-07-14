"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Minus, Plus, ScanLine, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/format";
import { ProductService } from "@/services/productService";
import { SaleService } from "@/services/saleService";
import type { PaymentMethod, SaleItem } from "@/types/sale";

export function SalesView() {
  const { companyId, user } = useAuth();
  const { activeStoreId } = useStore();
  const client = useQueryClient();
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term, 250);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cart, setCart] = useState<SaleItem[]>([]);

  const products = useQuery({
    queryKey: ["pos-products", activeStoreId, debouncedTerm],
    queryFn: () => ProductService.search(activeStoreId ?? "", debouncedTerm),
    enabled: Boolean(activeStoreId)
  });

  const addProduct = useCallback((product: NonNullable<typeof products.data>[number]) => {
    setCart((items) => {
      const current = items.find((item) => item.productId === product.id);
      if (current) {
        return items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
                total: (item.quantity + 1) * item.unitPrice - item.discount
              }
            : item
        );
      }
      return [
        ...items,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          discount: 0,
          subtotal: product.salePrice,
          total: product.salePrice
        }
      ];
    });
  }, []);

  const onBarcode = useCallback(async (code: string) => {
    if (!activeStoreId) return;
    const product = await ProductService.findByBarcode(activeStoreId, code);
    if (product) addProduct(product);
    setTerm("");
  }, [activeStoreId, addProduct]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const itemDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const total = Math.max(subtotal - itemDiscount - discount, 0);
    const grossProfit = cart.reduce(
      (sum, item) => sum + (item.unitPrice - item.costPrice) * item.quantity - item.discount,
      0
    ) - discount;
    return { subtotal, total, grossProfit };
  }, [cart, discount]);

  const finalize = useMutation({
    mutationFn: () => {
      if (!companyId || !activeStoreId || !user) throw new Error("Sessão inválida.");
      return SaleService.finalize({
        companyId,
        storeId: activeStoreId,
        createdBy: user.uid,
        updatedBy: user.uid,
        code: `PDV-${Date.now()}`,
        items: cart,
        subtotal: totals.subtotal,
        discount,
        total: totals.total,
        grossProfit: totals.grossProfit,
        paymentMethod,
        status: "paid"
      });
    },
    onSuccess: async () => {
      setCart([]);
      setDiscount(0);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["products"] }),
        client.invalidateQueries({ queryKey: ["pos-products"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
    }
  });

  function changeQuantity(productId: string, delta: number) {
    setCart((items) =>
      items
        .map((item) => {
          if (item.productId !== productId) return item;
          const quantity = Math.max(item.quantity + delta, 0);
          return {
            ...item,
            quantity,
            subtotal: quantity * item.unitPrice,
            total: quantity * item.unitPrice - item.discount
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  return (
    <>
      <PageHeader title="PDV" description="Venda rápida por busca, SKU, código interno ou código de barras." />
      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Produto, SKU ou código" value={term} onChange={(event) => setTerm(event.target.value)} />
              </div>
              <BarcodeScanner onDetected={onBarcode} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(products.data ?? []).map((product) => (
              <button key={product.id} className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary" onClick={() => addProduct(product)}>
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{product.sku}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold">{formatCurrency(product.salePrice)}</span>
                  <Badge tone={product.quantity <= product.minimumStock ? "warning" : "neutral"}>{product.quantity}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" />Carrinho</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</p></div>
                    <Button variant="ghost" aria-label="Remover" onClick={() => setCart((items) => items.filter((next) => next.productId !== item.productId))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" aria-label="Diminuir" onClick={() => changeQuantity(item.productId, -1)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="secondary" aria-label="Aumentar" onClick={() => changeQuantity(item.productId, 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              <span>Desconto da venda</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={discount || ""}
                onChange={(event) => setDiscount(Number(event.target.value))}
              />
            </label>
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
              <option value="pix">Pix</option>
              <option value="cash">Dinheiro</option>
              <option value="credit_card">Crédito</option>
              <option value="debit_card">Débito</option>
              <option value="bank_slip">Boleto</option>
              <option value="mixed">Misto</option>
            </Select>
            <div className="rounded-md bg-muted p-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
              <div className="mt-2 flex justify-between text-lg"><span>Total</span><strong>{formatCurrency(totals.total)}</strong></div>
            </div>
            <Button
              className="w-full"
              disabled={cart.length === 0 || finalize.isPending}
              onClick={() => finalize.mutate()}
            >
              <CreditCard className="h-4 w-4" />
              Finalizar venda
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
