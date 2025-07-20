import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import sharp from 'sharp';
import { getStorageClient, BUCKET_NAME, generateFileName, getPublicUrl } from '@/lib/google-storage';

export async function POST(request: NextRequest) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();
    
    // Generate unique filename
    const fileName = generateFileName(file.name);
    
    // Upload to Google Cloud Storage
    const storage = getStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(fileName);
    
    const stream = blob.createWriteStream({
      metadata: {
        contentType: file.type,
      },
      resumable: false,
    });

    // Upload the file
    await new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        console.error('Upload error:', err);
        reject(err);
      });
      stream.on('finish', resolve);
      stream.end(buffer);
    });

    // Note: With uniform bucket-level access, individual file ACLs are not supported
    // The bucket should be configured with public access at the bucket level
    
    // Get the public URL
    const publicUrl = getPublicUrl(fileName);
    
    // Connect to database
    await client.connect();
    
    // Save media record to database
    const result = await client.query(
      `INSERT INTO media 
       (file_name, file_path, file_size, mime_type, storage_type, url, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        file.name,
        fileName, // Store the GCS filename as file_path
        file.size,
        file.type,
        'gcs', // Google Cloud Storage
        publicUrl,
        JSON.stringify({
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }),
      ]
    );

    return NextResponse.json({
      media: result.rows[0],
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Failed to upload media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT * FROM media ORDER BY created_at DESC LIMIT 100'
    );
    
    return NextResponse.json({
      media: result.rows,
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