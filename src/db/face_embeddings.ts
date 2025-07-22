import { DatabaseClient } from './client';
import { FaceEmbedding } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const faceEmbeddingColumns = ['id', 'created_at', 'box', 'confidence', 'media_id', 'embedding'];
const faceEmbeddingColumnsStr = faceEmbeddingColumns.join(', ');

export async function dbCreateFaceEmbedding(
  db: DatabaseClient,
  input: {
    box: unknown;
    confidence: number;
    media_id: string;
    embedding: unknown;
  }
): Promise<FaceEmbedding> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    box: input.box,
    confidence: input.confidence,
    media_id: input.media_id,
    embedding: input.embedding,
  });

  const result = await db.query(`
    INSERT INTO face_embeddings (${cols})
    VALUES (${placeholders})
    RETURNING ${faceEmbeddingColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetFaceEmbedding(
  db: DatabaseClient,
  id: string
): Promise<FaceEmbedding | null> {
  const result = await db.query(`
    SELECT ${faceEmbeddingColumnsStr}
    FROM face_embeddings
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetFaceEmbeddingByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<FaceEmbedding[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${faceEmbeddingColumnsStr}
    FROM face_embeddings
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateFaceEmbedding(
  db: DatabaseClient,
  id: string,
  input: {
    box?: unknown;
    confidence?: number;
    media_id?: string;
    embedding?: unknown;
  }
): Promise<FaceEmbedding | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    box: input.box,
    confidence: input.confidence,
    media_id: input.media_id,
    embedding: input.embedding,
  });

  if (setClause.length === 0) {
    return dbGetFaceEmbedding(db, id);
  }

  const query = `
    UPDATE face_embeddings
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${faceEmbeddingColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteFaceEmbedding(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM face_embeddings 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}