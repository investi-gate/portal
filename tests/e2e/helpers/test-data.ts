import { Entity, Relation } from '@/db/types';

export const mockEntities: Entity[] = [
  {
    id: 'entity-1',
    type_facial_data_id: 'face-1',
    type_text_data_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entity-2',
    type_facial_data_id: null,
    type_text_data_id: 'text-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'entity-3',
    type_facial_data_id: 'face-3',
    type_text_data_id: 'text-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockRelations: Relation[] = [
  {
    id: 'relation-1',
    subject_entity_id: 'entity-1',
    predicate: 'knows',
    object_entity_id: 'entity-2',
    certainty_factor: 0.85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'relation-2',
    subject_entity_id: 'entity-2',
    predicate: 'works_with',
    object_entity_id: 'entity-3',
    certainty_factor: 0.95,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function generateEntity(overrides?: Partial<Entity>): Entity {
  const id = `entity-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    type_facial_data_id: Math.random() > 0.5 ? `face-${id}` : null,
    type_text_data_id: Math.random() > 0.5 ? `text-${id}` : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function generateRelation(overrides?: Partial<Relation>): Relation {
  const id = `relation-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    subject_entity_id: `entity-${Math.random().toString(36).substr(2, 9)}`,
    predicate: 'relates_to',
    object_entity_id: `entity-${Math.random().toString(36).substr(2, 9)}`,
    certainty_factor: Math.random(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}