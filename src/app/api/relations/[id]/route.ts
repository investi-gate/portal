import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetRelation, dbUpdateRelation, dbDeleteRelation } from '@/db/relations';

const pool = createPool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const relation = await dbGetRelation(pool, params.id);
    
    if (!relation) {
      return NextResponse.json(
        { error: 'Relation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ relation });
  } catch (error) {
    console.error('Error fetching relation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const relation = await dbUpdateRelation(pool, params.id, {
      subject_entity_id: body.subject_entity_id,
      subject_relation_id: body.subject_relation_id,
      predicate: body.predicate,
      object_entity_id: body.object_entity_id,
      object_relation_id: body.object_relation_id,
    });

    if (!relation) {
      return NextResponse.json(
        { error: 'Relation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ relation });
  } catch (error) {
    console.error('Error updating relation:', error);
    return NextResponse.json(
      { error: 'Failed to update relation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await dbDeleteRelation(pool, params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Relation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting relation:', error);
    return NextResponse.json(
      { error: 'Failed to delete relation' },
      { status: 500 }
    );
  }
}