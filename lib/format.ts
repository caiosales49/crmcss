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
