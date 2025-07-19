import { z } from 'zod';

export const createTextDataSchema = z.object({
  content: z.string({
    required_error: "Content is required",
    invalid_type_error: "Content must be a string",
  }).min(1, "Content cannot be empty")
});

export const updateTextDataSchema = z.object({
  content: z.string({
    required_error: "Content is required",
    invalid_type_error: "Content must be a string",
  }).min(1, "Content cannot be empty")
});

export type CreateTextDataInput = z.infer<typeof createTextDataSchema>;
export type UpdateTextDataInput = z.infer<typeof updateTextDataSchema>;