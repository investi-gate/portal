import { useState, useEffect, useCallback, useMemo } from 'react';
import { Entity, Relation, EntityTypeFacialData, EntityTypeTextData, BucketedResponse, Bucket } from '@/db/types';

export function useEntities() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/entities');
      if (!response.ok) throw new Error('Failed to fetch entities');
      const data: BucketedResponse<string[]> = await response.json();
      setBucket(data.bucket);
      setEntityIds(data.data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
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
      setError(err as Error);
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
      setError(err as Error);
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
      setError(err as Error);
      throw err;
    }
  }, [fetchEntities]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Helper to get entities with their text content
  const entitiesWithTextContent = useMemo(() => {
    if (!bucket) return [];
    
    return entityIds.map(id => {
      const entity = bucket.entities[id];
      if (!entity) return null;
      
      const textContent = entity.type_text_data_id 
        ? bucket.entity_type_text_data[entity.type_text_data_id]?.content 
        : undefined;
      
      return {
        ...entity,
        text_content: textContent
      };
    }).filter(Boolean) as (Entity & { text_content?: string })[];
  }, [bucket, entityIds]);

  return {
    bucket,
    entities: entitiesWithTextContent,
    loading,
    error,
    refetch: fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity
  };
}


export function useRelations() {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRelations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/relations');
      if (!response.ok) throw new Error('Failed to fetch relations');
      const data = await response.json();
      setRelations(data.relations);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
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
      setRelations(prev => [...prev, data.relation]);
      return data.relation;
    } catch (err) {
      setError(err as Error);
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
        setRelations(prev => prev.map(r => r.id === id ? data.relation : r));
      }
      return data.relation;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const deleteRelation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/relations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete relation');
      setRelations(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (err) {
      setError(err as Error);
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
      setError(err as Error);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  return {
    relations,
    loading,
    error,
    refetch: fetchRelations,
    createRelation,
    updateRelation,
    deleteRelation,
    getRelationsByEntity
  };
}

export function useEntityTypeData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTextData = useCallback(async (id: string): Promise<EntityTypeTextData | null> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/entity-types/text/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch text data');
      }
      const data = await response.json();
      return data.textData;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFacialData = useCallback(async (id: string): Promise<EntityTypeFacialData | null> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/entity-types/facial/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch facial data');
      }
      const data = await response.json();
      return data.facialData;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getTextData,
    getFacialData,
    loading,
    error
  };
}

export function useAIAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(async (type: 'all' | 'importance' | 'patterns' | 'clusters' | 'suggestions' = 'all') => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error('Failed to analyze data');
      const data = await response.json();
      return data.results;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      return data.results;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analyze,
    search,
    loading,
    error
  };
}