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

// Helper types
interface ConnectionCounts {
  total: Map<string, number>;
  incoming: Map<string, number>;
  outgoing: Map<string, number>;
}

interface EntityRelationMap {
  [entityId: string]: Map<string, Set<string>>;
}

// Helper functions for entity importance analysis
function initializeConnectionCounts(entities: Entity[]): ConnectionCounts {
  const total = new Map<string, number>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  
  entities.forEach(entity => {
    total.set(entity.id, 0);
    incoming.set(entity.id, 0);
    outgoing.set(entity.id, 0);
  });
  
  return { total, incoming, outgoing };
}

function updateConnectionCounts(
  counts: ConnectionCounts,
  relation: Relation
): void {
  if (relation.subject_entity_id) {
    incrementMapValue(counts.total, relation.subject_entity_id);
    incrementMapValue(counts.outgoing, relation.subject_entity_id);
  }
  
  if (relation.object_entity_id) {
    incrementMapValue(counts.total, relation.object_entity_id);
    incrementMapValue(counts.incoming, relation.object_entity_id);
  }
}

function incrementMapValue(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

function calculateEntityScore(
  entity: Entity,
  counts: ConnectionCounts,
  totalEntities: number
): EntityScore {
  const connections = counts.total.get(entity.id) || 0;
  const incoming = counts.incoming.get(entity.id) || 0;
  const outgoing = counts.outgoing.get(entity.id) || 0;
  
  const centralityScore = calculateCentralityScore(incoming, outgoing, totalEntities);
  const score = connections * 0.4 + centralityScore * 0.6;
  
  return { entity, score, connections, centralityScore };
}

function calculateCentralityScore(
  incoming: number,
  outgoing: number,
  totalEntities: number
): number {
  const denominator = Math.max(totalEntities - 1, 1);
  return (incoming * 1.5 + outgoing) / denominator;
}

export function analyzeEntityImportance(
  entities: Entity[],
  relations: Relation[]
): EntityScore[] {
  const counts = initializeConnectionCounts(entities);
  
  relations.forEach(relation => updateConnectionCounts(counts, relation));
  
  return entities
    .map(entity => calculateEntityScore(entity, counts, entities.length))
    .sort((a, b) => b.score - a.score);
}

function updateRelationPattern(
  pattern: RelationPattern,
  relation: Relation
): void {
  pattern.count++;
  
  if (relation.subject_entity_id) {
    pattern.entities.add(relation.subject_entity_id);
  }
  
  if (relation.object_entity_id) {
    pattern.entities.add(relation.object_entity_id);
  }
}

function createOrGetPattern(
  patterns: Map<string, RelationPattern>,
  predicate: string
): RelationPattern {
  if (!patterns.has(predicate)) {
    patterns.set(predicate, {
      predicate,
      count: 0,
      entities: new Set<string>()
    });
  }
  return patterns.get(predicate)!;
}

export function findRelationPatterns(relations: Relation[]): RelationPattern[] {
  const patterns = new Map<string, RelationPattern>();

  relations.forEach(relation => {
    const pattern = createOrGetPattern(patterns, relation.predicate);
    updateRelationPattern(pattern, relation);
  });

  return Array.from(patterns.values())
    .sort((a, b) => b.count - a.count);
}

// Helper functions for cluster detection
function buildAdjacencyList(
  entities: Entity[],
  relations: Relation[]
): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();
  
  entities.forEach(entity => {
    adjacencyList.set(entity.id, new Set());
  });
  
  relations.forEach(relation => {
    addBidirectionalConnection(adjacencyList, relation);
  });
  
  return adjacencyList;
}

function addBidirectionalConnection(
  adjacencyList: Map<string, Set<string>>,
  relation: Relation
): void {
  if (!relation.subject_entity_id || !relation.object_entity_id) return;
  
  const subjects = adjacencyList.get(relation.subject_entity_id);
  const objects = adjacencyList.get(relation.object_entity_id);
  
  if (subjects) subjects.add(relation.object_entity_id);
  if (objects) objects.add(relation.subject_entity_id);
}

