import { DatabaseClient } from './client';
import { Entity, CreateEntityInput, UpdateEntityInput } from './types';

export async function dbCreateEntity(
  db: DatabaseClient,
  input: CreateEntityInput
): Promise<Entity> {
  if (!input.type_facial_data_id && !input.type_text_data_id && !input.type_image_data_id) {
    throw new Error('At least one entity type must be specified');
  }

  const query = `
    INSERT INTO entities (type_facial_data_id, type_text_data_id, type_image_data_id)
    VALUES ($1, $2, $3)
    RETURNING id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
  `;

  const result = await db.query(query, [
    input.type_facial_data_id || null,
    input.type_text_data_id || null,
    input.type_image_data_id || null,
  ]);

  return result.rows[0];
}

export async function dbGetEntity(
  db: DatabaseClient,
  id: string
): Promise<Entity | null> {
  const query = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllEntities(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<Entity[]> {
  const query = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntity(
  db: DatabaseClient,
  id: string,
  input: UpdateEntityInput
): Promise<Entity | null> {
  const setClause: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.type_facial_data_id !== undefined) {
    setClause.push(`type_facial_data_id = $${paramCount}`);
    values.push(input.type_facial_data_id);
    paramCount++;
  }

  if (input.type_text_data_id !== undefined) {
    setClause.push(`type_text_data_id = $${paramCount}`);
    values.push(input.type_text_data_id);
    paramCount++;
  }

  if (input.type_image_data_id !== undefined) {
    setClause.push(`type_image_data_id = $${paramCount}`);
    values.push(input.type_image_data_id);
    paramCount++;
  }

  if (setClause.length === 0) {
    return dbGetEntity(db, id);
  }

  values.push(id);

  const query = `
    UPDATE entities
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
  `;

  const result = await db.query(query, values);
  return result.rows[0] || null;
}

export async function dbDeleteEntity(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const query = `DELETE FROM entities WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}

export async function dbGetEntitiesByFacialDataId(
  db: DatabaseClient,
  facialDataId: string
): Promise<Entity[]> {
  const query = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    WHERE type_facial_data_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [facialDataId]);
  return result.rows;
}

export async function dbGetEntitiesByTextDataId(
  db: DatabaseClient,
  textDataId: string
): Promise<Entity[]> {
  const query = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    WHERE type_text_data_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [textDataId]);
  return result.rows;
}

export async function dbGetEntitiesByImageDataId(
  db: DatabaseClient,
  imageDataId: string
): Promise<Entity[]> {
  const query = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    WHERE type_image_data_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [imageDataId]);
  return result.rows;
}