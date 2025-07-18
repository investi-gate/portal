import { Entity, Relation } from '@/db/types';

export interface EntityScore {
  entity: Entity;
  score: number;
  connections: number;
  centralityScore: number;
}

export interface RelationPattern {
  predicate: string;
  count: number;
  entities: Set<string>;
}

export interface ClusterInfo {
  id: string;
  entities: Entity[];
  relations: Relation[];
  density: number;
  commonPredicates: string[];
}

export interface SuggestedRelation {
  subjectId: string;
  objectId: string;
  predicate: string;
  confidence: number;
  reason: string;
}

export function analyzeEntityImportance(
  entities: Entity[],
  relations: Relation[]
): EntityScore[] {
  const entityMap = new Map<string, Entity>();
  const connectionCount = new Map<string, number>();
  const incomingConnections = new Map<string, number>();
  const outgoingConnections = new Map<string, number>();

  entities.forEach(entity => {
    entityMap.set(entity.id, entity);
    connectionCount.set(entity.id, 0);
    incomingConnections.set(entity.id, 0);
    outgoingConnections.set(entity.id, 0);
  });

  relations.forEach(relation => {
    if (relation.subject_entity_id) {
      const count = connectionCount.get(relation.subject_entity_id) || 0;
      connectionCount.set(relation.subject_entity_id, count + 1);
      const outCount = outgoingConnections.get(relation.subject_entity_id) || 0;
      outgoingConnections.set(relation.subject_entity_id, outCount + 1);
    }
    if (relation.object_entity_id) {
      const count = connectionCount.get(relation.object_entity_id) || 0;
      connectionCount.set(relation.object_entity_id, count + 1);
      const inCount = incomingConnections.get(relation.object_entity_id) || 0;
      incomingConnections.set(relation.object_entity_id, inCount + 1);
    }
  });

  return entities.map(entity => {
    const connections = connectionCount.get(entity.id) || 0;
    const incoming = incomingConnections.get(entity.id) || 0;
    const outgoing = outgoingConnections.get(entity.id) || 0;
    
    // Calculate centrality score based on connections
    const centralityScore = (incoming * 1.5 + outgoing) / Math.max(entities.length - 1, 1);
    
    // Overall importance score
    const score = connections * 0.4 + centralityScore * 0.6;

    return {
      entity,
      score,
      connections,
      centralityScore
    };
  }).sort((a, b) => b.score - a.score);
}

export function findRelationPatterns(relations: Relation[]): RelationPattern[] {
  const patterns = new Map<string, RelationPattern>();

  relations.forEach(relation => {
    const pattern = patterns.get(relation.predicate) || {
      predicate: relation.predicate,
      count: 0,
      entities: new Set<string>()
    };

    pattern.count++;
    if (relation.subject_entity_id) {
      pattern.entities.add(relation.subject_entity_id);
    }
    if (relation.object_entity_id) {
      pattern.entities.add(relation.object_entity_id);
    }

    patterns.set(relation.predicate, pattern);
  });

  return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
}

export function detectClusters(
  entities: Entity[],
  relations: Relation[]
): ClusterInfo[] {
  const adjacencyList = new Map<string, Set<string>>();
  
  // Build adjacency list
  entities.forEach(entity => {
    adjacencyList.set(entity.id, new Set());
  });

  relations.forEach(relation => {
    if (relation.subject_entity_id && relation.object_entity_id) {
      const subjects = adjacencyList.get(relation.subject_entity_id);
      if (subjects) {
        subjects.add(relation.object_entity_id);
      }
      const objects = adjacencyList.get(relation.object_entity_id);
      if (objects) {
        objects.add(relation.subject_entity_id);
      }
    }
  });

  // Find connected components using DFS
  const visited = new Set<string>();
  const clusters: ClusterInfo[] = [];

  function dfs(entityId: string, cluster: Set<string>) {
    if (visited.has(entityId)) return;
    visited.add(entityId);
    cluster.add(entityId);

    const neighbors = adjacencyList.get(entityId);
    if (neighbors) {
      neighbors.forEach(neighbor => dfs(neighbor, cluster));
    }
  }

  entities.forEach(entity => {
    if (!visited.has(entity.id)) {
      const cluster = new Set<string>();
      dfs(entity.id, cluster);

      const clusterEntities = Array.from(cluster)
        .map(id => entities.find(e => e.id === id))
        .filter(Boolean) as Entity[];

      const clusterRelations = relations.filter(r => 
        (r.subject_entity_id && cluster.has(r.subject_entity_id)) ||
        (r.object_entity_id && cluster.has(r.object_entity_id))
      );

      // Calculate cluster density
      const possibleConnections = clusterEntities.length * (clusterEntities.length - 1);
      const density = possibleConnections > 0 
        ? clusterRelations.length / possibleConnections 
        : 0;

      // Find common predicates
      const predicateCounts = new Map<string, number>();
      clusterRelations.forEach(r => {
        predicateCounts.set(r.predicate, (predicateCounts.get(r.predicate) || 0) + 1);
      });
      const commonPredicates = Array.from(predicateCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([predicate]) => predicate);

      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        entities: clusterEntities,
        relations: clusterRelations,
        density,
        commonPredicates
      });
    }
  });

  return clusters.sort((a, b) => b.entities.length - a.entities.length);
}

