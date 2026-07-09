"use client";

import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { CustomerService } from "@/services/customerService";
import { FinanceService } from "@/services/financeService";
import { ProductService } from "@/services/productService";
import { SaleService } from "@/services/saleService";
import type { DashboardData } from "@/types/dashboard";

export const DashboardService = {
  async getOverview(companyId: string): Promise<DashboardData> {
    const [products, customers, sales, transactions] = await Promise.all([
      ProductService.list(companyId),
      CustomerService.list(companyId),
      SaleService.list(companyId),
      FinanceService.list(companyId)
    ]);

    const today = Timestamp.fromDate(startOfDay(new Date()));
    const monthStart = Timestamp.fromDate(startOfMonth(new Date()));
    const monthEnd = Timestamp.fromDate(endOfMonth(new Date()));

    const paidSales = sales.filter((sale) => sale.status === "paid");
    const salesToday = paidSales.filter((sale) => sale.createdAt >= today);
    const salesThisMonth = paidSales.filter(
      (sale) => sale.createdAt >= monthStart && sale.createdAt <= monthEnd
    );
    const expenses = transactions
      .filter((item) => item.type === "expense" && item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0);
    const revenue = paidSales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = paidSales.reduce((sum, sale) => sum + sale.grossProfit, 0) - expenses;
    const lowStockItems = products.filter((product) => product.quantity <= product.minimumStock);

    return {
      metrics: {
        soldToday: salesToday.reduce((sum, sale) => sum + sale.total, 0),
        soldThisMonth: salesThisMonth.reduce((sum, sale) => sum + sale.total, 0),
        salesCount: salesThisMonth.length,
        productsInStock: products.reduce((sum, product) => sum + product.quantity, 0),
        lowStockProducts: lowStockItems.length,
        profit,
        revenue,
        expenses,
        cashFlow: revenue - expenses
      },
      monthlyChart: buildMonthlyChart(salesThisMonth, expenses),
      topProducts: buildTopProducts(paidSales),
      latestSales: paidSales.slice(0, 5),
      latestCustomers: customers.slice(0, 5),
      alerts: lowStockItems.slice(0, 5).map((product) => ({
        id: product.id,
        title: "Estoque baixo",
        description: `${product.name} está com ${product.quantity} ${product.unit}.`,
        tone: "warning"
      })),
      lowStockItems
    };
  }
};

function buildMonthlyChart(sales: Awaited<ReturnType<typeof SaleService.list>>, expenses: number) {
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  return [
    {
      label: "Mês atual",
      revenue,
      expense: expenses,
      balance: revenue - expenses
    }
  ];
}

function buildTopProducts(sales: Awaited<ReturnType<typeof SaleService.list>>) {
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
