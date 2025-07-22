import { DatabaseClient } from './client';
import { Media } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const mediaColumns = ['id', 'file_name', 'file_path', 'file_size', 'mime_type', 'storage_type', 'url'];
const mediaColumnsStr = mediaColumns.join(', ');

export async function dbCreateMedia(
  db: DatabaseClient,
  input: {
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    storage_type: string;
    url?: string;
  }
): Promise<Media> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    file_name: input.file_name,
    file_path: input.file_path,
    file_size: input.file_size,
    mime_type: input.mime_type,
    storage_type: input.storage_type,
    url: input.url,
  });

  const result = await db.query(`
    INSERT INTO media (${cols})
    VALUES (${placeholders})
    RETURNING ${mediaColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetMedia(
  db: DatabaseClient,
  id: string
): Promise<Media | null> {
  const result = await db.query(`
    SELECT ${mediaColumnsStr}
    FROM media
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetMediaByIds(
  db: DatabaseClient,
  ids: string[]
): Promise<Media[]> {
  if (ids.length === 0) return [];
  
  const result = await db.query(`
    SELECT ${mediaColumnsStr}
    FROM media
    WHERE id = ANY($1)
  `, [ids]);
  
  return result.rows;
}

export async function dbUpdateMedia(
  db: DatabaseClient,
  id: string,
  input: {
    file_name?: string;
    file_path?: string;
    file_size?: number;
    mime_type?: string;
    storage_type?: string;
    url?: string;
  }
): Promise<Media | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    file_name: input.file_name,
    file_path: input.file_path,
    file_size: input.file_size,
    mime_type: input.mime_type,
    storage_type: input.storage_type,
    url: input.url,
  });

  if (setClause.length === 0) {
    return dbGetMedia(db, id);
  }

  const query = `
    UPDATE media
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${mediaColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteMedia(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM media 
    WHERE id = $1
  `, [id]);
  return result.rowCount > 0;
}