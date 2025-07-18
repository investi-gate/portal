import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetAllRelations, dbCreateRelation } from '@/db/relations';

const pool = createPool();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const relations = await dbGetAllRelations(pool, limit, offset);
    return NextResponse.json({ relations });
  } catch (error) {
    console.error('Error fetching relations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const relation = await dbCreateRelation(pool, {
      subject_entity_id: body.subject_entity_id,
      subject_relation_id: body.subject_relation_id,
      predicate: body.predicate,
      object_entity_id: body.object_entity_id,
      object_relation_id: body.object_relation_id,
    });

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error) {
    console.error('Error creating relation:', error);
    return NextResponse.json(
      { error: 'Failed to create relation' },
      { status: 500 }
    );
  }
}