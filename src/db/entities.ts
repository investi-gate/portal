import { DatabaseClient } from './client';
import { Entity, CreateEntityInput, UpdateEntityInput, Bucket, BucketedResponse } from './types';
import {buildInsertPlaceholders, buildUpdateSetClause} from "@/utils/sql-helpers";
import { dbGetFacialDataByIds } from './entity_type_facial_data';
import { dbGetFaceEmbeddingByIds } from './face_embeddings';
import { dbGetMediaByIds } from './media';
import { dbGetTextDataByIds } from './entity_type_text_data';
import { dbGetImageDataByIds } from './entity_type_image_data';
import { dbGetImagePortionByIds } from './entity_type_image_portion';

const entityColumns = ['id', 'created_at', 'type_facial_data_id', 'type_text_data_id', 'type_image_data_id', 'type_image_portion_id'];
const entityColumnsStr = entityColumns.join(', ');

export async function dbCreateEntity(
  db: DatabaseClient,
  input: CreateEntityInput
): Promise<Entity> {
  const { placeholders, values, cols } = buildInsertPlaceholders({
    type_facial_data_id: input.type_facial_data_id,
    type_text_data_id: input.type_text_data_id,
    type_image_data_id: input.type_image_data_id,
    type_image_portion_id: input.type_image_portion_id,
  });

  // If there is not valid input - constraint will fail.
  const result = await db.query(`
    INSERT INTO entities (${cols})
    VALUES (${placeholders})
    RETURNING ${entityColumnsStr}
  `, [...values]);

  return result.rows[0];
}

export async function dbGetEntity(
  db: DatabaseClient,
  id: string
): Promise<Entity | null> {
  const result = await db.query(`
    SELECT ${entityColumnsStr}
    FROM entities
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllEntities(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<Entity[]> {
  const query = `
    SELECT ${entityColumnsStr}
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
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    type_facial_data_id: input.type_facial_data_id,
    type_text_data_id: input.type_text_data_id,
    type_image_data_id: input.type_image_data_id,
    type_image_portion_id: input.type_image_portion_id,
  });

  if (setClause.length === 0) {
    return dbGetEntity(db, id);
  }

  const query = `
    UPDATE entities
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${entityColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteEntity(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  // Use a transaction to ensure data consistency
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // First, we need to handle cascading deletion of relations
    // This is complex because relations can reference other relations
    // We'll use a recursive CTE to find all dependent relations
    const deleteDependentRelationsQuery = `
      WITH RECURSIVE dependent_relations AS (
        -- Base case: relations that directly reference the entity
        SELECT id 
        FROM relations 
        WHERE subject_entity_id = $1 OR object_entity_id = $1
        
        UNION
        
        -- Recursive case: relations that reference other relations we're deleting
        SELECT r.id
        FROM relations r
        INNER JOIN dependent_relations dr ON 
          r.subject_relation_id = dr.id OR r.object_relation_id = dr.id
      )
      DELETE FROM relations
      WHERE id IN (SELECT id FROM dependent_relations)
    `;

    await client.query(deleteDependentRelationsQuery, [id]);

    // Then delete the entity itself
    const deleteEntityQuery = `DELETE FROM entities WHERE id = $1`;
    const result = await client.query(deleteEntityQuery, [id]);

    await client.query('COMMIT');

    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function dbGetAllEntitiesWithBucket(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<BucketedResponse<string[]>> {
  // First get all entities
  const entitiesQuery = `
    SELECT ${entityColumnsStr}
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
  const imagePortionIds = entities
    .filter(e => e.type_image_portion_id)
    .map(e => e.type_image_portion_id);

  // Initialize bucket
  const bucket: Bucket = {
    medias: {},
    face_embeddings: {},
    entity_type_facial_data: {},
    entity_type_text_data: {},
    entity_type_image_data: {},
    entity_type_image_portion_data: {},
    entities: {},
    relations: {},
  };

  // Add entities to bucket
  entities.forEach(entity => {
    bucket.entities[entity.id] = entity;
  });

  // Fetch facial data if any
  if (facialDataIds.length > 0) {
    const facialDataRows = await dbGetFacialDataByIds(db, facialDataIds);
    facialDataRows.forEach(fd => {
      bucket.entity_type_facial_data[fd.id] = fd;
    });

    // Fetch face embeddings
    const faceEmbeddingIds = facialDataRows
      .filter(fd => fd.face_embedding_id)
      .map(fd => fd.face_embedding_id);

    if (faceEmbeddingIds.length > 0) {
      const faceEmbeddingsRows = await dbGetFaceEmbeddingByIds(db, faceEmbeddingIds);
      faceEmbeddingsRows.forEach(fe => {
        bucket.face_embeddings[fe.id] = fe;
      });

      // Fetch media
      const mediaIds = faceEmbeddingsRows
        .filter(fe => fe.media_id)
        .map(fe => fe.media_id);

      if (mediaIds.length > 0) {
        const mediaRows = await dbGetMediaByIds(db, mediaIds);
        mediaRows.forEach(media => {
          bucket.medias[media.id] = media;
        });
      }
    }
  }

  // Fetch text data if any
  if (textDataIds.length > 0) {
    const textDataRows = await dbGetTextDataByIds(db, textDataIds);
    textDataRows.forEach(td => {
      bucket.entity_type_text_data[td.id] = td;
    });
  }

  // Fetch image data if any
  if (imageDataIds.length > 0) {
    const imageDataRows = await dbGetImageDataByIds(db, imageDataIds);
    imageDataRows.forEach(id => {
      bucket.entity_type_image_data[id.id] = id;
    });

    // Fetch media for images
    const imageMediaIds = imageDataRows
      .filter(id => id.media_id)
      .map(id => id.media_id);

    if (imageMediaIds.length > 0) {
      const mediaRows = await dbGetMediaByIds(db, imageMediaIds);
      mediaRows.forEach(media => {
        bucket.medias[media.id] = media;
      });
    }
  }

  // Fetch image portions if any
  if (imagePortionIds.length > 0) {
    const imagePortionRows = await dbGetImagePortionByIds(db, imagePortionIds);
    imagePortionRows.forEach(ip => {
      bucket.entity_type_image_portion_data[ip.id] = ip;
    });
  }

  return {
    bucket,
    data: entityIds,
  };
}
