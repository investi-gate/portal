import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getStorageClient, BUCKET_NAME } from '@/lib/google-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT * FROM media WHERE id = $1',
      [params.id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      media: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to fetch media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // First get the media record to get the file path
    const mediaResult = await client.query(
      'SELECT * FROM media WHERE id = $1',
      [params.id]
    );
    
    if (mediaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }
    
    const media = mediaResult.rows[0];
    
    // Delete from Google Cloud Storage
    if (media.storage_type === 'gcs' && media.file_path) {
      try {
        const storage = getStorageClient();
        const bucket = storage.bucket(BUCKET_NAME);
        await bucket.file(media.file_path).delete();
      } catch (error) {
        console.error('Failed to delete file from GCS:', error);
        // Continue with database deletion even if GCS deletion fails
      }
    }
    
    // Delete from database
    const result = await client.query(
      'DELETE FROM media WHERE id = $1 RETURNING *',
      [params.id]
    );
    
    return NextResponse.json({
      message: 'Media deleted successfully',
      media: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to delete media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}