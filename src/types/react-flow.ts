import { Node, Edge } from '@xyflow/react';
import { Entity, Relation } from '@/db/types';

export interface EntityNodeData {
  entity: Entity;
  label: string;
  importance?: number;
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