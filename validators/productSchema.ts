import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto."),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  brand: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  sku: z.string().min(1, "Informe o SKU."),
  internalCode: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.coerce.number().min(0, "O custo não pode ser negativo."),
  salePrice: z.coerce.number().min(0, "O preço não pode ser negativo."),
  quantity: z.coerce.number().min(0, "O estoque não pode ser negativo."),
  minimumStock: z.coerce.number().min(0, "O estoque mínimo não pode ser negativo."),
  unit: z.enum(["un", "kg", "g", "l", "ml", "cx", "pc"]),
  status: z.enum(["active", "inactive", "archived"]),
  lotTrackingEnabled: z.boolean().default(false)
});

export type ProductFormValues = z.infer<typeof productSchema>;

export function calculateMargin(costPrice: number, salePrice: number) {
  if (salePrice <= 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}
