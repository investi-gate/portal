import { DatabaseClient } from './client';
import { EntityTypeFacialData, EntityTypeTextData } from './types';

export async function dbCreateEntityTypeFacialData(
  db: DatabaseClient
): Promise<EntityTypeFacialData> {
  const query = `
    INSERT INTO entity_type__facial_data DEFAULT VALUES
    RETURNING id, created_at, updated_at
  `;

  const result = await db.query(query);
  return result.rows[0];
}

export async function dbGetEntityTypeFacialData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeFacialData | null> {
  const query = `
    SELECT id, created_at, updated_at
    FROM entity_type__facial_data
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllEntityTypeFacialData(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<EntityTypeFacialData[]> {
  const query = `
    SELECT id, created_at, updated_at
    FROM entity_type__facial_data
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntityTypeFacialData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeFacialData | null> {
  const query = `
    UPDATE entity_type__facial_data
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, created_at, updated_at
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbDeleteEntityTypeFacialData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const query = `DELETE FROM entity_type__facial_data WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}

export async function dbCreateEntityTypeTextData(
  db: DatabaseClient
): Promise<EntityTypeTextData> {
  const query = `
    INSERT INTO entity_type__text_data DEFAULT VALUES
    RETURNING id, created_at, updated_at
  `;

  const result = await db.query(query);
  return result.rows[0];
}

export async function dbGetEntityTypeTextData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeTextData | null> {
  const query = `
    SELECT id, created_at, updated_at
    FROM entity_type__text_data
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllEntityTypeTextData(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<EntityTypeTextData[]> {
  const query = `
    SELECT id, created_at, updated_at
    FROM entity_type__text_data
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntityTypeTextData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeTextData | null> {
  const query = `
    UPDATE entity_type__text_data
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, created_at, updated_at
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbDeleteEntityTypeTextData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const query = `DELETE FROM entity_type__text_data WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}