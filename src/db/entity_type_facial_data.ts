import { DatabaseClient } from './client';
import { EntityTypeFacialData } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const facialDataColumns = ['id', 'created_at', 'updated_at', 'face_embedding_id'];
const facialDataColumnsStr = facialDataColumns.join(', ');

export async function dbCreateFacialData(
  db: DatabaseClient,
  input: { face_embedding_id: string }
): Promise<EntityTypeFacialData> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    face_embedding_id: input.face_embedding_id,
  });

  const result = await db.query(`
    INSERT INTO entity_type__facial_data (${cols})
    VALUES (${placeholders})
    RETURNING ${facialDataColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetFacialData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeFacialData | null> {
  const result = await db.query(`
    SELECT ${facialDataColumnsStr}
    FROM entity_type__facial_data
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetFacialDataByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<EntityTypeFacialData[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${facialDataColumnsStr}
    FROM entity_type__facial_data
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateFacialData(
  db: DatabaseClient,
  id: string,
  input: { face_embedding_id?: string }
): Promise<EntityTypeFacialData | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    face_embedding_id: input.face_embedding_id,
  });

  if (setClause.length === 0) {
    return dbGetFacialData(db, id);
  }

  const query = `
    UPDATE entity_type__facial_data
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${facialDataColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteFacialData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM entity_type__facial_data 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}