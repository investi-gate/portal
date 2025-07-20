import { DatabaseClient } from './client';
import { EntityTypeFacialData, EntityTypeTextData, EntityTypeImageData } from './types';

export async function dbCreateEntityTypeFacialData(
  db: DatabaseClient,
  face_embedding_id?: string | null,
  face_cropped_picture_id?: string | null
): Promise<EntityTypeFacialData> {
  const query = `
    INSERT INTO entity_type__facial_data (face_embedding_id, face_cropped_picture_id) 
    VALUES ($1, $2)
    RETURNING id, created_at, updated_at, face_embedding_id, face_cropped_picture_id
  `;

  const result = await db.query(query, [face_embedding_id || null, face_cropped_picture_id || null]);
  return result.rows[0];
}

export async function dbGetEntityTypeFacialData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeFacialData | null> {
  const query = `
    SELECT id, created_at, updated_at, face_embedding_id, face_cropped_picture_id
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
    SELECT id, created_at, updated_at, face_embedding_id, face_cropped_picture_id
    FROM entity_type__facial_data
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntityTypeFacialData(
  db: DatabaseClient,
  id: string,
  face_embedding_id?: string | null,
  face_cropped_picture_id?: string | null
): Promise<EntityTypeFacialData | null> {
  const query = `
    UPDATE entity_type__facial_data
    SET updated_at = CURRENT_TIMESTAMP,
        face_embedding_id = COALESCE($2, face_embedding_id),
        face_cropped_picture_id = COALESCE($3, face_cropped_picture_id)
    WHERE id = $1
    RETURNING id, created_at, updated_at, face_embedding_id, face_cropped_picture_id
  `;

  const result = await db.query(query, [id, face_embedding_id, face_cropped_picture_id]);
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
  db: DatabaseClient,
  content: string = ''
): Promise<EntityTypeTextData> {
  const query = `
    INSERT INTO entity_type__text_data (content) VALUES ($1)
    RETURNING id, created_at, updated_at, content
  `;

  const result = await db.query(query, [content]);
  return result.rows[0];
}

export async function dbGetEntityTypeTextData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeTextData | null> {
  const query = `
    SELECT id, created_at, updated_at, content
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
    SELECT id, created_at, updated_at, content
    FROM entity_type__text_data
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntityTypeTextData(
  db: DatabaseClient,
  id: string,
  content: string
): Promise<EntityTypeTextData | null> {
  const query = `
    UPDATE entity_type__text_data
    SET updated_at = CURRENT_TIMESTAMP, content = $2
    WHERE id = $1
    RETURNING id, created_at, updated_at, content
  `;

  const result = await db.query(query, [id, content]);
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

export async function dbCreateEntityTypeImageData(
  db: DatabaseClient,
  media_id: string,
  caption?: string | null,
  alt_text?: string | null,
  tags?: string[] | null,
  ocr_text?: string | null,
  width?: number | null,
  height?: number | null,
  format?: string | null,
  file_size_bytes?: number | null
): Promise<EntityTypeImageData> {
  const query = `
    INSERT INTO entity_type__image_data (
      media_id, caption, alt_text, tags, ocr_text, 
      width, height, format, file_size_bytes
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, created_at, updated_at, media_id, caption, 
              alt_text, tags, ocr_text, width, height, format, file_size_bytes
  `;

  const result = await db.query(query, [
    media_id,
    caption || null,
    alt_text || null,
    tags || null,
    ocr_text || null,
    width || null,
    height || null,
    format || null,
    file_size_bytes || null
  ]);
  return result.rows[0];
}

export async function dbGetEntityTypeImageData(
  db: DatabaseClient,
  id: string
): Promise<EntityTypeImageData | null> {
  const query = `
    SELECT id, created_at, updated_at, media_id, caption, 
           alt_text, tags, ocr_text, width, height, format, file_size_bytes
    FROM entity_type__image_data
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllEntityTypeImageData(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<EntityTypeImageData[]> {
  const query = `
    SELECT id, created_at, updated_at, media_id, caption, 
           alt_text, tags, ocr_text, width, height, format, file_size_bytes
    FROM entity_type__image_data
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbUpdateEntityTypeImageData(
  db: DatabaseClient,
  id: string,
  updates: {
    media_id?: string;
    caption?: string | null;
    alt_text?: string | null;
    tags?: string[] | null;
    ocr_text?: string | null;
    width?: number | null;
    height?: number | null;
    format?: string | null;
    file_size_bytes?: number | null;
  }
): Promise<EntityTypeImageData | null> {
  const query = `
    UPDATE entity_type__image_data
    SET updated_at = CURRENT_TIMESTAMP,
        media_id = COALESCE($2, media_id),
        caption = COALESCE($3, caption),
        alt_text = COALESCE($4, alt_text),
        tags = COALESCE($5, tags),
        ocr_text = COALESCE($6, ocr_text),
        width = COALESCE($7, width),
        height = COALESCE($8, height),
        format = COALESCE($9, format),
        file_size_bytes = COALESCE($10, file_size_bytes)
    WHERE id = $1
    RETURNING id, created_at, updated_at, media_id, caption, 
              alt_text, tags, ocr_text, width, height, format, file_size_bytes
  `;

  const result = await db.query(query, [
    id,
    updates.media_id,
    updates.caption,
    updates.alt_text,
    updates.tags,
    updates.ocr_text,
    updates.width,
    updates.height,
    updates.format,
    updates.file_size_bytes
  ]);
  return result.rows[0] || null;
}

export async function dbDeleteEntityTypeImageData(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const query = `DELETE FROM entity_type__image_data WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}