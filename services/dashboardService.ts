"use client";

import { eachDayOfInterval, format, isSameDay } from "date-fns";
import { CustomerService } from "@/services/customerService";
import { FinanceService } from "@/services/financeService";
import { ProductService } from "@/services/productService";
import { SaleService } from "@/services/saleService";
import type { DashboardData } from "@/types/dashboard";
import type { FinancialTransaction } from "@/types/finance";
import type { Sale } from "@/types/sale";

export interface DashboardPeriod {
  startDate: Date;
  endDate: Date;
}

export const DashboardService = {
  async getOverview(storeId: string, period: DashboardPeriod): Promise<DashboardData> {
    const [products, customers, paidSales, paidTransactions] = await Promise.all([
      ProductService.list(storeId),
      CustomerService.list(storeId),
      SaleService.listPaidInPeriod(storeId, period.startDate, period.endDate),
      FinanceService.listPaidInPeriod(storeId, period.startDate, period.endDate)
    ]);

    const expenses = paidTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const revenue = paidSales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = paidSales.reduce((sum, sale) => sum + sale.grossProfit, 0) - expenses;
    const lowStockItems = products.filter((product) =>
      isLowStock(product.quantity, product.minimumStock)
    );

    return {
      metrics: {
        soldInPeriod: revenue,
        salesCount: paidSales.length,
        productsInStock: products.reduce((sum, product) => sum + toNumber(product.quantity), 0),
        lowStockProducts: lowStockItems.length,
        profit,
        revenue,
        expenses,
        cashFlow: revenue - expenses
      },
      monthlyChart: buildPeriodChart(paidSales, paidTransactions, period),
      topProducts: buildTopProducts(paidSales),
      latestSales: paidSales.slice(0, 5),
      latestCustomers: customers.slice(0, 5),
      alerts: lowStockItems.slice(0, 5).map((product) => ({
        id: product.id,
        title: "Estoque baixo",
        description: `${product.name} está com ${toNumber(product.quantity)} ${product.unit}. Mínimo: ${toNumber(product.minimumStock)}.`,
        tone: "warning"
      })),
      lowStockItems
    };
  }
};

function toNumber(value: unknown) {
  const parsed = typeof value === "string"
    ? Number(value.replace(",", "."))
    : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isLowStock(quantity: unknown, minimumStock: unknown) {
  return toNumber(quantity) <= toNumber(minimumStock);
}

function buildPeriodChart(
  sales: Sale[],
  transactions: FinancialTransaction[],
  period: DashboardPeriod
) {
  const days = eachDayOfInterval({ start: period.startDate, end: period.endDate });
  if (days.length > 31) {
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return [{ label: "Período", revenue, expense, balance: revenue - expense }];
  }

  return days.map((day) => {
    const revenue = sales
      .filter((sale) => isSameDay(sale.createdAt.toDate(), day))
      .reduce((sum, sale) => sum + sale.total, 0);
    const expense = transactions
      .filter((item) => item.type === "expense" && isSameDay((item.paidAt ?? item.dueAt).toDate(), day))
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      label: format(day, "dd/MM"),
      revenue,
      expense,
      balance: revenue - expense
    };
  });
}

function buildTopProducts(sales: Sale[]) {
  const totals = new Map<string, { name: string; total: number; quantity: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const current = totals.get(item.productId) ?? { name: item.name, total: 0, quantity: 0 };
      totals.set(item.productId, {
        name: item.name,
        total: current.total + item.total,
        quantity: current.quantity + item.quantity
      });
    }
  }
  return Array.from(totals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
