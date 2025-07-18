import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetAllEntities } from '@/db/entities';
import { dbGetAllRelations } from '@/db/relations';
import { searchEntities } from '@/lib/ai-analysis';

const pool = createPool();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

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