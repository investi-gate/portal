import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { 
  dbGetEntityTypeImagePortion, 
  dbUpdateEntityTypeImagePortion, 
  dbDeleteEntityTypeImagePortion 
} from '@/db/entity-types';
import { updateImagePortionSchema } from '../schemas';

const pool = createPool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imagePortion = await dbGetEntityTypeImagePortion(pool, params.id);
    
    if (!imagePortion) {
      return NextResponse.json(
        { error: 'Image portion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ imagePortion });
  } catch (error) {
    console.error('Failed to fetch image portion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image portion' },
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
    
    // Validate input
    const validationResult = updateImagePortionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const imagePortion = await dbUpdateEntityTypeImagePortion(
      pool,
      params.id,
      validationResult.data
    );

    if (!imagePortion) {
      return NextResponse.json(
        { error: 'Image portion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ imagePortion });
  } catch (error) {
    console.error('Failed to update image portion:', error);
    return NextResponse.json(
      { error: 'Failed to update image portion' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await dbDeleteEntityTypeImagePortion(pool, params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Image portion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image portion:', error);
    return NextResponse.json(
      { error: 'Failed to delete image portion' },
      { status: 500 }
    );
  }
}