function findConnectedComponent(
  startId: string,
  adjacencyList: Map<string, Set<string>>,
  visited: Set<string>
): Set<string> {
  const component = new Set<string>();
  const stack = [startId];
  
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    
    visited.add(current);
    component.add(current);
    
    const neighbors = adjacencyList.get(current);
    if (neighbors) {
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }
  }
  
  return component;
}

function calculateClusterDensity(
  entityCount: number,
  relationCount: number
): number {
  const possibleConnections = entityCount * (entityCount - 1);
  return possibleConnections > 0 ? relationCount / possibleConnections : 0;
}

function findTopPredicates(
  relations: Relation[],
  limit: number = 3
): string[] {
  const predicateCounts = new Map<string, number>();
  
  relations.forEach(r => {
    incrementMapValue(predicateCounts, r.predicate);
  });
  
  return Array.from(predicateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([predicate]) => predicate);
}

function createClusterInfo(
  id: string,
  clusterIds: Set<string>,
  entities: Entity[],
  relations: Relation[]
): ClusterInfo {
  const clusterEntities = entities.filter(e => clusterIds.has(e.id));
  const clusterRelations = relations.filter(r => 
    (r.subject_entity_id && clusterIds.has(r.subject_entity_id)) ||
    (r.object_entity_id && clusterIds.has(r.object_entity_id))
  );
  
  return {
    id,
    entities: clusterEntities,
    relations: clusterRelations,
    density: calculateClusterDensity(clusterEntities.length, clusterRelations.length),
    commonPredicates: findTopPredicates(clusterRelations)
  };
}

export function detectClusters(
  entities: Entity[],
  relations: Relation[]
): ClusterInfo[] {
  const adjacencyList = buildAdjacencyList(entities, relations);
  const visited = new Set<string>();
  const clusters: ClusterInfo[] = [];
  
  entities.forEach(entity => {
    if (visited.has(entity.id)) return;
    
    const component = findConnectedComponent(entity.id, adjacencyList, visited);
    const clusterInfo = createClusterInfo(
      `cluster-${clusters.length + 1}`,
      component,
      entities,
      relations
    );
    
    clusters.push(clusterInfo);
  });
  
  return clusters.sort((a, b) => b.entities.length - a.entities.length);
}

// Helper functions for relation suggestions
function buildExistingRelationKeys(relations: Relation[]): Set<string> {
  const keys = new Set<string>();
  
  relations.forEach(relation => {
    if (!relation.subject_entity_id || !relation.object_entity_id) return;
    
    const key = `${relation.subject_entity_id}-${relation.predicate}-${relation.object_entity_id}`;
    const reverseKey = `${relation.object_entity_id}-${relation.predicate}-${relation.subject_entity_id}`;
    
    keys.add(key);
    keys.add(reverseKey);
  });
  
  return keys;
}

function buildEntityRelationMap(relations: Relation[]): Map<string, Map<string, Set<string>>> {
  const entityRelations = new Map<string, Map<string, Set<string>>>();
  
  relations.forEach(relation => {
    if (!relation.subject_entity_id || !relation.object_entity_id) return;
    
    if (!entityRelations.has(relation.subject_entity_id)) {
      entityRelations.set(relation.subject_entity_id, new Map());
    }
    
    const predicates = entityRelations.get(relation.subject_entity_id)!;
    if (!predicates.has(relation.predicate)) {
      predicates.set(relation.predicate, new Set());
    }
    
    predicates.get(relation.predicate)!.add(relation.object_entity_id);
  });
  
  return entityRelations;
}

function countSharedConnections(
  entity1Relations: Map<string, Set<string>>,
  entity2Relations: Map<string, Set<string>>
): number {
  let count = 0;
  
  entity1Relations.forEach((targets1, predicate) => {
    const targets2 = entity2Relations.get(predicate);
    if (targets2) {
      const shared = [...targets1].filter(x => targets2.has(x));
      count += shared.length;
    }
  });
  
  return count;
}

function relationExists(
  entity1Id: string,
  entity2Id: string,
  relations: Relation[]
): boolean {
  return relations.some(r => 
    (r.subject_entity_id === entity1Id && r.object_entity_id === entity2Id) ||
    (r.subject_entity_id === entity2Id && r.object_entity_id === entity1Id)
  );
}

