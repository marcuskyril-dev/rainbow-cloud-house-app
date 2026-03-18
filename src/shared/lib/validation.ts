import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(75, "Name is too long"),
  description: z.string().max(1000).optional(),
  price: z.number().positive("Price must be greater than 0"),
  productUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category: z.string().optional(),
  priority: z.enum(["must_have", "nice_to_have", "dream"]).default("must_have"),
});

export const updateItemSchema = createItemSchema.partial().extend({
  expectedVersion: z.number().int().nonnegative(),
});

export const contributeSchema = z.object({
  itemId: z.string().min(1),
  contributorName: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.number().min(1, "Minimum contribution is $1.00"),
  requestId: z.string().uuid(),
});

export type CreateItemFormData = z.output<typeof createItemSchema>;
export type CreateItemFormInput = z.input<typeof createItemSchema>;
export type UpdateItemFormData = z.infer<typeof updateItemSchema>;
export type ContributeFormData = z.infer<typeof contributeSchema>;
