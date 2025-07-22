import { DatabaseClient } from './client';
import { EntityTypeImagePortion } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const imagePortionColumns = ['id', 'created_at', 'updated_at', 'source_image_entity_id', 'x', 'y', 'width', 'height', 'label', 'confidence'];
const imagePortionColumnsStr = imagePortionColumns.join(', ');

export async function dbCreateImagePortion(
  db: DatabaseClient,
  input: {
    source_image_entity_id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    confidence?: number;
  }
): Promise<EntityTypeImagePortion> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    source_image_entity_id: input.source_image_entity_id,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    label: input.label,
    confidence: input.confidence,
  });

  const result = await db.query(`
    INSERT INTO entity_type__image_portion (${cols})
    VALUES (${placeholders})
    RETURNING ${imagePortionColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetImagePortion(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeImagePortion | null> {
  const result = await db.query(`
    SELECT ${imagePortionColumnsStr}
    FROM entity_type__image_portion
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetImagePortionByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<EntityTypeImagePortion[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${imagePortionColumnsStr}
    FROM entity_type__image_portion
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateImagePortion(
  db: DatabaseClient,
  id: string,
  input: {
    source_image_entity_id?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
    confidence?: number;
  }
): Promise<EntityTypeImagePortion | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    source_image_entity_id: input.source_image_entity_id,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    label: input.label,
    confidence: input.confidence,
  });

  if (setClause.length === 0) {
    return dbGetImagePortion(db, id);
  }

  const query = `
    UPDATE entity_type__image_portion
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${imagePortionColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteImagePortion(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM entity_type__image_portion 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}