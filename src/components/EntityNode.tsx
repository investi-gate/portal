import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { EntityNodeData } from '@/types/react-flow';

export function EntityNode({ data }: NodeProps<EntityNodeData>) {
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
    const baseSize = 120;
    const scale = 1 + (importance * 0.3); // Reduced scaling factor
    return baseSize * scale;
  };

  const size = getImportanceSize();

  return (
    <div
      className={`${getNodeColor()} rounded-lg shadow-lg p-3 text-white relative`}
      style={{ width: size, minHeight: 70 }}
      data-test={`entity-node-${entity.id}`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="w-2 h-2" 
        data-test="entity-node-handle-target-top"
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="w-2 h-2" 
        data-test="entity-node-handle-target-left"
      />
      
      <div className="text-xs font-semibold mb-1 truncate" data-test="entity-node-label">
        {label}
      </div>
      
      <div className="text-xs opacity-80" data-test="entity-node-type">
        {entity.type_facial_data_id && entity.type_text_data_id && '👤 + 📝'}
        {entity.type_facial_data_id && !entity.type_text_data_id && '👤 Facial'}
        {!entity.type_facial_data_id && entity.type_text_data_id && '📝 Text'}
      </div>
      
      {importance > 0 && (
        <div className="text-xs mt-1 opacity-70" data-test="entity-node-importance">
          Importance: {(importance * 100).toFixed(0)}%
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-2 h-2" 
        data-test="entity-node-handle-source-bottom"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-2 h-2" 
        data-test="entity-node-handle-source-right"
      />
    </div>
  );
}