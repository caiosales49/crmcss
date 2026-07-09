import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Informe o nome da empresa."),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Informe um email válido.").optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  currency: z.enum(["BRL", "USD", "EUR"]),
  theme: z.enum(["light", "dark", "system"]),
  lowStockAlertsEnabled: z.boolean()
});

export type CompanyFormValues = z.infer<typeof companySchema>;
