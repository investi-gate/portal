import { DatabaseClient } from './client';
import { Entity, CreateEntityInput, UpdateEntityInput, Bucket, BucketedResponse } from './types';

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

export async function dbGetAllEntitiesWithTextData(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<(Entity & { text_content?: string })[]> {
  const query = `
    SELECT 
      e.id, 
      e.created_at, 
      e.type_facial_data_id, 
      e.type_text_data_id, 
      e.type_image_data_id,
      t.content as text_content
    FROM entities e
    LEFT JOIN entity_type__text_data t ON e.type_text_data_id = t.id
    ORDER BY e.created_at DESC
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

export async function dbGetAllEntitiesWithBucket(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<BucketedResponse<string[]>> {
  // First get all entities
  const entitiesQuery = `
    SELECT id, created_at, type_facial_data_id, type_text_data_id, type_image_data_id
    FROM entities
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const entitiesResult = await db.query(entitiesQuery, [limit, offset]);
  const entities = entitiesResult.rows;
  const entityIds = entities.map(e => e.id);
  
  // Collect all type IDs
  const facialDataIds = entities
    .filter(e => e.type_facial_data_id)
    .map(e => e.type_facial_data_id);
  const textDataIds = entities
    .filter(e => e.type_text_data_id)
    .map(e => e.type_text_data_id);
  const imageDataIds = entities
    .filter(e => e.type_image_data_id)
    .map(e => e.type_image_data_id);
  
  // Initialize bucket
  const bucket: Bucket = {
    medias: {},
    face_embeddings: {},
    entity_type_facial_data: {},
    entity_type_text_data: {},
    entity_type_image_data: {},
    entities: {},
    relations: {},
  };
  
  // Add entities to bucket
  entities.forEach(entity => {
    bucket.entities[entity.id] = entity;
  });
  
  // Fetch facial data if any
  if (facialDataIds.length > 0) {
    const facialDataQuery = `
      SELECT id, created_at, updated_at, face_embedding_id
      FROM entity_type__facial_data
      WHERE id = ANY($1)
    `;
    const facialDataResult = await db.query(facialDataQuery, [facialDataIds]);
    facialDataResult.rows.forEach(fd => {
      bucket.entity_type_facial_data[fd.id] = fd;
    });
    
    // Fetch face embeddings
    const faceEmbeddingIds = facialDataResult.rows
      .filter(fd => fd.face_embedding_id)
      .map(fd => fd.face_embedding_id);
    
    if (faceEmbeddingIds.length > 0) {
      const faceEmbeddingsQuery = `
        SELECT id, created_at, box, confidence, media_id, embedding
        FROM face_embeddings
        WHERE id = ANY($1)
      `;
      const faceEmbeddingsResult = await db.query(faceEmbeddingsQuery, [faceEmbeddingIds]);
      faceEmbeddingsResult.rows.forEach(fe => {
        bucket.face_embeddings[fe.id] = fe;
      });
      
      // Fetch media
      const mediaIds = faceEmbeddingsResult.rows
        .filter(fe => fe.media_id)
        .map(fe => fe.media_id);
      
      if (mediaIds.length > 0) {
        const mediaQuery = `
          SELECT id, file_name, file_path, file_size, mime_type, storage_type, url
          FROM media
          WHERE id = ANY($1)
        `;
        const mediaResult = await db.query(mediaQuery, [mediaIds]);
        mediaResult.rows.forEach(media => {
          bucket.medias[media.id] = media;
        });
      }
    }
  }
  
  // Fetch text data if any
  if (textDataIds.length > 0) {
    const textDataQuery = `
      SELECT id, created_at, updated_at, content
      FROM entity_type__text_data
      WHERE id = ANY($1)
    `;
    const textDataResult = await db.query(textDataQuery, [textDataIds]);
    textDataResult.rows.forEach(td => {
      bucket.entity_type_text_data[td.id] = td;
    });
  }
  
  // Fetch image data if any
  if (imageDataIds.length > 0) {
    const imageDataQuery = `
      SELECT id, created_at, updated_at, media_id
      FROM entity_type__image_data
      WHERE id = ANY($1)
    `;
    const imageDataResult = await db.query(imageDataQuery, [imageDataIds]);
    imageDataResult.rows.forEach(id => {
      bucket.entity_type_image_data[id.id] = id;
    });
    
    // Fetch media for images
    const imageMediaIds = imageDataResult.rows
      .filter(id => id.media_id)
      .map(id => id.media_id);
    
    if (imageMediaIds.length > 0) {
      const mediaQuery = `
        SELECT id, file_name, file_path, file_size, mime_type, storage_type, url
        FROM media
        WHERE id = ANY($1)
      `;
      const mediaResult = await db.query(mediaQuery, [imageMediaIds]);
      mediaResult.rows.forEach(media => {
        bucket.medias[media.id] = media;
      });
    }
  }
  
  return {
    bucket,
    data: entityIds,
  };
}