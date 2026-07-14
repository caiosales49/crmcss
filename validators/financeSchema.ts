import { z } from "zod";

export const financeSchema = z.object({
  type: z.enum(["revenue", "expense"]),
  category: z.string().min(1, "Informe a categoria."),
  costCenter: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive("O valor precisa ser maior que zero."),
  dueAt: z.coerce.date(),
  paidAt: z.coerce.date().optional(),
  recurring: z.boolean().default(false),
  periodicity: z.enum(["weekly", "monthly", "annual", "one_time", "custom"]).default("one_time"),
  status: z.enum(["open", "paid", "overdue", "canceled"]),
  active: z.boolean().default(true)
});

export type FinanceFormValues = z.infer<typeof financeSchema>;
