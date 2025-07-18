import { Client } from 'pg';
import { Entity, Relation, EntityType } from '@/db/types';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/investi_gate_test?sslmode=disable';

export class TestDatabaseUtils {
  private client: Client;

  constructor() {
    this.client = new Client({ connectionString: TEST_DATABASE_URL });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  async clearAllData() {
    await this.client.query('DELETE FROM relations');
    await this.client.query('DELETE FROM entities');
  }

  async createEntity(entity: Partial<Entity> & { id: string }): Promise<Entity> {
    const result = await this.client.query<Entity>(
      `INSERT INTO entities (id, type_facial_data_id, type_text_data_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [entity.id, entity.type_facial_data_id || null, entity.type_text_data_id || null]
    );
    return result.rows[0];
  }

  async createEntities(entities: Array<Partial<Entity> & { id: string }>): Promise<Entity[]> {
    const createdEntities: Entity[] = [];
    for (const entity of entities) {
      const created = await this.createEntity(entity);
      createdEntities.push(created);
    }
    return createdEntities;
  }

  async createRelation(relation: Partial<Relation> & { 
    subject_entity_id: string;
    predicate: string;
    object_entity_id: string;
  }): Promise<Relation> {
    const result = await this.client.query<Relation>(
      `INSERT INTO relations (id, subject_entity_id, predicate, object_entity_id, certainty_factor) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        relation.id || `relation-${Date.now()}`,
        relation.subject_entity_id,
        relation.predicate,
        relation.object_entity_id,
        relation.certainty_factor || 1.0
      ]
    );
    return result.rows[0];
  }

  async createRelations(relations: Array<Partial<Relation> & {
    subject_entity_id: string;
    predicate: string;
    object_entity_id: string;
  }>): Promise<Relation[]> {
    const createdRelations: Relation[] = [];
    for (const relation of relations) {
      const created = await this.createRelation(relation);
      createdRelations.push(created);
    }
    return createdRelations;
  }

  async getEntityCount(): Promise<number> {
    const result = await this.client.query<{ count: string }>(
      'SELECT COUNT(*) FROM entities'
    );
    return parseInt(result.rows[0].count);
  }

  async getRelationCount(): Promise<number> {
    const result = await this.client.query<{ count: string }>(
      'SELECT COUNT(*) FROM relations'
    );
    return parseInt(result.rows[0].count);
  }

  async entityExists(id: string): Promise<boolean> {
    const result = await this.client.query(
      'SELECT EXISTS(SELECT 1 FROM entities WHERE id = $1)',
      [id]
    );
    return result.rows[0].exists;
  }

  async relationExists(id: string): Promise<boolean> {
    const result = await this.client.query(
      'SELECT EXISTS(SELECT 1 FROM relations WHERE id = $1)',
      [id]
    );
    return result.rows[0].exists;
  }
}

// Helper function to use in tests
export async function withTestDatabase<T>(
  callback: (db: TestDatabaseUtils) => Promise<T>
): Promise<T> {
  const db = new TestDatabaseUtils();
  try {
    await db.connect();
    return await callback(db);
  } finally {
    await db.disconnect();
  }
}

// Test data factories
export const testDataFactories = {
  entity: (overrides?: Partial<Entity>): Partial<Entity> & { id: string } => ({
    id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type_facial_data_id: Math.random() > 0.5 ? 'facial_data' : null,
    type_text_data_id: Math.random() > 0.5 ? 'text_data' : null,
    ...overrides,
  }),

  relation: (
    subjectId: string,
    objectId: string,
    overrides?: Partial<Relation>
  ): Partial<Relation> & {
    subject_entity_id: string;
    predicate: string;
    object_entity_id: string;
  } => ({
    id: `relation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    subject_entity_id: subjectId,
    predicate: 'relates_to',
    object_entity_id: objectId,
    certainty_factor: 0.8,
    ...overrides,
  }),

  investigationScenario: async (db: TestDatabaseUtils) => {
    // Create a typical investigation scenario
    const entities = await db.createEntities([
      { id: 'person-1', type_facial_data_id: 'facial_data', type_text_data_id: 'text_data' },
      { id: 'person-2', type_facial_data_id: 'facial_data', type_text_data_id: null },
      { id: 'person-3', type_facial_data_id: null, type_text_data_id: 'text_data' },
      { id: 'location-1', type_facial_data_id: null, type_text_data_id: 'text_data' },
      { id: 'event-1', type_facial_data_id: null, type_text_data_id: 'text_data' },
    ]);

    const relations = await db.createRelations([
      { subject_entity_id: 'person-1', predicate: 'knows', object_entity_id: 'person-2', certainty_factor: 0.9 },
      { subject_entity_id: 'person-2', predicate: 'knows', object_entity_id: 'person-3', certainty_factor: 0.7 },
      { subject_entity_id: 'person-1', predicate: 'visited', object_entity_id: 'location-1', certainty_factor: 1.0 },
      { subject_entity_id: 'person-3', predicate: 'attended', object_entity_id: 'event-1', certainty_factor: 0.8 },
      { subject_entity_id: 'event-1', predicate: 'occurred_at', object_entity_id: 'location-1', certainty_factor: 1.0 },
    ]);

    return { entities, relations };
  },
};