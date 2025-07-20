'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crop, Save } from 'lucide-react';

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropCreate: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  }) => Promise<void>;
}

interface CropSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropDialog({ isOpen, onClose, imageUrl, onCropCreate }: ImageCropDialogProps) {
  const [selection, setSelection] = useState<CropSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelection(null);
      setLabel('');
      setIsSelecting(false);
    }
  }, [isOpen]);

  const getMousePosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePosition(e);
    setStartPoint(pos);
    setIsSelecting(true);
    setSelection({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    
    const pos = getMousePosition(e);
    const x = Math.min(startPoint.x, pos.x);
    const y = Math.min(startPoint.y, pos.y);
    const width = Math.abs(pos.x - startPoint.x);
    const height = Math.abs(pos.y - startPoint.y);
    
    setSelection({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleSave = async () => {
    if (!selection || !imageRef.current) return;
    
    // Convert pixel coordinates to actual image coordinates
    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    const cropData = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      width: Math.round(selection.width * scaleX),
      height: Math.round(selection.height * scaleY),
      label: label.trim() || undefined,
    };
    
    setIsCreating(true);
    try {
      await onCropCreate(cropData);
      onClose();
    } catch (error) {
      console.error('Failed to create crop:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const dialogContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Create Image Portion
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-test="crop-dialog-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            Click and drag on the image to select a region. You can add an optional label for the selection.
          </div>

          {/* Image Container */}
          <div 
            ref={containerRef}
            className="relative inline-block cursor-crosshair border-2 border-gray-300 rounded-lg overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-test="crop-image-container"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Source image"
              className="max-w-full max-h-[500px] block"
              draggable={false}
            />
            
            {/* Selection Box */}
            {selection && selection.width > 0 && selection.height > 0 && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                  left: `${selection.x}px`,
                  top: `${selection.y}px`,
                  width: `${selection.width}px`,
                  height: `${selection.height}px`,
                }}
                data-test="crop-selection-box"
              >
                <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                  {selection.width} × {selection.height}
                </div>
              </div>
            )}
          </div>

          {/* Label Input */}
          {selection && selection.width > 0 && selection.height > 0 && (
            <div className="space-y-2">
              <label htmlFor="crop-label" className="block text-sm font-medium text-gray-700">
                Label (optional)
              </label>
              <input
                id="crop-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Face, Logo, Text Region"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-test="crop-label-input"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isCreating}
            data-test="crop-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selection || selection.width === 0 || selection.height === 0 || isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-test="crop-save-button"
          >
            <Save className="w-4 h-4" />
            {isCreating ? 'Creating...' : 'Create Portion'}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside of ReactFlow context
  if (typeof window !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }

  return null;
}