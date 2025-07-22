import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetAllEntities } from '@/db/entities';
import { dbGetAllRelations } from '@/db/relations';
import { searchEntities } from '@/lib/ai-analysis';
import { z } from 'zod';

const pool = createPool();

// Query params schema for GET request
const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  includeRelations: z.coerce.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query params
    const validationResult = searchQuerySchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
      includeRelations: searchParams.get('includeRelations')
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { q: query, limit, includeRelations } = validationResult.data;

    const [entities, relations] = await Promise.all([
      dbGetAllEntities(pool),
      dbGetAllRelations(pool)
    ]);

    const results = searchEntities(entities, relations, query);

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error('Error searching entities:', error);
    return NextResponse.json(
      { error: 'Failed to search entities' },
      { status: 500 }
    );
  }
}