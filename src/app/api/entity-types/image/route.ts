import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { dbCreateEntityTypeImageData, dbGetAllEntityTypeImageData } from '@/db/entity-types';
import { createImageDataSchema } from './schemas';

const pool = createPool();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = createImageDataSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { media_id, caption, alt_text, tags, ocr_text, width, height, format, file_size_bytes } = validationResult.data;

    // Create image data record
    const imageData = await dbCreateEntityTypeImageData(
      pool,
      media_id,
      caption,
      alt_text,
      tags,
      ocr_text,
      width,
      height,
      format,
      file_size_bytes
    );

    return NextResponse.json({
      imageData,
    });
  } catch (error) {
    console.error('Failed to create image data:', error);
    return NextResponse.json(
      { error: 'Failed to create image data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const imageData = await dbGetAllEntityTypeImageData(pool);
    
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