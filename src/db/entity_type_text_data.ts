import { DatabaseClient } from './client';
import { EntityTypeTextData } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const textDataColumns = ['id', 'created_at', 'updated_at', 'content'];
const textDataColumnsStr = textDataColumns.join(', ');

export async function dbCreateTextData(
  db: DatabaseClient,
  input: { content: string }
): Promise<EntityTypeTextData> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    content: input.content,
  });

  const result = await db.query(`
    INSERT INTO entity_type__text_data (${cols})
    VALUES (${placeholders})
    RETURNING ${textDataColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetTextData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeTextData | null> {
  const result = await db.query(`
    SELECT ${textDataColumnsStr}
    FROM entity_type__text_data
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetTextDataByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<EntityTypeTextData[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${textDataColumnsStr}
    FROM entity_type__text_data
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateTextData(
  db: DatabaseClient,
  id: string,
  input: { content?: string }
): Promise<EntityTypeTextData | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    content: input.content,
  });

  if (setClause.length === 0) {
    return dbGetTextData(db, id);
  }

  const query = `
    UPDATE entity_type__text_data
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${textDataColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteTextData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM entity_type__text_data 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}