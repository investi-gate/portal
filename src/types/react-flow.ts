import { Node, Edge } from '@xyflow/react';
import { Entity, Relation } from '@/db/types';

export interface EntityNodeData {
  entity: Entity & { 
    text_content?: string;
    image_portion?: {
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string | null;
      confidence?: number | null;
    };
  };
  label: string;
  importance?: number;
  imageUrl?: string;
}

export interface RelationNodeData {
  relation: Relation;
  label: string;
}

export type EntityNode = Node<EntityNodeData, 'entity'>;
export type RelationNode = Node<RelationNodeData, 'relation'>;
export type InvestigationNode = EntityNode | RelationNode;

export interface RelationEdgeData {
  label?: string;
}

export type RelationEdge = Edge<RelationEdgeData>;