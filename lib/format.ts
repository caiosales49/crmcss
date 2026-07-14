export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
  blocked: "Bloqueado",
  pending: "Pendente",
  open: "Aberto",
  paid: "Pago",
  overdue: "Atrasado",
  canceled: "Cancelado",
  suspended: "Suspenso",
  trialing: "Em teste",
  completed: "Concluído",
  processing: "Processando",
  failed: "Falhou",
  ready: "Pronto"
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerente",
  employee: "Funcionário",
  cashier: "Caixa",
  sales: "Vendas"
};

const planLabels: Record<string, string> = {
  trial: "Teste",
  starter: "Inicial",
  professional: "Profissional",
  enterprise: "Empresarial"
};

const transactionTypeLabels: Record<string, string> = {
  revenue: "Receita",
  expense: "Despesa"
};

const movementTypeLabels: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
  loss: "Perda",
  exchange: "Troca",
  return: "Devolução"
};

const reportTypeLabels: Record<string, string> = {
  products: "Produtos",
  inventory: "Estoque",
  movements: "Movimentações",
  customers: "Clientes",
  sales: "Vendas",
  finance: "Financeiro",
  profit: "Lucro",
  top_products: "Produtos mais vendidos",
  margin: "Margem",
  cash_flow: "Fluxo de caixa"
};

const alertToneLabels: Record<string, string> = {
  warning: "Atenção",
  neutral: "Aviso",
  success: "Tudo certo",
  danger: "Crítico"
};

function fallbackLabel(value?: string) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatStatus(status?: string) {
  return status ? statusLabels[status] ?? fallbackLabel(status) : "-";
}

export function formatRole(role?: string) {
  return role ? roleLabels[role] ?? fallbackLabel(role) : "-";
}

export function formatPlan(plan?: string) {
  return plan ? planLabels[plan] ?? fallbackLabel(plan) : "-";
}

export function formatTransactionType(type?: string) {
  return type ? transactionTypeLabels[type] ?? fallbackLabel(type) : "-";
}

export function formatMovementType(type?: string) {
  return type ? movementTypeLabels[type] ?? fallbackLabel(type) : "-";
}

export function formatReportType(type?: string) {
  return type ? reportTypeLabels[type] ?? fallbackLabel(type) : "-";
}

export function formatAlertTone(tone?: string) {
  return tone ? alertToneLabels[tone] ?? fallbackLabel(tone) : "-";
}
