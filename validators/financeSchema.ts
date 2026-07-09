import { z } from "zod";

export const financeSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  category: z.string().min(1, "Informe a categoria."),
  costCenter: z.string().optional(),
  description: z.string().min(2, "Informe a descrição."),
  amount: z.coerce.number().positive("O valor precisa ser maior que zero."),
  dueAt: z.coerce.date(),
  paidAt: z.coerce.date().optional(),
  recurring: z.boolean().default(false),
  status: z.enum(["open", "paid", "overdue", "canceled"])
});

export type FinanceFormValues = z.infer<typeof financeSchema>;
