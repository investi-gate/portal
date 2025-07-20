'use client';

import React, { useRef, useEffect } from 'react';
import { proxy, useSnapshot } from 'valtio';
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

// Create the state proxy outside the component
const imageCropState = proxy<{
  selection: CropSelection | null;
  isSelecting: boolean;
  startPoint: { x: number; y: number };
  label: string;
  isCreating: boolean;
}>({
  selection: null,
  isSelecting: false,
  startPoint: { x: 0, y: 0 },
  label: '',
  isCreating: false,
});

export function ImageCropDialog({ isOpen, onClose, imageUrl, onCropCreate }: ImageCropDialogProps) {
  const state = useSnapshot(imageCropState);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      imageCropState.selection = null;
      imageCropState.label = '';
      imageCropState.isSelecting = false;
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
    imageCropState.startPoint = pos;
    imageCropState.isSelecting = true;
    imageCropState.selection = {
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!state.isSelecting) return;
    
    const pos = getMousePosition(e);
    const x = Math.min(state.startPoint.x, pos.x);
    const y = Math.min(state.startPoint.y, pos.y);
    const width = Math.abs(pos.x - state.startPoint.x);
    const height = Math.abs(pos.y - state.startPoint.y);
    
    imageCropState.selection = { x, y, width, height };
  };

  const handleMouseUp = () => {
    imageCropState.isSelecting = false;
  };

  const handleSave = async () => {
    if (!state.selection || !imageRef.current) return;
    
    // Convert pixel coordinates to actual image coordinates
    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    const cropData = {
      x: Math.round(state.selection.x * scaleX),
      y: Math.round(state.selection.y * scaleY),
      width: Math.round(state.selection.width * scaleX),
      height: Math.round(state.selection.height * scaleY),
      label: state.label.trim() || undefined,
    };
    
    imageCropState.isCreating = true;
    try {
      await onCropCreate(cropData);
      onClose();
    } catch (error) {
      console.error('Failed to create crop:', error);
    } finally {
      imageCropState.isCreating = false;
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
            {state.selection && state.selection.width > 0 && state.selection.height > 0 && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                style={{
                  left: `${state.selection.x}px`,
                  top: `${state.selection.y}px`,
                  width: `${state.selection.width}px`,
                  height: `${state.selection.height}px`,
                }}
                data-test="crop-selection-box"
              >
                <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                  {state.selection.width} × {state.selection.height}
                </div>
              </div>
            )}
          </div>

          {/* Label Input */}
          {state.selection && state.selection.width > 0 && state.selection.height > 0 && (
            <div className="space-y-2">
              <label htmlFor="crop-label" className="block text-sm font-medium text-gray-700">
                Label (optional)
              </label>
              <input
                id="crop-label"
                type="text"
                value={state.label}
                onChange={(e) => imageCropState.label = e.target.value}
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
            disabled={state.isCreating}
            data-test="crop-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!state.selection || state.selection.width === 0 || state.selection.height === 0 || state.isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-test="crop-save-button"
          >
            <Save className="w-4 h-4" />
            {state.isCreating ? 'Creating...' : 'Create Portion'}
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