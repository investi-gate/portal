'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  // Calculate layout positions for entities
  const calculateLayout = useCallback((entities: Entity[], scores: EntityScore[]) => {
    const scoreMap = new Map(scores.map(s => [s.entity.id, s]));
    const centerX = 400;
    const centerY = 300;
    const radius = 300;
    
    return entities.map((entity, index) => {
      const score = scoreMap.get(entity.id);
      const importance = score?.score || 0;
      
      // Position more important nodes closer to center
      const distanceFromCenter = radius * (1 - importance);
      const angle = (index / entities.length) * 2 * Math.PI;
      
      const x = centerX + distanceFromCenter * Math.cos(angle);
      const y = centerY + distanceFromCenter * Math.sin(angle);
      
      return {
        id: entity.id,
        type: 'entity',
        position: { x, y },
        data: {
          entity,
          label: `Entity ${entity.id.slice(0, 8)}`,
          importance,
        },
      };
    });
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
    if (entities.length > 0) {
      const newNodes = calculateLayout(entities, entityScores);
      setNodes(newNodes);
    }
  }, [entities, entityScores, calculateLayout, setNodes]);

  useEffect(() => {
    const newEdges: Edge[] = relations
      .filter(relation => relation.subject_entity_id && relation.object_entity_id)
      .map(relation => ({
        id: relation.id,
        source: relation.subject_entity_id!,
        target: relation.object_entity_id!,
        type: 'relation',
        data: { label: relation.predicate },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
      }));
    
    setEdges(newEdges);
  }, [relations, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'entity' && node.data.entity && onEntitySelect) {
      onEntitySelect(node.data.entity);
    }
  }, [onEntitySelect]);

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
      data-test="react-flow"
    >
      <Controls data-test="flow-controls" />
      <MiniMap data-test="flow-minimap" />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
}