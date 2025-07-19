export interface EntityTypeFacialData {
  id: string;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface EntityTypeTextData {
  id: string;
  created_at: Date;
  updated_at: Date;
  content: string;
}

export interface Entity {
  id: string;
  created_at: Date | null;
  type_facial_data_id: string | null;
  type_text_data_id: string | null;
}

export interface Relation {
  id: string;
  created_at: Date | null;
  subject_entity_id: string | null;
  subject_relation_id: string | null;
  predicate: string;
  object_entity_id: string | null;
  object_relation_id: string | null;
}

export interface CreateEntityInput {
  type_facial_data_id?: string;
  type_text_data_id?: string;
}

export interface CreateRelationInput {
  subject_entity_id?: string;
  subject_relation_id?: string;
  predicate: string;
  object_entity_id?: string;
  object_relation_id?: string;
}

export interface UpdateEntityInput {
  type_facial_data_id?: string | null;
  type_text_data_id?: string | null;
}

export interface UpdateRelationInput {
  subject_entity_id?: string | null;
  subject_relation_id?: string | null;
  predicate?: string;
  object_entity_id?: string | null;
  object_relation_id?: string | null;
}