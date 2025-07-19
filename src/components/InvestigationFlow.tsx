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
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { EntityNode } from './EntityNode';
import { RelationNode } from './RelationNode';
import { RelationEdge } from './RelationEdge';
import { useEntities, useRelations, useAIAnalysis } from '@/hooks/useDatabase';
import { Entity, Relation } from '@/db/types';
import { EntityScore } from '@/lib/ai-analysis';

const nodeTypes = {
  entity: EntityNode,
  relation: RelationNode,
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
    const componentSpacing = 400;
    let currentX = 100;
    
    components.forEach((component, componentIndex) => {
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
      const levelHeight = 200;
      const baseY = 100;
      
      levels.forEach((nodesInLevel, level) => {
        const startX = currentX + (component.length > 3 ? 0 : 50);
        
        // Separate entity and relation nodes for better layout
        const entityNodes = nodesInLevel.filter(id => nodeTypes.get(id) === 'entity');
        const relationNodes = nodesInLevel.filter(id => nodeTypes.get(id) === 'relation');
        
        // Position entity nodes first
        entityNodes.forEach((nodeId, index) => {
          const x = startX + (index * 200) + (Math.random() - 0.5) * 20;
          const y = baseY + (level * levelHeight);
          nodePositions.set(nodeId, { x, y });
        });
        
        // Position relation nodes between entities
        relationNodes.forEach((nodeId, index) => {
          const x = startX + (index * 200) + 100 + (Math.random() - 0.5) * 20;
          const y = baseY + (level * levelHeight) + 80;
          nodePositions.set(nodeId, { x, y });
        });
      });
      
      // Update currentX for next component
      const componentWidth = Math.max(...Array.from(levels.values()).map(l => l.length)) * 200;
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
    
    // Add all relations as nodes
    relations.forEach(relation => {
      const position = nodePositions.get(relation.id) || { x: 100, y: 100 };
      
      nodes.push({
        id: relation.id,
        type: 'relation',
        position,
        data: {
          relation: relation,
          label: relation.predicate || 'relates-to',
        },
      });
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
    const newEdges: Edge[] = [];
    
    // Create edges from source to relation node and from relation node to target
    relations.forEach(relation => {
      const source = relation.subject_entity_id || relation.subject_relation_id;
      const target = relation.object_entity_id || relation.object_relation_id;
      
      if (!source || !target) return;
      
      // Edge from source to relation node
      newEdges.push({
        id: `${relation.id}-source`,
        source: source,
        target: relation.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Top,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#9ca3af',
          strokeWidth: 2,
        },
      });
      
      // Edge from relation node to target
      newEdges.push({
        id: `${relation.id}-target`,
        source: relation.id,
        target: target,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Left,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#9ca3af',
          strokeWidth: 2,
        },
      });
    });
    
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
    // Edges now just connect nodes, they don't represent relations anymore
    // Relations are clicked via their nodes
  }, []);

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