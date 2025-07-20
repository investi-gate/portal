import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { EntityNodeData } from '@/types/react-flow';
import { User, FileText, Image } from 'lucide-react';

export function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { entity, label, importance = 0, imageUrl } = data;
  
  const getImportanceSize = () => {
    const baseSize = 160;
    const scale = 1 + (importance * 0.3);
    return baseSize * scale;
  };

  const size = getImportanceSize();

  const getEntityIcon = () => {
    if (entity.type_image_data_id) return <Image className="h-3 w-3 flex-shrink-0" />;
    if (entity.type_text_data_id) return <FileText className="h-3 w-3 flex-shrink-0" />;
    return <User className="h-3 w-3 flex-shrink-0" />;
  };

  return (
    <div
      className="bg-gray-50/90 backdrop-blur-sm rounded border border-gray-700 overflow-hidden relative"
      style={{ width: size, minHeight: 60, maxHeight: 300 }}
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
        <div className="flex items-center gap-1.5 text-white text-xs font-medium text-left">
          {getEntityIcon()}
          <span className="truncate" data-test="entity-node-label">{label}</span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-2 py-1.5 text-left overflow-y-auto" style={{ maxHeight: 240 }}>
        
        {/* Image Preview Display */}
        {entity.type_image_data_id && imageUrl && (
          <div className="mb-2" data-test="entity-image-preview">
            <img 
              src={imageUrl} 
              alt={label}
              className="w-full h-auto rounded shadow-sm"
              style={{ maxHeight: 200, objectFit: 'contain' }}
              loading="lazy"
            />
          </div>
        )}
        
        {/* Text Content Display */}
        {entity.type_text_data_id && entity.text_content && (
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words" data-test="entity-text-content">
            {entity.text_content}
          </div>
        )}
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