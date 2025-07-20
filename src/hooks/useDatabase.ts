import { useEffect, useCallback, useMemo } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { Entity, Relation, EntityTypeFacialData, EntityTypeTextData, BucketedResponse, Bucket } from '@/db/types';

// State proxies for each hook
const entitiesState = proxy<{
  bucket: Bucket | null;
  entityIds: string[];
  loading: boolean;
  error: Error | null;
}>({
  bucket: null,
  entityIds: [],
  loading: true,
  error: null
});

const relationsState = proxy<{
  relations: Relation[];
  loading: boolean;
  error: Error | null;
}>({
  relations: [],
  loading: true,
  error: null
});

const entityTypeDataState = proxy<{
  loading: boolean;
  error: Error | null;
}>({
  loading: false,
  error: null
});

const aiAnalysisState = proxy<{
  loading: boolean;
  error: Error | null;
}>({
  loading: false,
  error: null
});

export function useEntities() {
  const snapshot = useSnapshot(entitiesState);

  const fetchEntities = useCallback(async () => {
    try {
      entitiesState.loading = true;
      const response = await fetch('/api/entities');
      if (!response.ok) throw new Error('Failed to fetch entities');
      const data: BucketedResponse<string[]> = await response.json();
      entitiesState.bucket = data.bucket;
      entitiesState.entityIds = data.data;
      entitiesState.error = null;
    } catch (err) {
      entitiesState.error = err as Error;
    } finally {
      entitiesState.loading = false;
    }
  }, []);

  const createEntity = useCallback(async (input: {
    type_facial_data_id?: string;
    type_text_data_id?: string;
  }) => {
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create entity');
      }
      const data = await response.json();
      // Refetch to get updated bucket
      await fetchEntities();
      return data.entity;
    } catch (err) {
      entitiesState.error = err as Error;
      throw err;
    }
  }, [fetchEntities]);

  const updateEntity = useCallback(async (id: string, input: {
    type_facial_data_id?: string | null;
    type_text_data_id?: string | null;
  }) => {
    try {
      const response = await fetch(`/api/entities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to update entity');
      const data = await response.json();
      // Refetch to get updated bucket
      await fetchEntities();
      return data.entity;
    } catch (err) {
      entitiesState.error = err as Error;
      throw err;
    }
  }, [fetchEntities]);

  const deleteEntity = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/entities/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete entity');
      // Refetch to get updated bucket
      await fetchEntities();
      return true;
    } catch (err) {
      entitiesState.error = err as Error;
      throw err;
    }
  }, [fetchEntities]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Helper to get entities with their text content
  const entitiesWithTextContent = useMemo(() => {
    if (!snapshot.bucket) return [];
    
    return snapshot.entityIds.map(id => {
      const entity = snapshot.bucket.entities[id];
      if (!entity) return null;
      
      const textContent = entity.type_text_data_id 
        ? snapshot.bucket.entity_type_text_data[entity.type_text_data_id]?.content 
        : undefined;
      
      return {
        ...entity,
        text_content: textContent
      };
    }).filter(Boolean) as (Entity & { text_content?: string })[];
  }, [snapshot.bucket, snapshot.entityIds]);

  return {
    bucket: snapshot.bucket,
    entities: entitiesWithTextContent,
    loading: snapshot.loading,
    error: snapshot.error,
    refetch: fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
}


export function useRelations() {
  const snapshot = useSnapshot(relationsState);

  const fetchRelations = useCallback(async () => {
    try {
      relationsState.loading = true;
      const response = await fetch('/api/relations');
      if (!response.ok) throw new Error('Failed to fetch relations');
      const data = await response.json();
      relationsState.relations = data.relations;
      relationsState.error = null;
    } catch (err) {
      relationsState.error = err as Error;
    } finally {
      relationsState.loading = false;
    }
  }, []);

  const createRelation = useCallback(async (input: {
    subject_entity_id?: string;
    subject_relation_id?: string;
    predicate: string;
    object_entity_id?: string;
    object_relation_id?: string;
  }) => {
    try {
      const response = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to create relation');
      const data = await response.json();
      relationsState.relations = [...relationsState.relations, data.relation];
      return data.relation;
    } catch (err) {
      relationsState.error = err as Error;
      throw err;
    }
  }, []);

  const updateRelation = useCallback(async (id: string, input: {
    subject_entity_id?: string | null;
    subject_relation_id?: string | null;
    predicate?: string;
    object_entity_id?: string | null;
    object_relation_id?: string | null;
  }) => {
    try {
      const response = await fetch(`/api/relations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to update relation');
      const data = await response.json();
      if (data.relation) {
        relationsState.relations = relationsState.relations.map(r => r.id === id ? data.relation : r);
      }
      return data.relation;
    } catch (err) {
      relationsState.error = err as Error;
      throw err;
    }
  }, []);

  const deleteRelation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/relations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete relation');
      relationsState.relations = relationsState.relations.filter(r => r.id !== id);
      return true;
    } catch (err) {
      relationsState.error = err as Error;
      throw err;
    }
  }, []);

  const getRelationsByEntity = useCallback(async (entityId: string) => {
    try {
      const response = await fetch(`/api/relations?entity=${entityId}`);
      if (!response.ok) throw new Error('Failed to fetch relations by entity');
      const data = await response.json();
      return data.relations;
    } catch (err) {
      relationsState.error = err as Error;
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  return {
    relations: snapshot.relations,
    loading: snapshot.loading,
    error: snapshot.error,
    refetch: fetchRelations,
    createRelation,
    updateRelation,
    deleteRelation,
    getRelationsByEntity
  };
}

export function useEntityTypeData() {
  const snapshot = useSnapshot(entityTypeDataState);

  const getTextData = useCallback(async (id: string): Promise<EntityTypeTextData | null> => {
    try {
      entityTypeDataState.loading = true;
      const response = await fetch(`/api/entity-types/text/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch text data');
      }
      const data = await response.json();
      return data.textData;
    } catch (err) {
      entityTypeDataState.error = err as Error;
      throw err;
    } finally {
      entityTypeDataState.loading = false;
    }
  }, []);

  const getFacialData = useCallback(async (id: string): Promise<EntityTypeFacialData | null> => {
    try {
      entityTypeDataState.loading = true;
      const response = await fetch(`/api/entity-types/facial/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch facial data');
      }
      const data = await response.json();
      return data.facialData;
    } catch (err) {
      entityTypeDataState.error = err as Error;
      throw err;
    } finally {
      entityTypeDataState.loading = false;
    }
  }, []);

  return {
    getTextData,
    getFacialData,
    loading: snapshot.loading,
    error: snapshot.error
  };
}

export function useAIAnalysis() {
  const snapshot = useSnapshot(aiAnalysisState);

  const analyze = useCallback(async (type: 'all' | 'importance' | 'patterns' | 'clusters' | 'suggestions' = 'all') => {
    try {
      aiAnalysisState.loading = true;
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error('Failed to analyze data');
      const data = await response.json();
      return data.results;
    } catch (err) {
      aiAnalysisState.error = err as Error;
      throw err;
    } finally {
      aiAnalysisState.loading = false;
    }
  }, []);

  const search = useCallback(async (query: string) => {
    try {
      aiAnalysisState.loading = true;
      const response = await fetch(`/api/ai/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      return data.results;
    } catch (err) {
      aiAnalysisState.error = err as Error;
      throw err;
    } finally {
      aiAnalysisState.loading = false;
    }
  }, []);

  return {
    analyze,
    search,
    loading: snapshot.loading,
    error: snapshot.error
  };
}