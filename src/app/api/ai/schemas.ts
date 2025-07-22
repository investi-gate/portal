import { z } from 'zod';

// Analysis types enum
export const analysisTypeSchema = z.enum(['all', 'importance', 'patterns', 'clusters', 'suggestions'])
  .default('all')
  .describe('Type of analysis to perform');

// Analyze request schema
export const analyzeRequestSchema = z.object({
  type: analysisTypeSchema.optional(),
  filters: z.object({
    entityIds: z.array(z.string().uuid()).optional(),
    relationIds: z.array(z.string().uuid()).optional(),
    entityTypes: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional()
  }).optional()
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Search request schema
export const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  filters: z.object({
    entityTypes: z.array(z.string()).optional(),
    limit: z.number().int().positive().max(100).default(20),
    includeRelations: z.boolean().default(true)
  }).optional()
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

// Common AI response schemas
export const aiErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional()
});

export const aiSuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  metadata: z.object({
    processingTime: z.number().optional(),
    model: z.string().optional(),
    version: z.string().optional()
  }).optional()
});