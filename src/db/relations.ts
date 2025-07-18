import { DatabaseClient } from './client';
import { Relation, CreateRelationInput, UpdateRelationInput } from './types';

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

  const query = `
    INSERT INTO relations (
      subject_entity_id, subject_relation_id, 
      predicate, 
      object_entity_id, object_relation_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, created_at, subject_entity_id, subject_relation_id, 
              predicate, object_entity_id, object_relation_id
  `;

  const result = await db.query(query, [
    input.subject_entity_id || null,
    input.subject_relation_id || null,
    input.predicate,
    input.object_entity_id || null,
    input.object_relation_id || null,
  ]);

  return result.rows[0];
}

export async function dbGetRelation(
  db: DatabaseClient,
  id: string
): Promise<Relation | null> {
  const query = `
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
    SELECT id, created_at, subject_entity_id, subject_relation_id, 
           predicate, object_entity_id, object_relation_id
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
  const setClause: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.subject_entity_id !== undefined) {
    setClause.push(`subject_entity_id = $${paramCount}`);
    values.push(input.subject_entity_id);
    paramCount++;
  }

  if (input.subject_relation_id !== undefined) {
    setClause.push(`subject_relation_id = $${paramCount}`);
    values.push(input.subject_relation_id);
    paramCount++;
  }

  if (input.predicate !== undefined) {
    setClause.push(`predicate = $${paramCount}`);
    values.push(input.predicate);
    paramCount++;
  }

  if (input.object_entity_id !== undefined) {
    setClause.push(`object_entity_id = $${paramCount}`);
    values.push(input.object_entity_id);
    paramCount++;
  }

  if (input.object_relation_id !== undefined) {
    setClause.push(`object_relation_id = $${paramCount}`);
    values.push(input.object_relation_id);
    paramCount++;
  }

  if (setClause.length === 0) {
    return dbGetRelation(db, id);
  }

  values.push(id);

  const query = `
    UPDATE relations
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, created_at, subject_entity_id, subject_relation_id, 
              predicate, object_entity_id, object_relation_id
  `;

  const result = await db.query(query, values);
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