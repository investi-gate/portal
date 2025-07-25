import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbCreateEntity, dbGetAllEntitiesWithBucket } from '@/db/entities';

const pool = createPool();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await dbGetAllEntitiesWithBucket(pool, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.type_facial_data_id && !body.type_text_data_id && !body.type_image_data_id && !body.type_image_portion_id) {
      return NextResponse.json(
        { error: 'At least one entity type must be specified' },
        { status: 400 }
      );
    }

    const entity = await dbCreateEntity(pool, {
      type_facial_data_id: body.type_facial_data_id,
      type_text_data_id: body.type_text_data_id,
      type_image_data_id: body.type_image_data_id,
      type_image_portion_id: body.type_image_portion_id,
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error('Error creating entity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create entity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}