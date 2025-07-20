import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createPool } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const pool = createPool();

interface CropRequest {
  mediaId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CropRequest = await request.json();
    const { mediaId, x, y, width, height } = body;

    // Validate input
    if (!mediaId || x < 0 || y < 0 || width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'Invalid crop parameters' },
        { status: 400 }
      );
    }

    // Get the original media from database
    const mediaQuery = `
      SELECT id, file_path, storage_type, url, mime_type
      FROM media
      WHERE id = $1
    `;
    const mediaResult = await pool.query(mediaQuery, [mediaId]);
    
    if (mediaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    const originalMedia = mediaResult.rows[0];
    
    // For now, we'll handle local file storage
    if (originalMedia.storage_type !== 'local') {
      return NextResponse.json(
        { error: 'Only local storage is supported for cropping' },
        { status: 400 }
      );
    }

    // Read the original image
    const originalPath = originalMedia.file_path;
    const imageBuffer = await fs.readFile(originalPath);

    // Crop the image using sharp
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left: x, top: y, width, height })
      .toBuffer();

    // Generate new filename for cropped image
    const fileExt = path.extname(originalPath);
    const croppedFileName = `${uuidv4()}_crop_${x}_${y}_${width}x${height}${fileExt}`;
    const croppedFilePath = path.join(path.dirname(originalPath), croppedFileName);

    // Save cropped image
    await fs.writeFile(croppedFilePath, croppedBuffer);

    // Get file stats
    const stats = await fs.stat(croppedFilePath);

    // Insert cropped image into media table
    const insertQuery = `
      INSERT INTO media (
        file_name, file_path, file_size, mime_type, 
        storage_type, url, metadata
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, file_name, file_path, file_size, mime_type, storage_type, url, metadata, created_at
    `;

    const metadata = {
      source_media_id: mediaId,
      crop_x: x,
      crop_y: y,
      crop_width: width,
      crop_height: height,
    };

    const url = `/api/media/${uuidv4()}`; // This will need to be implemented

    const result = await pool.query(insertQuery, [
      croppedFileName,
      croppedFilePath,
      stats.size,
      originalMedia.mime_type,
      'local',
      url,
      JSON.stringify(metadata),
    ]);

    const croppedMedia = result.rows[0];

    return NextResponse.json({
      media: croppedMedia,
      cropInfo: {
        x,
        y,
        width,
        height,
      },
    });
  } catch (error) {
    console.error('Failed to crop image:', error);
    
    if (error instanceof Error && error.message.includes('Input image exceeds pixel limit')) {
      return NextResponse.json(
        { error: 'Image is too large to process' },
        { status: 413 }
      );
    }
    
    if (error instanceof Error && error.message.includes('extract_area')) {
      return NextResponse.json(
        { error: 'Crop area is outside image bounds' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to crop image' },
      { status: 500 }
    );
  }
}