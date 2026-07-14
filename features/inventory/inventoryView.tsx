"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp } from "lucide-react";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/contexts/storeProvider";
import { formatMovementType } from "@/lib/format";
import { InventoryService } from "@/services/inventoryService";

export function InventoryView() {
  const { activeStoreId } = useStore();
  const movements = useQuery({
    queryKey: ["inventoryMovements", activeStoreId],
    queryFn: () => InventoryService.listMovements(activeStoreId ?? ""),
    enabled: Boolean(activeStoreId)
  });

  return (
    <>
      <PageHeader title="Estoque" description="Entradas, saídas, ajustes, perdas, trocas e devoluções." />
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-primary" />
            Histórico de movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:hidden">
            {(movements.data ?? []).map((movement) => (
              <div key={movement.id} className="min-w-0 rounded-md border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{movement.productName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{movement.reason || "Sem motivo informado"}</p>
                  </div>
                  <Badge className="shrink-0">{formatMovementType(movement.type)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-muted-foreground">
                  <p>Qtd.<br /><span className="font-medium text-foreground">{movement.quantity}</span></p>
                  <p>Antes<br /><span className="font-medium text-foreground">{movement.previousQuantity}</span></p>
                  <p>Depois<br /><span className="font-medium text-foreground">{movement.nextQuantity}</span></p>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2">Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Antes</th>
                <th>Depois</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {(movements.data ?? []).map((movement) => (
                <tr key={movement.id} className="border-t border-border">
                  <td className="py-3 font-medium">{movement.productName}</td>
                  <td><Badge>{formatMovementType(movement.type)}</Badge></td>
                  <td>{movement.quantity}</td>
                  <td>{movement.previousQuantity}</td>
                  <td>{movement.nextQuantity}</td>
                  <td>{movement.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
