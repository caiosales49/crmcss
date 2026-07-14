"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/pageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/authProvider";
import { useStore } from "@/contexts/storeProvider";
import { formatReportType, formatStatus } from "@/lib/format";
import { ReportService } from "@/services/reportService";
import type { ExportFormat, ReportType } from "@/types/report";

const reportTypes: ReportType[] = ["products", "inventory", "movements", "customers", "sales", "finance", "profit", "top_products", "margin", "cash_flow"];
const formats: ExportFormat[] = ["pdf", "xlsx", "csv"];

export function ReportsView() {
  const { companyId, user } = useAuth();
  const { activeStoreId } = useStore();
  const client = useQueryClient();
  const [type, setType] = useState<ReportType>("sales");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const reports = useQuery({
    queryKey: ["reports", activeStoreId],
    queryFn: () => ReportService.list(activeStoreId ?? ""),
    enabled: Boolean(activeStoreId)
  });
  const request = useMutation({
    mutationFn: () => {
      if (!companyId || !activeStoreId || !user) throw new Error("Sessão inválida.");
      return ReportService.request(companyId, activeStoreId, user.uid, type, format);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["reports"] })
  });

  return (
    <>
      <PageHeader title="Relatórios" description="Produtos, estoque, clientes, vendas, financeiro, lucro, margem e fluxo de caixa.">
        <Button onClick={() => request.mutate()} disabled={request.isPending}>
          <FileSpreadsheet className="h-4 w-4" />
          Gerar
        </Button>
      </PageHeader>
      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
          <Select value={type} onChange={(event) => setType(event.target.value as ReportType)}>
            {reportTypes.map((item) => <option key={item} value={item}>{formatReportType(item)}</option>)}
          </Select>
          <Select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
            {formats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Fila de exportação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(reports.data ?? []).map((report) => (
            <div key={report.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">{formatReportType(report.type)} em {report.format.toUpperCase()}</p>
                <Badge>{formatStatus(report.status)}</Badge>
              </div>
              <Button variant="secondary" disabled={!report.fileUrl}>
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
