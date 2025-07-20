import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbCreateEntityTypeImagePortion, dbGetAllEntityTypeImagePortion } from '@/db/entity-types';
import { createImagePortionSchema } from './schemas';

const pool = createPool();

async function cropImageForPortion(
  sourceImageEntityId: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string | null> {
  try {
    // Get the source entity's image data
    const entityQuery = `
      SELECT e.type_image_data_id, img.media_id
      FROM entities e
      JOIN entity_type__image_data img ON e.type_image_data_id = img.id
      WHERE e.id = $1
    `;
    const entityResult = await pool.query(entityQuery, [sourceImageEntityId]);
    
    if (entityResult.rows.length === 0) {
      console.error('Source entity not found or has no image data');
      return null;
    }

    const mediaId = entityResult.rows[0].media_id;

    // Call the crop endpoint
    const cropResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/media/crop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaId,
        x,
        y,
        width,
        height,
      }),
    });

    if (!cropResponse.ok) {
      console.error('Failed to crop image:', await cropResponse.text());
      return null;
    }

    const { media } = await cropResponse.json();
    return media.id;
  } catch (error) {
    console.error('Error cropping image:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = createImagePortionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { source_image_entity_id, x, y, width, height, label, confidence } = validationResult.data;

    // Create image portion record
    const imagePortion = await dbCreateEntityTypeImagePortion(
      pool,
      source_image_entity_id,
      x,
      y,
      width,
      height,
      label,
      confidence
    );

    return NextResponse.json({
      imagePortion,
    });
  } catch (error) {
    console.error('Failed to create image portion:', error);
    return NextResponse.json(
      { error: 'Failed to create image portion' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const imagePortions = await dbGetAllEntityTypeImagePortion(pool, limit, offset);
    
    return NextResponse.json({
      imagePortions,
    });
  } catch (error) {
    console.error('Failed to fetch image portions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image portions' },
      { status: 500 }
    );
  }
}