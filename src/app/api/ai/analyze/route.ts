import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetAllEntities } from '@/db/entities';
import { dbGetAllRelations } from '@/db/relations';
import {
  analyzeEntityImportance,
  findRelationPatterns,
  detectClusters,
  suggestRelations
} from '@/lib/ai-analysis';

const pool = createPool();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analysisType = body.type || 'all';

    // Fetch data
    const [entities, relations] = await Promise.all([
      dbGetAllEntities(pool),
      dbGetAllRelations(pool)
    ]);

    const results: any = {};

    if (analysisType === 'all' || analysisType === 'importance') {
      results.entityScores = analyzeEntityImportance(entities, relations);
    }

    if (analysisType === 'all' || analysisType === 'patterns') {
      results.relationPatterns = findRelationPatterns(relations);
    }

    if (analysisType === 'all' || analysisType === 'clusters') {
      results.clusters = detectClusters(entities, relations);
    }

    if (analysisType === 'all' || analysisType === 'suggestions') {
      results.suggestedRelations = suggestRelations(entities, relations);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error analyzing data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze data' },
      { status: 500 }
    );
  }
}