import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { EntityNodeData } from '@/types/react-flow';
import { User, FileText, Image, Crop, Scissors } from 'lucide-react';
import { ImageCropDialog } from './ImageCropDialog';

export function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const { entity, label, importance = 0, imageUrl } = data;
  const [showCropDialog, setShowCropDialog] = useState(false);
  
  const getImportanceSize = () => {
    const baseSize = 160;
    const scale = 1 + (importance * 0.3);
    return baseSize * scale;
  };

  const size = getImportanceSize();

  const getEntityIcon = () => {
    if (entity.type_image_portion_id) return <Crop className="h-3 w-3 flex-shrink-0" />;
    if (entity.type_image_data_id) return <Image className="h-3 w-3 flex-shrink-0" />;
    if (entity.type_text_data_id) return <FileText className="h-3 w-3 flex-shrink-0" />;
    return <User className="h-3 w-3 flex-shrink-0" />;
  };

  const handleCropCreate = async (cropData: { x: number; y: number; width: number; height: number; label?: string }) => {
    try {
      // Create the image portion entity type
      const requestData = {
        source_image_entity_id: entity.id,
        ...cropData,
      };
      console.log('Creating image portion with data:', requestData);
      
      const portionResponse = await fetch('/api/entity-types/image-portion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!portionResponse.ok) {
        const errorData = await portionResponse.json();
        console.error('Failed to create image portion:', errorData);
        throw new Error(errorData.error || 'Failed to create image portion');
      }

      const { imagePortion } = await portionResponse.json();

      // Create the entity with the image portion
      const entityResponse = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_image_portion_id: imagePortion.id,
        }),
      });

      if (!entityResponse.ok) {
        const errorData = await entityResponse.json();
        console.error('Failed to create entity:', errorData);
        throw new Error(errorData.error || 'Failed to create entity');
      }

      const newEntity = await entityResponse.json();
      
      // Create "contains" relation between source image and cropped portion
      const relationResponse = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_entity_id: entity.id,
          predicate: 'contains',
          object_entity_id: newEntity.entity.id,
        }),
      });

      if (!relationResponse.ok) {
        const errorData = await relationResponse.json();
        console.error('Failed to create relation:', errorData);
        throw new Error(errorData.error || 'Failed to create relation');
      }

      const relation = await relationResponse.json();
      console.log('Created relation:', relation);
      
      // TODO: Add the new entity to the flow
      // This would typically be handled by a callback prop or state management
      console.log('Created image portion entity:', newEntity);
      
    } catch (error) {
      console.error('Failed to create crop:', error);
      throw error;
    }
  };

  return (
    <>
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
          <div className="mb-2 relative group" data-test="entity-image-preview">
            <img 
              src={imageUrl} 
              alt={label}
              className="w-full h-auto rounded shadow-sm"
              style={{ maxHeight: 200, objectFit: 'contain' }}
              loading="lazy"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCropDialog(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Create image portion"
              data-test="entity-crop-button"
            >
              <Scissors className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        )}
        
        {/* Text Content Display */}
        {entity.type_text_data_id && entity.text_content && (
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words" data-test="entity-text-content">
            {entity.text_content}
          </div>
        )}
        
        {/* Image Portion Display */}
        {entity.type_image_portion_id && entity.image_portion && (
          <div className="space-y-2" data-test="entity-image-portion">
            <img
              src={`/api/entity-types/image-portion/${entity.type_image_portion_id}/img.png`}
              alt={entity.image_portion.label || 'Image portion'}
              className="w-full h-auto rounded border border-gray-300"
              style={{ 
                maxWidth: '200px',
                maxHeight: '200px',
                objectFit: 'contain',
              }}
              loading="lazy"
              data-test="entity-image-portion-preview"
            />
            {entity.image_portion.confidence !== null && (
              <div className="text-xs text-gray-500">
                Confidence: {(entity.image_portion.confidence * 100).toFixed(1)}%
              </div>
            )}
            <div className="text-xs text-gray-400">
              {entity.image_portion.width}×{entity.image_portion.height}px
            </div>
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

      {/* Image Crop Dialog */}
      {entity.type_image_data_id && imageUrl && (
        <ImageCropDialog
          isOpen={showCropDialog}
          onClose={() => setShowCropDialog(false)}
          imageUrl={imageUrl}
          onCropCreate={handleCropCreate}
        />
      )}
    </>
  );
}