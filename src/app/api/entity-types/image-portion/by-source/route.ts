import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetEntityTypeImagePortionBySourceImage } from '@/db/entity-types';

const pool = createPool();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceImageEntityId = searchParams.get('source_image_entity_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!sourceImageEntityId) {
      return NextResponse.json(
        { error: 'source_image_entity_id is required' },
        { status: 400 }
      );
    }

    const imagePortions = await dbGetEntityTypeImagePortionBySourceImage(
      pool, 
      sourceImageEntityId, 
      limit, 
      offset
    );
    
    return NextResponse.json({
      imagePortions,
    });
  } catch (error) {
    console.error('Failed to fetch image portions by source:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image portions' },
      { status: 500 }
    );
  }
}