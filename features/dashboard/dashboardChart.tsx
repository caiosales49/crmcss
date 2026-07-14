"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { CashFlowPoint } from "@/types/finance";

export function DashboardChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
