export interface Bucket {
  medias: Record<string, Media>;
  face_embeddings: Record<string, FaceEmbedding>;
  entity_type_facial_data: Record<string, EntityTypeFacialData>;
  entity_type_text_data: Record<string, EntityTypeTextData>;
  entity_type_image_data: Record<string, EntityTypeImageData>;
  entity_type_image_portion_data: Record<string, EntityTypeImagePortion>;
  entities: Record<string, Entity>;
  relations: Record<string, Relation>;
}

export interface BucketedResponse<T> {
  bucket: Bucket;
  data: T;
}

export interface Media {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_type: string;
  url: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface FaceEmbedding {
  id: string;
  embedding_vector: number[];
  embedding_dimension: number;
  model_name: string;
  model_version: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface EntityTypeFacialData {
  id: string;
  created_at: Date | null;
  updated_at: Date | null;
  face_embedding_id: string | null;
  face_cropped_picture_id: string | null;
}

export interface EntityTypeTextData {
  id: string;
  created_at: Date;
  updated_at: Date;
  content: string;
}

export interface EntityTypeImageData {
  id: string;
  created_at: Date;
  updated_at: Date;
  media_id: string;
  caption: string | null;
  alt_text: string | null;
  tags: string[] | null;
  ocr_text: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  file_size_bytes: number | null;
}

export interface EntityTypeImagePortion {
  id: string;
  created_at: Date;
  updated_at: Date;
  source_image_entity_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
  confidence: number | null;
}

export interface Entity {
  id: string;
  created_at: Date | null;
  type_facial_data_id: string | null;
  type_text_data_id: string | null;
  type_image_data_id: string | null;
  type_image_portion_id: string | null;
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

export interface CreateNothingDataEntityInput {
  type_facial_data_id?: never;
  type_text_data_id?: never;
  type_image_data_id?: never;
  type_image_portion_id?: never;
}

export interface CreateFaceDataEntityInput extends Omit<CreateNothingDataEntityInput, 'type_facial_data_id'> {
  type_facial_data_id: string;
}

export interface CreateTextDataEntityInput extends Omit<CreateNothingDataEntityInput, 'type_text_data_id'> {
  type_text_data_id: string;
}

export interface CreateImageDataEntityInput extends Omit<CreateNothingDataEntityInput, 'type_image_data_id'> {
  type_image_data_id: string;
}

export interface CreateImagePortionEntityInput extends Omit<CreateNothingDataEntityInput, 'type_image_portion_id'> {
  type_image_portion_id: string;
}

export type CreateEntityInput = CreateFaceDataEntityInput | CreateTextDataEntityInput | CreateImageDataEntityInput | CreateImagePortionEntityInput;


export interface CreateRelationNoSubjectInput {
  subject_entity_id?: never;
  subject_relation_id?: never;
}

export interface CreateRelationNoObjectInput {
  object_entity_id?: never;
  object_relation_id?: never;
}

export interface CreateRelationEntitySubjectInput extends Omit<CreateRelationNoSubjectInput, 'subject_entity_id'> {
  subject_entity_id: string;
}

export interface CreateRelationRelationSubjectInput extends Omit<CreateRelationNoSubjectInput, 'subject_relation_id'> {
  subject_relation_id: string;
}

export interface CreateRelationEntityObjectInput extends Omit<CreateRelationNoObjectInput, 'object_entity_id'> {
  object_entity_id: string;
}

export interface CreateRelationRelationObjectInput extends Omit<CreateRelationNoObjectInput, 'object_relation_id'> {
  object_relation_id: string;
}

export type CreateRelationInput = 
  & { predicate: string }
  & (CreateRelationEntitySubjectInput | CreateRelationRelationSubjectInput)
  & (CreateRelationEntityObjectInput | CreateRelationRelationObjectInput);

export interface UpdateEntityInput {
  type_facial_data_id?: string | null;
  type_text_data_id?: string | null;
  type_image_data_id?: string | null;
  type_image_portion_id?: string | null;
}

export interface UpdateRelationInput {
  subject_entity_id?: string | null;
  subject_relation_id?: string | null;
  predicate?: string;
  object_entity_id?: string | null;
  object_relation_id?: string | null;
}
