import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createPool } from '@/db/client';
import fs from 'fs/promises';

const pool = createPool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the image portion data
    const portionQuery = `
      SELECT ip.*, e.type_image_data_id, img.media_id, m.file_path, m.url, m.storage_type, m.mime_type
      FROM entity_type__image_portion ip
      JOIN entities e ON ip.source_image_entity_id = e.id
      JOIN entity_type__image_data img ON e.type_image_data_id = img.id
      JOIN media m ON img.media_id = m.id
      WHERE ip.id = $1
    `;
    
    const result = await pool.query(portionQuery, [params.id]);
    
    if (result.rows.length === 0) {
      return new NextResponse('Image portion not found', { status: 404 });
    }
    
    const portion = result.rows[0];
    
    let imageBuffer: Buffer;
    
    // Handle different storage types
    if (portion.storage_type === 'local') {
      // Read from local file system
      imageBuffer = await fs.readFile(portion.file_path);
    } else if (portion.storage_type === 'gcs' || portion.storage_type === 'url') {
      // Fetch from URL (GCS URLs or any other URL)
      const imageUrl = portion.url || portion.file_path;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        return new NextResponse('Failed to fetch source image', { status: 500 });
      }
      
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      return new NextResponse(`Unsupported storage type: ${portion.storage_type}`, { status: 400 });
    }
    
    // Crop the image using sharp
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ 
        left: portion.x, 
        top: portion.y, 
        width: portion.width, 
        height: portion.height 
      })
      .png() // Convert to PNG for consistency
      .toBuffer();
    
    // Return the image with appropriate headers
    return new NextResponse(croppedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Length': croppedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to serve cropped image:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Input image exceeds pixel limit')) {
        return new NextResponse('Image is too large to process', { status: 413 });
      }
      
      if (error.message.includes('extract_area')) {
        return new NextResponse('Crop area is outside image bounds', { status: 400 });
      }
    }
    
    return new NextResponse('Failed to process image', { status: 500 });
  }
}