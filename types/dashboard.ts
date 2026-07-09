import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Sale } from "@/types/sale";
import type { CashFlowPoint } from "@/types/finance";

export interface DashboardMetrics {
  soldToday: number;
  soldThisMonth: number;
  salesCount: number;
  productsInStock: number;
  lowStockProducts: number;
  profit: number;
  revenue: number;
  expenses: number;
  cashFlow: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  monthlyChart: CashFlowPoint[];
  topProducts: Array<{ name: string; total: number; quantity: number }>;
  latestSales: Sale[];
  latestCustomers: Customer[];
  alerts: Array<{ id: string; title: string; description: string; tone: "info" | "warning" | "danger" }>;
  lowStockItems: Product[];
}
