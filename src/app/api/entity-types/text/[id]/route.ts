import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { updateTextDataSchema } from '../schemas';
import { z } from 'zod';

const pool = createPool();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const query = `
      SELECT id, created_at, updated_at, content
      FROM entity_type__text_data
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Text data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ textData: result.rows[0] });
  } catch (error) {
    console.error('Error fetching text data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch text data' },
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
    
    // Validate request body
    const validationResult = updateTextDataSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          issues: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const { content } = validationResult.data;
    
    const query = `
      UPDATE entity_type__text_data
      SET content = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, created_at, updated_at, content
    `;
    
    const result = await pool.query(query, [params.id, content]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Text data not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ textData: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating text data:', error);
    return NextResponse.json(
      { error: 'Failed to update text data' },
      { status: 500 }
    );
  }
}