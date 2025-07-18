'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  BackgroundVariant,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { EntityNode } from './EntityNode';
import { RelationNode } from './RelationNode';
import { RelationEdge } from './RelationEdge';
import { useEntities, useRelations, useAIAnalysis } from '@/hooks/useDatabase';
import { Entity, Relation } from '@/db/types';
import { EntityScore } from '@/lib/ai-analysis';
import { InvestigationNode, RelationEdge as RelationEdgeType } from '@/types/react-flow';
import { calculateGraphLayout } from '@/utils/layout';

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


  // Memoize the calculated nodes to prevent unnecessary recalculations
  const calculatedNodes = useMemo(() => {
    if (entities.length > 0 || relations.length > 0) {
      return calculateGraphLayout(entities, relations, entityScores);
    }
    return [];
  }, [entities, relations, entityScores]);

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
    setNodes(calculatedNodes);
  }, [calculatedNodes, setNodes]);

  // Memoize edge calculations
  const calculatedEdges = useMemo(() => {
    const newEdges: RelationEdgeType[] = [];
    
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
        type: 'relation',
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
        type: 'relation',
        animated: false,
        style: {
          stroke: '#9ca3af',
          strokeWidth: 2,
        },
      });
    });
    
    return newEdges;
  }, [relations]);

  useEffect(() => {
    setEdges(calculatedEdges);
  }, [calculatedEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: InvestigationNode) => {
    if (node.type === 'entity' && onEntitySelect) {
      onEntitySelect(node.data.entity);
    } else if (node.type === 'relation' && onRelationSelect) {
      onRelationSelect(node.data.relation);
    }
  }, [onEntitySelect, onRelationSelect]);

  const onEdgeClick = useCallback(() => {
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