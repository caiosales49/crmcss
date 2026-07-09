"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp } from "lucide-react";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/authProvider";
import { InventoryService } from "@/services/inventoryService";

export function InventoryView() {
  const { companyId } = useAuth();
  const movements = useQuery({
    queryKey: ["inventoryMovements", companyId],
    queryFn: () => InventoryService.listMovements(companyId ?? ""),
    enabled: Boolean(companyId)
  });

  return (
    <>
      <PageHeader title="Estoque" description="Entradas, saídas, ajustes, perdas, trocas e devoluções." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-primary" />
            Histórico de movimentações
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                  <td><Badge>{movement.type}</Badge></td>
                  <td>{movement.quantity}</td>
                  <td>{movement.previousQuantity}</td>
                  <td>{movement.nextQuantity}</td>
                  <td>{movement.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