function suggestTransitiveRelation(
  entity1: Entity,
  entity2: Entity,
  sharedConnections: number
): SuggestedRelation | null {
  if (sharedConnections < 2) return null;
  
  return {
    subjectId: entity1.id,
    objectId: entity2.id,
    predicate: 'potentially-related',
    confidence: Math.min(sharedConnections * 0.2, 0.9),
    reason: `Share ${sharedConnections} common connections`
  };
}

function suggestFacialDataRelation(
  entity1: Entity,
  entity2: Entity,
  existingRelations: Relation[]
): SuggestedRelation | null {
  if (!entity1.type_facial_data_id || !entity2.type_facial_data_id) return null;
  if (relationExists(entity1.id, entity2.id, existingRelations)) return null;
  
  return {
    subjectId: entity1.id,
    objectId: entity2.id,
    predicate: 'same-type',
    confidence: 0.3,
    reason: 'Both entities have facial data'
  };
}

function findPotentialRelations(
  entity1: Entity,
  entity2: Entity,
  entityRelations: Map<string, Map<string, Set<string>>>,
  existingRelations: Relation[]
): SuggestedRelation[] {
  const suggestions: SuggestedRelation[] = [];
  
  // Check transitive relations
  const entity1Rels = entityRelations.get(entity1.id);
  const entity2Rels = entityRelations.get(entity2.id);
  
  if (entity1Rels && entity2Rels) {
    const sharedCount = countSharedConnections(entity1Rels, entity2Rels);
    const transitive = suggestTransitiveRelation(entity1, entity2, sharedCount);
    if (transitive) suggestions.push(transitive);
  }
  
  // Check facial data relations
  const facial = suggestFacialDataRelation(entity1, entity2, existingRelations);
  if (facial) suggestions.push(facial);
  
  return suggestions;
}

export function suggestRelations(
  entities: Entity[],
  existingRelations: Relation[]
): SuggestedRelation[] {
  const existingKeys = buildExistingRelationKeys(existingRelations);
  const entityRelations = buildEntityRelationMap(existingRelations);
  const suggestions: SuggestedRelation[] = [];
  
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];
      
      const key = `${entity1.id}-connects-${entity2.id}`;
      const reverseKey = `${entity2.id}-connects-${entity1.id}`;
      
      if (existingKeys.has(key) || existingKeys.has(reverseKey)) continue;
      
      const potentialRelations = findPotentialRelations(
        entity1,
        entity2,
        entityRelations,
        existingRelations
      );
      
      suggestions.push(...potentialRelations);
    }
  }
  
  return suggestions
    .filter(s => s.confidence >= 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

// Helper functions for entity search
function scoreEntityId(entityId: string, queryLower: string): number {
  return entityId.toLowerCase().includes(queryLower) ? 1 : 0;
}

function scoreEntityTypes(entity: Entity, queryLower: string): number {
  let score = 0;
  
  if (entity.type_facial_data_id && queryLower.includes('facial')) {
    score += 0.5;
  }
  
  if (entity.type_text_data_id && queryLower.includes('text')) {
    score += 0.5;
  }
  
  return score;
}

function scoreRelatedPredicates(
  entity: Entity,
  relations: Relation[],
  queryLower: string
): number {
  let score = 0;
  
  const relatedRelations = relations.filter(r => 
    r.subject_entity_id === entity.id || r.object_entity_id === entity.id
  );
  
  relatedRelations.forEach(relation => {
    if (relation.predicate.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }
  });
  
  return score;
}

function calculateSearchScore(
  entity: Entity,
  relations: Relation[],
  queryLower: string
): number {
  return scoreEntityId(entity.id, queryLower) +
         scoreEntityTypes(entity, queryLower) +
         scoreRelatedPredicates(entity, relations, queryLower);
}

export function searchEntities(
  entities: Entity[],
  relations: Relation[],
  query: string
): Entity[] {
  const queryLower = query.toLowerCase();
  const scores = new Map<string, number>();
  
  entities.forEach(entity => {
    const score = calculateSearchScore(entity, relations, queryLower);
    if (score > 0) {
      scores.set(entity.id, score);
    }
  });
  
  return entities
    .filter(entity => scores.has(entity.id))
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}