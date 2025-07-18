import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Entity } from '@/db/types';

interface EntityNodeProps {
  data: {
    entity: Entity;
    label: string;
    importance?: number;
  };
}

export function EntityNode({ data }: EntityNodeProps) {
  const { entity, label, importance = 0 } = data;
  
  const getNodeColor = () => {
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
    const baseSize = 150;
    const scale = 1 + (importance * 0.5);
    return baseSize * scale;
  };

  const size = getImportanceSize();

  return (
    <div
      className={`${getNodeColor()} rounded-lg shadow-lg p-4 text-white relative`}
      style={{ width: size, minHeight: 80 }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="text-sm font-semibold mb-1">{label}</div>
      
      <div className="text-xs opacity-80">
        {entity.type_facial_data_id && entity.type_text_data_id && '👤 + 📝'}
        {entity.type_facial_data_id && !entity.type_text_data_id && '👤 Facial'}
        {!entity.type_facial_data_id && entity.type_text_data_id && '📝 Text'}
      </div>
      
      {importance > 0 && (
        <div className="text-xs mt-1 opacity-70">
          Importance: {(importance * 100).toFixed(0)}%
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}