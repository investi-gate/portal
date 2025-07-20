import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { EntityNodeData } from '@/types/react-flow';
import { User, FileText, Image } from 'lucide-react';

export function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { entity, label, importance = 0 } = data;
  
  const getImportanceSize = () => {
    const baseSize = 160;
    const scale = 1 + (importance * 0.3);
    return baseSize * scale;
  };

  const size = getImportanceSize();

  return (
    <div
      className="bg-gray-50/90 backdrop-blur-sm rounded border border-gray-700 overflow-hidden relative"
      style={{ width: size, minHeight: 60 }}
      data-test={`entity-node-${entity.id}`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="w-3 h-3 bg-gray-400 border-2 border-white -top-1.5" 
        data-test="entity-node-handle-target-top"
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="w-3 h-3 bg-gray-400 border-2 border-white -left-1.5" 
        data-test="entity-node-handle-target-left"
      />
      
      {/* Title Bar */}
      <div className="bg-gray-700 px-2 py-1">
        <div className="text-white text-xs font-medium truncate" data-test="entity-node-label">
          {label}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1 text-xs text-gray-700" data-test="entity-node-type">
          {entity.type_facial_data_id && <User className="h-3 w-3" />}
          {entity.type_text_data_id && <FileText className="h-3 w-3" />}
          {entity.type_image_data_id && <Image className="h-3 w-3" aria-hidden="true" />}
          <span>
            {(() => {
              const types = [];
              if (entity.type_facial_data_id) types.push('Facial');
              if (entity.type_text_data_id) types.push('Text');
              if (entity.type_image_data_id) types.push('Image');
              
              if (types.length === 0) return 'Unknown';
              if (types.length === 1) return types[0];
              if (types.length === 2) return types.join(' & ');
              return 'Multi-type';
            })()}
          </span>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-3 h-3 bg-gray-400 border-2 border-white -bottom-1.5" 
        data-test="entity-node-handle-source-bottom"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 bg-gray-400 border-2 border-white -right-1.5" 
        data-test="entity-node-handle-source-right"
      />
    </div>
  );
}