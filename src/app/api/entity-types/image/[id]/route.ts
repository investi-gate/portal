import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbGetEntityTypeImageData, dbUpdateEntityTypeImageData, dbDeleteEntityTypeImageData } from '@/db/entity-types';
import { updateImageDataSchema } from '../schemas';

const pool = createPool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imageData = await dbGetEntityTypeImageData(pool, params.id);
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      imageData,
    });
  } catch (error) {
    console.error('Failed to fetch image data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = updateImageDataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;
    
    const imageData = await dbUpdateEntityTypeImageData(pool, params.id, updates);
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      imageData,
    });
  } catch (error) {
    console.error('Failed to update image data:', error);
    return NextResponse.json(
      { error: 'Failed to update image data' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await dbDeleteEntityTypeImageData(pool, params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Image data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Image data deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete image data:', error);
    return NextResponse.json(
      { error: 'Failed to delete image data' },
      { status: 500 }
    );
  }
}