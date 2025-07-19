'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { EntityNode } from './EntityNode';
import { RelationEdge } from './RelationEdge';
import { useEntities, useRelations, useAIAnalysis } from '@/hooks/useDatabase';
import { Entity, Relation } from '@/db/types';
import { EntityScore } from '@/lib/ai-analysis';

const nodeTypes = {
  entity: EntityNode,
  relation: EntityNode, // Reuse EntityNode for relation nodes with different styling
};

const edgeTypes = {
  relation: RelationEdge,
};

interface InvestigationFlowProps {
  onEntitySelect?: (entity: Entity) => void;
  onRelationSelect?: (relation: Relation) => void;
}

export function InvestigationFlow({ onEntitySelect, onRelationSelect }: InvestigationFlowProps) {
  const { entities, loading: entitiesLoading } = useEntities();
  const { relations, loading: relationsLoading } = useRelations();
  const { analyze } = useAIAnalysis();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [entityScores, setEntityScores] = useState<EntityScore[]>([]);

  // Calculate layout positions for all nodes (entities and relation nodes)
  const calculateLayout = useCallback((entities: Entity[], relations: Relation[], scores: EntityScore[]) => {
    const scoreMap = new Map(scores.map(s => [s.entity.id, s]));
    const viewportWidth = 1200;
    const viewportHeight = 800;
    
    // Find which relations need to be nodes
    const relationIdsAsNodes = new Set<string>();
    relations.forEach(relation => {
      if (relation.subject_relation_id) {
        relationIdsAsNodes.add(relation.subject_relation_id);
      }
      if (relation.object_relation_id) {
        relationIdsAsNodes.add(relation.object_relation_id);
      }
    });
    
    // Create a unified node list containing both entities and relation nodes
    const allNodeIds = new Set<string>();
    const nodeTypes = new Map<string, 'entity' | 'relation'>();
    
    // Add entities
    entities.forEach(entity => {
      allNodeIds.add(entity.id);
      nodeTypes.set(entity.id, 'entity');
    });
    
    // Add relation nodes
    relationIdsAsNodes.forEach(relationId => {
      allNodeIds.add(relationId);
      nodeTypes.set(relationId, 'relation');
    });
    
    // Build adjacency lists for all nodes
    const connections = new Map<string, Set<string>>();
    allNodeIds.forEach(nodeId => {
      connections.set(nodeId, new Set());
    });
    
    // Build connections including relation nodes
    relations.forEach(relation => {
      const source = relation.subject_entity_id || relation.subject_relation_id;
      const target = relation.object_entity_id || relation.object_relation_id;
      
      if (source && target && connections.has(source) && connections.has(target)) {
        connections.get(source)!.add(target);
        connections.get(target)!.add(source);
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
    const componentSpacing = 400;
    let currentX = 100;
    
    components.forEach((component, componentIndex) => {
      // Calculate depth for each node in the component
      const depths = new Map<string, number>();
      const calculateDepth = (nodeId: string, visited: Set<string>, depth: number): number => {
        if (visited.has(nodeId)) return depth;
        visited.add(nodeId);
        
        let maxChildDepth = depth;
        relations.forEach(relation => {
          const source = relation.subject_entity_id || relation.subject_relation_id;
          const target = relation.object_entity_id || relation.object_relation_id;
          
          if (source === nodeId && target && component.includes(target)) {
            const childDepth = calculateDepth(target, visited, depth + 1);
            maxChildDepth = Math.max(maxChildDepth, childDepth);
          }
        });
        
        depths.set(nodeId, depth);
        return maxChildDepth;
      };
      
      // Find root nodes (nodes with no incoming edges within component)
      const roots = component.filter(nodeId => {
        return !relations.some(r => {
          const target = r.object_entity_id || r.object_relation_id;
          const source = r.subject_entity_id || r.subject_relation_id;
          return target === nodeId && source && component.includes(source);
        });
      });
      
      // If no clear roots, use nodes with most outgoing connections
      const effectiveRoots = roots.length > 0 ? roots : component.sort((a, b) => {
        const aOutgoing = relations.filter(r => {
          const source = r.subject_entity_id || r.subject_relation_id;
          return source === a;
        }).length;
        const bOutgoing = relations.filter(r => {
          const source = r.subject_entity_id || r.subject_relation_id;
          return source === b;
        }).length;
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
      
      // Position nodes level by level
      const levelHeight = 150;
      const baseY = 100;
      
      levels.forEach((nodesInLevel, level) => {
        const startX = currentX + (component.length > 3 ? 0 : 50);
        
        nodesInLevel.forEach((nodeId, index) => {
          const x = startX + (index * 150) + (Math.random() - 0.5) * 30;
          const y = baseY + (level * levelHeight) + (Math.random() - 0.5) * 20;
          
          nodePositions.set(nodeId, { x, y });
        });
      });
      
      // Update currentX for next component
      const componentWidth = Math.max(...Array.from(levels.values()).map(l => l.length)) * 150;
      currentX += componentWidth + componentSpacing;
    });
    
    // Create node objects with positions
    const nodes: Node[] = [];
    
    // Add entity nodes
    entities.forEach(entity => {
      const position = nodePositions.get(entity.id) || { x: 100, y: 100 };
      const score = scoreMap.get(entity.id);
      const importance = score?.score || 0;
      
      nodes.push({
        id: entity.id,
        type: 'entity',
        position,
        data: {
          entity,
          label: `Entity ${entity.id.slice(0, 8)}`,
          importance,
        },
      });
    });
    
    // Add relation nodes
    relationIdsAsNodes.forEach(relationId => {
      const relation = relations.find(r => r.id === relationId);
      if (relation) {
        const position = nodePositions.get(relationId) || { x: 100, y: 100 };
        
        nodes.push({
          id: relationId,
          type: 'relation',
          position,
          data: {
            entity: null,
            relation: relation,
            label: `${relation.predicate}`,
            isRelationNode: true,
          },
          style: {
            background: '#fef3c7',
            border: '2px dashed #f59e0b',
          },
        });
      }
    });
    
    return nodes;
  }, []);

  // Convert entities and relations to nodes and edges
  useEffect(() => {
    const loadAnalysis = async () => {
      if (entities.length > 0 && relations.length > 0) {
        try {
          const results = await analyze('importance');
          if (results.entityScores) {
            setEntityScores(results.entityScores);
          }
        } catch (error) {
          console.error('Failed to analyze entities:', error);
        }
      }
    };

    loadAnalysis();
  }, [entities, relations, analyze]);

  useEffect(() => {
    // Calculate all nodes (entities and relation nodes) together
    if (entities.length > 0 || relations.length > 0) {
      const allNodes = calculateLayout(entities, relations, entityScores);
      setNodes(allNodes);
    }
  }, [entities, relations, entityScores, calculateLayout, setNodes]);

  useEffect(() => {
    const newEdges: Edge[] = relations
      .map(relation => {
        // Determine source and target
        const source = relation.subject_entity_id || relation.subject_relation_id;
        const target = relation.object_entity_id || relation.object_relation_id;
        
        if (!source || !target) return null;
        
        // Check if this is a meta-relation (involves other relations)
        const isMetaRelation = relation.subject_relation_id || relation.object_relation_id;
        
        return {
          id: relation.id,
          source: source,
          target: target,
          type: 'relation',
          data: { 
            label: relation.predicate,
            isMetaRelation,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: isMetaRelation ? {
            stroke: '#f59e0b',
            strokeWidth: 2,
            strokeDasharray: '5 5',
          } : undefined,
        };
      })
      .filter(edge => edge !== null) as Edge[];
    
    setEdges(newEdges);
  }, [relations, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'entity' && node.data.entity && onEntitySelect) {
      onEntitySelect(node.data.entity);
    } else if (node.type === 'relation' && node.data.relation && onRelationSelect) {
      onRelationSelect(node.data.relation);
    }
  }, [onEntitySelect, onRelationSelect]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const relation = relations.find(r => r.id === edge.id);
    if (relation && onRelationSelect) {
      onRelationSelect(relation);
    }
  }, [relations, onRelationSelect]);

  if (entitiesLoading || relationsLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-test="loading-state">
        <div className="text-lg">Loading investigation data...</div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{
        padding: 0.2,
        includeHiddenNodes: false,
      }}
      minZoom={0.1}
      maxZoom={2}
      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      data-test="react-flow"
    >
      <Controls data-test="flow-controls" />
      <MiniMap 
        data-test="flow-minimap"
        style={{
          height: 120,
          width: 160,
        }}
        zoomable
        pannable
      />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
}