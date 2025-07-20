import { z } from 'zod';

export const createImagePortionSchema = z.object({
  source_image_entity_id: z.string().uuid("Source image entity ID must be a valid UUID"),
  x: z.number().int().min(0, "X coordinate must be non-negative"),
  y: z.number().int().min(0, "Y coordinate must be non-negative"),
  width: z.number().int().positive("Width must be positive"),
  height: z.number().int().positive("Height must be positive"),
  label: z.string().max(255).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

export const updateImagePortionSchema = z.object({
  source_image_entity_id: z.string().uuid("Source image entity ID must be a valid UUID").optional(),
  x: z.number().int().min(0, "X coordinate must be non-negative").optional(),
  y: z.number().int().min(0, "Y coordinate must be non-negative").optional(),
  width: z.number().int().positive("Width must be positive").optional(),
  height: z.number().int().positive("Height must be positive").optional(),
  label: z.string().max(255).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

export type CreateImagePortionInput = z.infer<typeof createImagePortionSchema>;
export type UpdateImagePortionInput = z.infer<typeof updateImagePortionSchema>;