export function suggestRelations(
  entities: Entity[],
  existingRelations: Relation[]
): SuggestedRelation[] {
  const suggestions: SuggestedRelation[] = [];
  const relationMap = new Map<string, Set<string>>();

  // Build map of existing relations
  existingRelations.forEach(relation => {
    if (relation.subject_entity_id && relation.object_entity_id) {
      const key = `${relation.subject_entity_id}-${relation.predicate}-${relation.object_entity_id}`;
      const reverseKey = `${relation.object_entity_id}-${relation.predicate}-${relation.subject_entity_id}`;
      relationMap.set(key, new Set());
      relationMap.set(reverseKey, new Set());
    }
  });

  // Find entities that share common relationships
  const entityRelations = new Map<string, Map<string, Set<string>>>();
  
  existingRelations.forEach(relation => {
    if (relation.subject_entity_id) {
      if (!entityRelations.has(relation.subject_entity_id)) {
        entityRelations.set(relation.subject_entity_id, new Map());
      }
      const predicates = entityRelations.get(relation.subject_entity_id)!;
      if (!predicates.has(relation.predicate)) {
        predicates.set(relation.predicate, new Set());
      }
      if (relation.object_entity_id) {
        predicates.get(relation.predicate)!.add(relation.object_entity_id);
      }
    }
  });

  // Suggest relations based on transitive patterns
  entities.forEach(entity1 => {
    entities.forEach(entity2 => {
      if (entity1.id === entity2.id) return;

      const key = `${entity1.id}-connects-${entity2.id}`;
      const reverseKey = `${entity2.id}-connects-${entity1.id}`;
      
      if (relationMap.has(key) || relationMap.has(reverseKey)) return;

      // Check for common connections
      const entity1Relations = entityRelations.get(entity1.id);
      const entity2Relations = entityRelations.get(entity2.id);

      if (entity1Relations && entity2Relations) {
        // Find shared connections
        let sharedConnections = 0;
        entity1Relations.forEach((targets1, predicate) => {
          const targets2 = entity2Relations.get(predicate);
          if (targets2) {
            const intersection = new Set([...targets1].filter(x => targets2.has(x)));
            sharedConnections += intersection.size;
          }
        });

        if (sharedConnections >= 2) {
          suggestions.push({
            subjectId: entity1.id,
            objectId: entity2.id,
            predicate: 'potentially-related',
            confidence: Math.min(sharedConnections * 0.2, 0.9),
            reason: `Share ${sharedConnections} common connections`
          });
        }
      }

      // Check for same entity types
      if (entity1.type_facial_data_id && entity2.type_facial_data_id) {
        const hasDirectConnection = existingRelations.some(r => 
          (r.subject_entity_id === entity1.id && r.object_entity_id === entity2.id) ||
          (r.subject_entity_id === entity2.id && r.object_entity_id === entity1.id)
        );

        if (!hasDirectConnection) {
          suggestions.push({
            subjectId: entity1.id,
            objectId: entity2.id,
            predicate: 'same-type',
            confidence: 0.3,
            reason: 'Both entities have facial data'
          });
        }
      }
    });
  });

  return suggestions
    .filter(s => s.confidence >= 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

export function searchEntities(
  entities: Entity[],
  relations: Relation[],
  query: string
): Entity[] {
  const queryLower = query.toLowerCase();
  const scores = new Map<string, number>();

  entities.forEach(entity => {
    let score = 0;

    // Check entity ID
    if (entity.id.toLowerCase().includes(queryLower)) {
      score += 1;
    }

    // Check entity types
    if (entity.type_facial_data_id && queryLower.includes('facial')) {
      score += 0.5;
    }
    if (entity.type_text_data_id && queryLower.includes('text')) {
      score += 0.5;
    }

    // Check related predicates
    const relatedRelations = relations.filter(r => 
      r.subject_entity_id === entity.id || r.object_entity_id === entity.id
    );

    relatedRelations.forEach(relation => {
      if (relation.predicate.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }
    });

    if (score > 0) {
      scores.set(entity.id, score);
    }
  });

  return entities
    .filter(entity => scores.has(entity.id))
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}