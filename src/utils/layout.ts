import { Entity, Relation, DataBucket } from '@/db/types';
import { EntityScore } from '@/lib/ai-analysis';
import { InvestigationNode } from '@/types/react-flow';

interface LayoutOptions {
  nodeSpacing: number;
  levelHeight: number;
  componentSpacing: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeSpacing: 250,
  levelHeight: 250,
  componentSpacing: 400,
};

export function calculateGraphLayout(
  entities: (Entity & { text_content?: string })[],
  relations: Relation[],
  scores: EntityScore[],
  bucket?: DataBucket | null,
  options: Partial<LayoutOptions> = {}
): InvestigationNode[] {
  const layoutOpts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const scoreMap = new Map(scores.map(s => [s.entity.id, s]));
  
  // ALL relations will be displayed as nodes
  const relationIdsAsNodes = new Set<string>();
  relations.forEach(relation => {
    relationIdsAsNodes.add(relation.id);
  });
  
  // Create a unified node list containing both entities and relation nodes
  const allNodeIds = new Set<string>();
  const nodeTypes = new Map<string, 'entity' | 'relation'>();
  
  // Add entities
  entities.forEach(entity => {
    allNodeIds.add(entity.id);
    nodeTypes.set(entity.id, 'entity');
  });
  
  // Add all relations as nodes
  relationIdsAsNodes.forEach(relationId => {
    allNodeIds.add(relationId);
    nodeTypes.set(relationId, 'relation');
  });
  
  // Build adjacency lists for all nodes
  const connections = new Map<string, Set<string>>();
  allNodeIds.forEach(nodeId => {
    connections.set(nodeId, new Set());
  });
  
  // Build connections: Entity/Relation -> Relation -> Entity/Relation
  relations.forEach(relation => {
    const source = relation.subject_entity_id || relation.subject_relation_id;
    const target = relation.object_entity_id || relation.object_relation_id;
    
    // Connect source to relation node
    if (source && connections.has(source)) {
      connections.get(source)!.add(relation.id);
      connections.get(relation.id)!.add(source);
    }
    
    // Connect relation node to target
    if (target && connections.has(target)) {
      connections.get(relation.id)!.add(target);
      connections.get(target)!.add(relation.id);
    }
  });
  
  // Find connected components
  const visited = new Set<string>();
  const components: string[][] = [];
  
  const dfs = (nodeId: string, component: string[]) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    component.push(nodeId);
    
    connections.get(nodeId)?.forEach(connectedId => {
      dfs(connectedId, component);
    });
  };
  
  allNodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      const component: string[] = [];
      dfs(nodeId, component);
      if (component.length > 0) {
        components.push(component);
      }
    }
  });
  
  // Layout each component
  const nodePositions = new Map<string, { x: number; y: number }>();
  let currentX = 100;
  
  components.forEach((component) => {
    // Calculate depth for each node in the component
    const depths = new Map<string, number>();
    const calculateDepth = (nodeId: string, visited: Set<string>, depth: number): number => {
      if (visited.has(nodeId)) return depth;
      visited.add(nodeId);
      
      let maxChildDepth = depth;
      // For entities/relations connected via relation nodes
      connections.get(nodeId)?.forEach(connectedId => {
        if (component.includes(connectedId)) {
          const childDepth = calculateDepth(connectedId, visited, depth + 1);
          maxChildDepth = Math.max(maxChildDepth, childDepth);
        }
      });
      
      depths.set(nodeId, depth);
      return maxChildDepth;
    };
    
    // Find root nodes (entity nodes with no incoming connections within component)
    const roots = component.filter(nodeId => {
      // Only consider entity nodes as potential roots
      if (nodeTypes.get(nodeId) !== 'entity') return false;
      
      // Check if any other node in the component connects to this one
      return !Array.from(connections.entries()).some(([otherId, otherConnections]) => {
        return otherId !== nodeId && component.includes(otherId) && otherConnections.has(nodeId);
      });
    });
    
    // If no clear roots, use entity nodes with most outgoing connections
    const effectiveRoots = roots.length > 0 ? roots : component
      .filter(nodeId => nodeTypes.get(nodeId) === 'entity')
      .sort((a, b) => {
        const aOutgoing = connections.get(a)?.size || 0;
        const bOutgoing = connections.get(b)?.size || 0;
        return bOutgoing - aOutgoing;
      }).slice(0, Math.max(1, Math.ceil(component.length / 4)));
    
    // Calculate depths from roots
    effectiveRoots.forEach(root => {
      calculateDepth(root, new Set(), 0);
    });
    
    // Group nodes by depth
    const levels = new Map<number, string[]>();
    component.forEach(nodeId => {
      const depth = depths.get(nodeId) || 0;
      if (!levels.has(depth)) {
        levels.set(depth, []);
      }
      levels.get(depth)!.push(nodeId);
    });
    
    // Position nodes level by level with better spacing for relation nodes
    const baseY = 100;
    
    levels.forEach((nodesInLevel, level) => {
      const startX = currentX + (component.length > 3 ? 0 : 50);
      
      // Separate entity and relation nodes for better layout
      const entityNodes = nodesInLevel.filter(id => nodeTypes.get(id) === 'entity');
      const relationNodes = nodesInLevel.filter(id => nodeTypes.get(id) === 'relation');
      
      // Position entity nodes first with better spacing
      entityNodes.forEach((nodeId, index) => {
        const x = startX + (index * layoutOpts.nodeSpacing);
        const y = baseY + (level * layoutOpts.levelHeight);
        nodePositions.set(nodeId, { x, y });
      });
      
      // Position relation nodes at intermediate positions
      relationNodes.forEach((nodeId, index) => {
        // Try to position relation nodes between their connected entities
        const relation = relations.find(r => r.id === nodeId);
        if (relation) {
          const sourceId = relation.subject_entity_id || relation.subject_relation_id;
          const targetId = relation.object_entity_id || relation.object_relation_id;
          const sourcePos = nodePositions.get(sourceId!);
          const targetPos = nodePositions.get(targetId!);
          
          if (sourcePos && targetPos) {
            // Position at midpoint between source and target
            const x = (sourcePos.x + targetPos.x) / 2;
            const y = (sourcePos.y + targetPos.y) / 2;
            nodePositions.set(nodeId, { x, y });
          } else {
            // Fallback positioning
            const x = startX + (entityNodes.length * layoutOpts.nodeSpacing) + (index * 150);
            const y = baseY + (level * layoutOpts.levelHeight) + 100;
            nodePositions.set(nodeId, { x, y });
          }
        }
      });
    });
    
    // Update currentX for next component
    const maxNodesInLevel = Math.max(...Array.from(levels.values()).map(l => l.filter(id => nodeTypes.get(id) === 'entity').length));
    const componentWidth = maxNodesInLevel * layoutOpts.nodeSpacing;
    currentX += componentWidth + layoutOpts.componentSpacing;
  });
  
  // Create node objects with positions
  const nodes: InvestigationNode[] = [];
  
  // Add entity nodes
  entities.forEach(entity => {
    const position = nodePositions.get(entity.id) || { x: 100, y: 100 };
    const score = scoreMap.get(entity.id);
    const importance = score?.score || 0;
    
    // Get image URL if entity has image data
    let imageUrl: string | undefined;
    if (entity.type_image_data_id && bucket) {
      const imageData = bucket.entity_type_image_data[entity.type_image_data_id];
      if (imageData?.media_id) {
        const media = bucket.medias[imageData.media_id];
        imageUrl = media?.url;
      }
    }
    
    nodes.push({
      id: entity.id,
      type: 'entity',
      position,
      data: {
        entity,
        label: `Entity ${entity.id.slice(0, 8)}`,
        importance,
        imageUrl,
      },
    });
  });
  
  // Add all relations as nodes
  relations.forEach(relation => {
    const position = nodePositions.get(relation.id) || { x: 100, y: 100 };
    
    nodes.push({
      id: relation.id,
      type: 'relation',
      position,
      data: {
        relation: relation,
        label: relation.predicate || '',
      },
    });
  });
  
  return nodes;
}