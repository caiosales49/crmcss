export function formatCurrencyInput(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}
