import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  document: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Informe um email válido.").optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"])
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
