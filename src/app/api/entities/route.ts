import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetAllEntities, dbCreateEntity } from '@/db/entities';

const pool = createPool();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const entities = await dbGetAllEntities(pool, limit, offset);
    return NextResponse.json({ entities });
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
    
    if (!body.type_facial_data_id && !body.type_text_data_id) {
      return NextResponse.json(
        { error: 'At least one entity type must be specified' },
        { status: 400 }
      );
    }

    const entity = await dbCreateEntity(pool, {
      type_facial_data_id: body.type_facial_data_id,
      type_text_data_id: body.type_text_data_id,
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error('Error creating entity:', error);
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}