import { useEffect, useCallback, useMemo } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { Entity, Relation, EntityTypeFacialData, EntityTypeTextData, BucketedResponse, Bucket } from '@/db/types';
import { bucketStore, bucketActions, bucketSelectors } from '@/stores/bucketStore';

// Generic state type for CRUD operations
type CrudState<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
};

// API Layer - Extracted database operations
const api = {
  // Generic fetch helper
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Entity operations
  entities: {
    async fetchAll(): Promise<BucketedResponse<string[]>> {
      return api.fetch('/api/entities');
    },
    async create(input: { type_facial_data_id?: string; type_text_data_id?: string }) {
      return api.fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    async update(id: string, input: { type_facial_data_id?: string | null; type_text_data_id?: string | null }) {
      return api.fetch(`/api/entities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    async delete(id: string) {
      return api.fetch(`/api/entities/${id}`, { method: 'DELETE' });
    }
  },

  // Relation operations
  relations: {
    async fetchAll() {
      return api.fetch<{ relations: Relation[] }>('/api/relations');
    },
    async fetchByEntity(entityId: string) {
      return api.fetch<{ relations: Relation[] }>(`/api/relations?entity=${entityId}`);
    },
    async create(input: {
      subject_entity_id?: string;
      subject_relation_id?: string;
      predicate: string;
      object_entity_id?: string;
      object_relation_id?: string;
    }) {
      return api.fetch<{ relation: Relation }>('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    async update(id: string, input: Partial<Relation>) {
      return api.fetch<{ relation: Relation }>(`/api/relations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },
    async delete(id: string) {
      return api.fetch(`/api/relations/${id}`, { method: 'DELETE' });
    }
  },

  // Entity type data operations
  entityTypes: {
    async getTextData(id: string): Promise<EntityTypeTextData | null> {
      try {
        const data = await api.fetch<{ textData: EntityTypeTextData }>(`/api/entity-types/text/${id}`);
        return data.textData;
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('404')) return null;
        throw error;
      }
    },
    async getFacialData(id: string): Promise<EntityTypeFacialData | null> {
      try {
        const data = await api.fetch<{ facialData: EntityTypeFacialData }>(`/api/entity-types/facial/${id}`);
        return data.facialData;
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('404')) return null;
        throw error;
      }
    }
  },

  // AI analysis operations
  ai: {
    async analyze(type: 'all' | 'importance' | 'patterns' | 'clusters' | 'suggestions' = 'all') {
      return api.fetch<{ results: unknown }>('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    },
    async search(query: string) {
      return api.fetch<{ results: unknown }>(`/api/ai/search?q=${encodeURIComponent(query)}`);
    }
  }
};

// State proxies
const entitiesState = proxy<{
  entityIds: string[];
  loading: boolean;
  error: Error | null;
}>({
  entityIds: [],
  loading: true,
  error: null
});

const relationsState = proxy<CrudState<Relation>>({
  data: [],
  loading: true,
  error: null
});

const loadingState = proxy<{
  [key: string]: boolean;
}>({
  entityTypeData: false,
  aiAnalysis: false
});

const errorState = proxy<{
  [key: string]: Error | null;
}>({
  entityTypeData: null,
  aiAnalysis: null
});

// Helper hook for common loading and error handling
function useAsyncOperation<TArgs extends unknown[], TReturn>(
  operation: (...args: TArgs) => Promise<TReturn>,
  options?: {
    onSuccess?: (result: TReturn) => void;
    onError?: (error: Error) => void;
  }
) {
  const execute = useCallback(async (...args: TArgs) => {
    try {
      const result = await operation(...args);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      options?.onError?.(error);
      throw error;
    }
  }, [operation, options]);

  return execute;
}

// Custom hook for entity operations
function useEntityOperations() {
  const fetchEntities = useAsyncOperation<[], void>(
    async () => {
      entitiesState.loading = true;
      bucketActions.setLoading(true);
      try {
        const data = await api.entities.fetchAll();
        bucketActions.setBucket(data.bucket);
        entitiesState.entityIds = data.data;
        entitiesState.error = null;
      } finally {
        entitiesState.loading = false;
        bucketActions.setLoading(false);
      }
    },
    {
      onError: (err) => {
        entitiesState.error = err;
        bucketActions.setError(err);
      }
    }
  );

  const createEntity = useAsyncOperation<[{ type_facial_data_id?: string; type_text_data_id?: string }], Entity>(
    async (input) => {
      const data = await api.entities.create(input);
      if (data.entity) {
        bucketActions.addEntity(data.entity);
        entitiesState.entityIds = [...entitiesState.entityIds, data.entity.id];
      }
      await fetchEntities();
      return data.entity;
    },
    {
      onError: (err) => {
        entitiesState.error = err;
      }
    }
  );

  const updateEntity = useAsyncOperation<[string, { type_facial_data_id?: string | null; type_text_data_id?: string | null }], Entity>(
    async (id, input) => {
      const data = await api.entities.update(id, input);
      if (data.entity) {
        bucketActions.updateEntity(id, data.entity);
      }
      await fetchEntities();
      return data.entity;
    },
    {
      onError: (err) => {
        entitiesState.error = err;
      }
    }
  );

  const deleteEntity = useAsyncOperation<[string], boolean>(
    async (id) => {
      await api.entities.delete(id);
      bucketActions.removeEntity(id);
      entitiesState.entityIds = entitiesState.entityIds.filter(entityId => entityId !== id);
      await fetchEntities();
      return true;
    },
    {
      onError: (err) => {
        entitiesState.error = err;
      }
    }
  );

  return {
    fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
}

// Custom hook for entity data transformation
function useEntityDataTransform(entityIds: string[], bucket: Bucket | null) {
  return useMemo(() => {
    if (!bucket) return [];
    
    return entityIds
      .map(id => {
        const entity = bucketSelectors.getEntity(id);
        if (!entity) return null;
        
        const textContent = bucketSelectors.getEntityTextContent(entity);
        
        return {
          ...entity,
          text_content: textContent
        };
      })
      .filter(Boolean) as (Entity & { text_content?: string })[];
  }, [bucket, entityIds]);
}

export function useEntities() {
  const snapshot = useSnapshot(entitiesState);
  const bucketSnapshot = useSnapshot(bucketStore);
  const { fetchEntities, createEntity, updateEntity, deleteEntity } = useEntityOperations();
  
  const entitiesWithTextContent = useEntityDataTransform(
    snapshot.entityIds, 
    bucketSnapshot.bucket
  );

  useEffect(() => {
    fetchEntities();
  }, []); // Remove fetchEntities dependency to run only once on mount

  return {
    bucket: bucketSnapshot.bucket,
    entities: entitiesWithTextContent,
    loading: snapshot.loading || bucketSnapshot.loading,
    error: snapshot.error || bucketSnapshot.error,
    refetch: fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
}


// Custom hook for relation operations
function useRelationOperations() {
  const setLoading = (loading: boolean) => {
    relationsState.loading = loading;
  };

  const setError = (error: Error | null) => {
    relationsState.error = error;
  };

  const fetchRelations = useAsyncOperation<[], void>(
    async () => {
      setLoading(true);
      try {
        const data = await api.relations.fetchAll();
        relationsState.data = data.relations;
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    { onError: setError }
  );

  const createRelation = useAsyncOperation<[{
    subject_entity_id?: string;
    subject_relation_id?: string;
    predicate: string;
    object_entity_id?: string;
    object_relation_id?: string;
  }], Relation>(
    async (input) => {
      const data = await api.relations.create(input);
      relationsState.data = [...relationsState.data, data.relation];
      return data.relation;
    },
    { onError: setError }
  );

  const updateRelation = useAsyncOperation<[string, Partial<Relation>], Relation>(
    async (id, input) => {
      const data = await api.relations.update(id, input);
      if (data.relation) {
        relationsState.data = relationsState.data.map(r => 
          r.id === id ? data.relation : r
        );
      }
      return data.relation;
    },
    { onError: setError }
  );

  const deleteRelation = useAsyncOperation<[string], boolean>(
    async (id) => {
      await api.relations.delete(id);
      relationsState.data = relationsState.data.filter(r => r.id !== id);
      return true;
    },
    { onError: setError }
  );

  const getRelationsByEntity = useAsyncOperation<[string], Relation[]>(
    async (entityId) => {
      const data = await api.relations.fetchByEntity(entityId);
      return data.relations;
    },
    { onError: setError }
  );

  return {
    fetchRelations,
    createRelation,
    updateRelation,
    deleteRelation,
    getRelationsByEntity
  };
}

export function useRelations() {
  const snapshot = useSnapshot(relationsState);
  const operations = useRelationOperations();

  useEffect(() => {
    operations.fetchRelations();
  }, []); // Remove dependency to run only once on mount

  return {
    relations: snapshot.data,
    loading: snapshot.loading,
    error: snapshot.error,
    refetch: operations.fetchRelations,
    ...operations
  };
}

// Custom hook for entity type data operations
function useEntityTypeOperations() {
  const setLoading = (loading: boolean) => {
    loadingState.entityTypeData = loading;
  };

  const setError = (error: Error | null) => {
    errorState.entityTypeData = error;
  };

  const getTextData = useAsyncOperation<[string], EntityTypeTextData | null>(
    async (id: string) => {
      setLoading(true);
      try {
        const result = await api.entityTypes.getTextData(id);
        setError(null);
        return result;
      } finally {
        setLoading(false);
      }
    },
    { onError: setError }
  );

  const getFacialData = useAsyncOperation<[string], EntityTypeFacialData | null>(
    async (id: string) => {
      setLoading(true);
      try {
        const result = await api.entityTypes.getFacialData(id);
        setError(null);
        return result;
      } finally {
        setLoading(false);
      }
    },
    { onError: setError }
  );

  return { getTextData, getFacialData };
}

export function useEntityTypeData() {
  const loadingSnapshot = useSnapshot(loadingState);
  const errorSnapshot = useSnapshot(errorState);
  const operations = useEntityTypeOperations();

  return {
    ...operations,
    loading: loadingSnapshot.entityTypeData,
    error: errorSnapshot.entityTypeData
  };
}

// Custom hook for AI analysis operations
function useAIOperations() {
  const setLoading = (loading: boolean) => {
    loadingState.aiAnalysis = loading;
  };

  const setError = (error: Error | null) => {
    errorState.aiAnalysis = error;
  };

  const analyze = useAsyncOperation<[type?: 'all' | 'importance' | 'patterns' | 'clusters' | 'suggestions'], unknown>(
    async (type = 'all') => {
      setLoading(true);
      try {
        const data = await api.ai.analyze(type);
        setError(null);
        return data.results;
      } finally {
        setLoading(false);
      }
    },
    { onError: setError }
  );

  const search = useAsyncOperation<[string], unknown>(
    async (query: string) => {
      setLoading(true);
      try {
        const data = await api.ai.search(query);
        setError(null);
        return data.results;
      } finally {
        setLoading(false);
      }
    },
    { onError: setError }
  );

  return { analyze, search };
}

export function useAIAnalysis() {
  const loadingSnapshot = useSnapshot(loadingState);
  const errorSnapshot = useSnapshot(errorState);
  const operations = useAIOperations();

  return {
    ...operations,
    loading: loadingSnapshot.aiAnalysis,
    error: errorSnapshot.aiAnalysis
  };
}