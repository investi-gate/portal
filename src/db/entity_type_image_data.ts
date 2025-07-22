import { DatabaseClient } from './client';
import { EntityTypeImageData } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const imageDataColumns = ['id', 'created_at', 'updated_at', 'media_id'];
const imageDataColumnsStr = imageDataColumns.join(', ');

export async function dbCreateImageData(
  db: DatabaseClient,
  input: { media_id: string }
): Promise<EntityTypeImageData> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    media_id: input.media_id,
  });

  const result = await db.query(`
    INSERT INTO entity_type__image_data (${cols})
    VALUES (${placeholders})
    RETURNING ${imageDataColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetImageData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeImageData | null> {
  const result = await db.query(`
    SELECT ${imageDataColumnsStr}
    FROM entity_type__image_data
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetImageDataByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<EntityTypeImageData[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${imageDataColumnsStr}
    FROM entity_type__image_data
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateImageData(
  db: DatabaseClient,
  id: string,
  input: { media_id?: string }
): Promise<EntityTypeImageData | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    media_id: input.media_id,
  });

  if (setClause.length === 0) {
    return dbGetImageData(db, id);
  }

  const query = `
    UPDATE entity_type__image_data
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${imageDataColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteImageData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM entity_type__image_data 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}