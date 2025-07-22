import { DatabaseClient } from './client';
import { Relation, CreateRelationInput, UpdateRelationInput } from './types';
import { buildInsertPlaceholders, buildUpdateSetClause } from '@/utils/sql-helpers';

const relationColumns = ['id', 'created_at', 'subject_entity_id', 'subject_relation_id', 'predicate', 'object_entity_id', 'object_relation_id'];
const relationColumnsStr = relationColumns.join(', ');

export async function dbCreateRelation(
  db: DatabaseClient,
  input: CreateRelationInput
): Promise<Relation> {
  const hasValidSubject = (input.subject_entity_id && !input.subject_relation_id) ||
                         (!input.subject_entity_id && input.subject_relation_id);
  const hasValidObject = (input.object_entity_id && !input.object_relation_id) ||
                        (!input.object_entity_id && input.object_relation_id);

  if (!hasValidSubject || !hasValidObject) {
    throw new Error('Relation must have exactly one subject type and one object type');
  }

  const { placeholders, values, cols } = buildInsertPlaceholders({
    subject_entity_id: input.subject_entity_id || null,
    subject_relation_id: input.subject_relation_id || null,
    predicate: input.predicate,
    object_entity_id: input.object_entity_id || null,
    object_relation_id: input.object_relation_id || null,
  });

  const query = `
    INSERT INTO relations (${cols})
    VALUES (${placeholders})
    RETURNING ${relationColumnsStr}
  `;

  const result = await db.query(query, [...values]);

  return result.rows[0];
}

export async function dbGetRelation(
  db: DatabaseClient,
  id: string
): Promise<Relation | null> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

export async function dbGetAllRelations(
  db: DatabaseClient,
  limit = 100,
  offset = 0
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await db.query(query, [limit, offset]);
  return result.rows;
}

export async function dbGetRelationsByEntityId(
  db: DatabaseClient,
  entityId: string
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE subject_entity_id = $1 OR object_entity_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [entityId]);
  return result.rows;
}

export async function dbGetRelationsBySubjectEntityId(
  db: DatabaseClient,
  entityId: string
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE subject_entity_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [entityId]);
  return result.rows;
}

export async function dbGetRelationsByObjectEntityId(
  db: DatabaseClient,
  entityId: string
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE object_entity_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [entityId]);
  return result.rows;
}

export async function dbGetRelationsByPredicate(
  db: DatabaseClient,
  predicate: string
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE predicate = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [predicate]);
  return result.rows;
}

export async function dbGetRelationsByRelationId(
  db: DatabaseClient,
  relationId: string
): Promise<Relation[]> {
  const query = `
    SELECT ${relationColumnsStr}
    FROM relations
    WHERE subject_relation_id = $1 OR object_relation_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [relationId]);
  return result.rows;
}

export async function dbUpdateRelation(
  db: DatabaseClient,
  id: string,
  input: UpdateRelationInput
): Promise<Relation | null> {
  const { setClause, values, nextParamIndex } = buildUpdateSetClause({
    subject_entity_id: input.subject_entity_id,
    subject_relation_id: input.subject_relation_id,
    predicate: input.predicate,
    object_entity_id: input.object_entity_id,
    object_relation_id: input.object_relation_id,
  });

  if (setClause.length === 0) {
    return dbGetRelation(db, id);
  }

  const query = `
    UPDATE relations
    SET ${setClause}
    WHERE id = $${nextParamIndex}
    RETURNING ${relationColumnsStr}
  `;

  const result = await db.query(query, [...values, id]);
  return result.rows[0] || null;
}

export async function dbDeleteRelation(
  db: DatabaseClient,
  id: string
): Promise<boolean> {
  const query = `DELETE FROM relations WHERE id = $1`;
  const result = await db.query(query, [id]);
  return result.rowCount > 0;
}