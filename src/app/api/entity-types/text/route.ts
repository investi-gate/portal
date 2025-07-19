import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';
import { createTextDataSchema } from './schemas';
import { z } from 'zod';

const pool = createPool();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = createTextDataSchema.safeParse(body);
    
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
      INSERT INTO entity_type__text_data (content) VALUES ($1)
      RETURNING id, created_at, updated_at, content
    `;
    
    const result = await pool.query(query, [content]);
    return NextResponse.json({ textData: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating text data type:', error);
    return NextResponse.json(
      { error: 'Failed to create text data type' },
      { status: 500 }
    );
  }
}