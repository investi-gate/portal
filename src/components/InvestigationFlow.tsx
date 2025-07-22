'use client';

import React, { useCallback, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { EntityNode } from './EntityNode';
import { RelationNode } from './RelationNode';
import { RelationEdge } from './RelationEdge';
import { useEntities, useRelations } from '@/hooks/useDatabase';
import { useBucket } from '@/hooks/useBucket';
import { Entity, Relation } from '@/db/types';
import { InvestigationNode, RelationEdge as RelationEdgeType } from '@/types/react-flow';
import { getEntityImageUrl, getEntityImagePortion } from '@/utils/bucket-helpers';

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
  const { bucket } = useBucket();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);




  // Convert entities and relations to nodes
  useEffect(() => {
    const newNodes: InvestigationNode[] = [];
    
    // Add entity nodes
    entities.forEach((entity, index) => {
      // Get image URL and portion data using helpers
      const imageUrl = getEntityImageUrl(entity, bucket);
      const imagePortion = getEntityImagePortion(entity, bucket);
      
      newNodes.push({
        id: entity.id,
        type: 'entity',
        position: { x: 100 + (index % 5) * 200, y: 100 + Math.floor(index / 5) * 200 },
        data: {
          entity: {
            ...entity,
            image_portion: imagePortion,
          },
          label: imagePortion?.label || `Entity ${entity.id.slice(0, 8)}`,
          imageUrl,
        },
      });
    });
    
    // Add relation nodes
    relations.forEach((relation, index) => {
      newNodes.push({
        id: relation.id,
        type: 'relation',
        position: { x: 100 + (index % 4) * 250, y: 400 + Math.floor(index / 4) * 200 },
        data: {
          relation: relation,
          label: relation.predicate || '',
        },
      });
    });
    
    setNodes(newNodes);
  }, [entities, relations, bucket, setNodes]);

  // Create edges for relations
  useEffect(() => {
    const newEdges: RelationEdgeType[] = [];
    
    // Create edges from source to relation node and from relation node to target
    relations.forEach(relation => {
      const sourceId = relation.subject_entity_id || relation.subject_relation_id;
      const targetId = relation.object_entity_id || relation.object_relation_id;
      
      if (!sourceId || !targetId) return;
      
      // Edge from source to relation node
      newEdges.push({
        id: `${relation.id}-source`,
        source: sourceId,
        target: relation.id,
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
        target: targetId,
        type: 'relation',
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