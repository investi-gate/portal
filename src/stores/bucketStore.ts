import { proxy, subscribe } from 'valtio';
import { Bucket, Entity, Relation, Media, FaceEmbedding, EntityTypeFacialData, EntityTypeTextData, EntityTypeImageData, EntityTypeImagePortionData } from '@/db/types';

interface BucketStore {
  bucket: Bucket | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export const bucketStore = proxy<BucketStore>({
  bucket: null,
  loading: false,
  error: null,
  lastUpdated: null,
});

export const bucketActions = {
  setBucket(bucket: Bucket | null) {
    bucketStore.bucket = bucket;
    bucketStore.lastUpdated = bucket ? new Date() : null;
    bucketStore.error = null;
  },

  setLoading(loading: boolean) {
    bucketStore.loading = loading;
  },

  setError(error: Error | null) {
    bucketStore.error = error;
  },

  updateEntity(entityId: string, entity: Partial<Entity>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.entities[entityId]) {
      bucketStore.bucket.entities[entityId] = {
        ...bucketStore.bucket.entities[entityId],
        ...entity,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addEntity(entity: Entity) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.entities[entity.id] = entity;
    bucketStore.lastUpdated = new Date();
  },

  removeEntity(entityId: string) {
    if (!bucketStore.bucket) return;
    
    delete bucketStore.bucket.entities[entityId];
    bucketStore.lastUpdated = new Date();
  },

  updateRelation(relationId: string, relation: Partial<Relation>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.relations[relationId]) {
      bucketStore.bucket.relations[relationId] = {
        ...bucketStore.bucket.relations[relationId],
        ...relation,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addRelation(relation: Relation) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.relations[relation.id] = relation;
    bucketStore.lastUpdated = new Date();
  },

  removeRelation(relationId: string) {
    if (!bucketStore.bucket) return;
    
    delete bucketStore.bucket.relations[relationId];
    bucketStore.lastUpdated = new Date();
  },

  updateMedia(mediaId: string, media: Partial<Media>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.medias[mediaId]) {
      bucketStore.bucket.medias[mediaId] = {
        ...bucketStore.bucket.medias[mediaId],
        ...media,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addMedia(media: Media) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.medias[media.id] = media;
    bucketStore.lastUpdated = new Date();
  },

  updateFaceEmbedding(embeddingId: string, embedding: Partial<FaceEmbedding>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.face_embeddings[embeddingId]) {
      bucketStore.bucket.face_embeddings[embeddingId] = {
        ...bucketStore.bucket.face_embeddings[embeddingId],
        ...embedding,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  updateEntityTypeTextData(dataId: string, data: Partial<EntityTypeTextData>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.entity_type_text_data[dataId]) {
      bucketStore.bucket.entity_type_text_data[dataId] = {
        ...bucketStore.bucket.entity_type_text_data[dataId],
        ...data,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addEntityTypeTextData(data: EntityTypeTextData) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.entity_type_text_data[data.id] = data;
    bucketStore.lastUpdated = new Date();
  },

  updateEntityTypeFacialData(dataId: string, data: Partial<EntityTypeFacialData>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.entity_type_facial_data[dataId]) {
      bucketStore.bucket.entity_type_facial_data[dataId] = {
        ...bucketStore.bucket.entity_type_facial_data[dataId],
        ...data,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addEntityTypeFacialData(data: EntityTypeFacialData) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.entity_type_facial_data[data.id] = data;
    bucketStore.lastUpdated = new Date();
  },

  updateEntityTypeImageData(dataId: string, data: Partial<EntityTypeImageData>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.entity_type_image_data[dataId]) {
      bucketStore.bucket.entity_type_image_data[dataId] = {
        ...bucketStore.bucket.entity_type_image_data[dataId],
        ...data,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addEntityTypeImageData(data: EntityTypeImageData) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.entity_type_image_data[data.id] = data;
    bucketStore.lastUpdated = new Date();
  },

  updateEntityTypeImagePortionData(dataId: string, data: Partial<EntityTypeImagePortionData>) {
    if (!bucketStore.bucket) return;
    
    if (bucketStore.bucket.entity_type_image_portion_data[dataId]) {
      bucketStore.bucket.entity_type_image_portion_data[dataId] = {
        ...bucketStore.bucket.entity_type_image_portion_data[dataId],
        ...data,
      };
      bucketStore.lastUpdated = new Date();
    }
  },

  addEntityTypeImagePortionData(data: EntityTypeImagePortionData) {
    if (!bucketStore.bucket) return;
    
    bucketStore.bucket.entity_type_image_portion_data[data.id] = data;
    bucketStore.lastUpdated = new Date();
  },

  mergeBucket(newBucket: Partial<Bucket>) {
    if (!bucketStore.bucket) {
      bucketStore.bucket = {
        entities: {},
        relations: {},
        medias: {},
        face_embeddings: {},
        entity_type_facial_data: {},
        entity_type_text_data: {},
        entity_type_image_data: {},
        entity_type_image_portion_data: {},
        ...newBucket,
      };
    } else {
      Object.assign(bucketStore.bucket, newBucket);
    }
    bucketStore.lastUpdated = new Date();
  },

  clear() {
    bucketStore.bucket = null;
    bucketStore.error = null;
    bucketStore.lastUpdated = null;
  },
};

export const bucketSelectors = {
  getEntity(entityId: string): Entity | undefined {
    return bucketStore.bucket?.entities[entityId];
  },

  getRelation(relationId: string): Relation | undefined {
    return bucketStore.bucket?.relations[relationId];
  },

  getMedia(mediaId: string): Media | undefined {
    return bucketStore.bucket?.medias[mediaId];
  },

  getEntityTextContent(entity: Entity): string | undefined {
    if (!entity.type_text_data_id || !bucketStore.bucket) return undefined;
    return bucketStore.bucket.entity_type_text_data[entity.type_text_data_id]?.content;
  },

  getEntityFacialData(entity: Entity): EntityTypeFacialData | undefined {
    if (!entity.type_facial_data_id || !bucketStore.bucket) return undefined;
    return bucketStore.bucket.entity_type_facial_data[entity.type_facial_data_id];
  },

  getEntityImageData(entity: Entity): EntityTypeImageData | undefined {
    if (!entity.type_image_data_id || !bucketStore.bucket) return undefined;
    return bucketStore.bucket.entity_type_image_data[entity.type_image_data_id];
  },

  getEntityImagePortionData(entity: Entity): EntityTypeImagePortionData | undefined {
    if (!entity.type_image_portion_data_id || !bucketStore.bucket) return undefined;
    return bucketStore.bucket.entity_type_image_portion_data[entity.type_image_portion_data_id];
  },

  getRelationsByEntity(entityId: string): Relation[] {
    if (!bucketStore.bucket) return [];
    
    return Object.values(bucketStore.bucket.relations).filter(
      relation => 
        relation.subject_entity_id === entityId || 
        relation.object_entity_id === entityId
    );
  },

  getAllEntities(): Entity[] {
    if (!bucketStore.bucket) return [];
    return Object.values(bucketStore.bucket.entities);
  },

  getAllRelations(): Relation[] {
    if (!bucketStore.bucket) return [];
    return Object.values(bucketStore.bucket.relations);
  },

  getAllMedias(): Media[] {
    if (!bucketStore.bucket) return [];
    return Object.values(bucketStore.bucket.medias);
  },
};

// Subscribe to changes for debugging
if (process.env.NODE_ENV === 'development') {
  subscribe(bucketStore, () => {
    console.log('[BucketStore] State changed:', {
      hasData: !!bucketStore.bucket,
      entityCount: bucketStore.bucket ? Object.keys(bucketStore.bucket.entities).length : 0,
      relationCount: bucketStore.bucket ? Object.keys(bucketStore.bucket.relations).length : 0,
      lastUpdated: bucketStore.lastUpdated,
    });
  });
}