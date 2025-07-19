import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@/db/client';

const pool = createPool();

export async function POST(request: NextRequest) {
  try {
    const query = `
      INSERT INTO entity_type__text_data DEFAULT VALUES
      RETURNING id, created_at, updated_at
    `;
    
    const result = await pool.query(query);
    return NextResponse.json({ textData: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating text data type:', error);
    return NextResponse.json(
      { error: 'Failed to create text data type' },
      { status: 500 }
    );
  }
}