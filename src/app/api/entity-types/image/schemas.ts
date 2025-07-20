import { z } from 'zod';

export const createImageDataSchema = z.object({
  media_id: z.string().uuid("Media ID must be a valid UUID"),
  caption: z.string().optional().nullable(),
  alt_text: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  ocr_text: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  format: z.string().max(50).optional().nullable(),
  file_size_bytes: z.number().int().positive().optional().nullable(),
});

export const updateImageDataSchema = z.object({
  media_id: z.string().uuid("Media ID must be a valid UUID").optional(),
  caption: z.string().optional().nullable(),
  alt_text: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  ocr_text: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  format: z.string().max(50).optional().nullable(),
  file_size_bytes: z.number().int().positive().optional().nullable(),
});

export type CreateImageDataInput = z.infer<typeof createImageDataSchema>;
export type UpdateImageDataInput = z.infer<typeof updateImageDataSchema>;