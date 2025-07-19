'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelationNodeData } from '@/types/react-flow';

export function RelationNode({ data, selected }: NodeProps<RelationNodeData>) {
  return (
    <div 
      className={`bg-gray-50/90 backdrop-blur-sm rounded border ${selected ? 'border-blue-600' : 'border-gray-600'} overflow-hidden relative min-w-[120px]`}
      data-test={`relation-node-${data.relation.id}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 bg-gray-400 border-2 border-white -top-1.5"
        data-test="relation-node-handle-target-top"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-gray-400 border-2 border-white -left-1.5"
        data-test="relation-node-handle-target-left"
      />
      
      {/* Title Bar */}
      <div className="bg-gray-600 px-2 py-1">
        <div className="text-white text-xs font-medium text-center">
          Relation
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-2 py-1.5 text-center">
        <div className="font-medium text-gray-700 text-xs">
          {data.label}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 bg-gray-400 border-2 border-white -bottom-1.5"
        data-test="relation-node-handle-source-bottom"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-gray-400 border-2 border-white -right-1.5"
        data-test="relation-node-handle-source-right"
      />
    </div>
  );
}