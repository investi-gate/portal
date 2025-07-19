import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Entity, Relation } from '@/db/types';

interface EntityNodeProps {
  data: {
    entity?: Entity | null;
    relation?: Relation;
    label: string;
    importance?: number;
    isRelationNode?: boolean;
  };
}

export function EntityNode({ data }: EntityNodeProps) {
  const { entity, relation, label, importance = 0, isRelationNode = false } = data;
  
  const getNodeColor = () => {
    if (isRelationNode) {
      return 'bg-amber-100 border-amber-500';
    }
    if (!entity) return 'bg-gray-500';
    
    if (entity.type_facial_data_id && entity.type_text_data_id) {
      return 'bg-purple-500';
    } else if (entity.type_facial_data_id) {
      return 'bg-blue-500';
    } else if (entity.type_text_data_id) {
      return 'bg-green-500';
    }
    return 'bg-gray-500';
  };

  const getImportanceSize = () => {
    if (isRelationNode) {
      return 140; // Fixed size for relation nodes
    }
    const baseSize = 120;
    const scale = 1 + (importance * 0.3); // Reduced scaling factor
    return baseSize * scale;
  };

  const size = getImportanceSize();

  return (
    <div
      className={`${getNodeColor()} rounded-lg shadow-lg p-3 ${isRelationNode ? 'text-amber-900 border-2 border-dashed' : 'text-white'} relative`}
      style={{ width: size, minHeight: 70 }}
    >
      <Handle type="target" position={Position.Top} id="top" className="w-2 h-2" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2" />
      
      <div className="text-xs font-semibold mb-1 truncate">{label}</div>
      
      {isRelationNode && relation ? (
        <div className="text-xs opacity-80">
          <div>🔗 Relation</div>
          <div className="mt-1">
            {relation.subject_entity_id ? 'E' : 'R'}:{(relation.subject_entity_id || relation.subject_relation_id)?.slice(0, 4)}
            {' → '}
            {relation.object_entity_id ? 'E' : 'R'}:{(relation.object_entity_id || relation.object_relation_id)?.slice(0, 4)}
          </div>
        </div>
      ) : entity ? (
        <div className="text-xs opacity-80">
          {entity.type_facial_data_id && entity.type_text_data_id && '👤 + 📝'}
          {entity.type_facial_data_id && !entity.type_text_data_id && '👤 Facial'}
          {!entity.type_facial_data_id && entity.type_text_data_id && '📝 Text'}
        </div>
      ) : null}
      
      {importance > 0 && !isRelationNode && (
        <div className="text-xs mt-1 opacity-70">
          Importance: {(importance * 100).toFixed(0)}%
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2" />
    </div>
  );
}