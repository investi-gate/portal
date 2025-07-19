'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { RelationNodeData } from '@/types/react-flow';

export function RelationNode({ data, selected }: NodeProps<RelationNodeData>) {
  return (
    <div 
      className={`
        px-4 py-3 rounded-lg shadow-lg border-2 transition-all
        ${selected 
          ? 'border-blue-500 shadow-blue-200' 
          : 'border-purple-400 shadow-purple-100'
        }
        bg-gradient-to-br from-purple-50 to-purple-100
        hover:shadow-xl hover:scale-105
        min-w-[120px] text-center
      `}
      data-test={`relation-node-${data.relation.id}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        data-test="relation-node-handle-target-top"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        data-test="relation-node-handle-target-left"
      />
      
      <div className="font-medium text-purple-900 text-sm">
        {data.label}
      </div>
      
      <div className="text-xs text-purple-600 mt-1">
        Relation
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        data-test="relation-node-handle-source-bottom"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        data-test="relation-node-handle-source-right"
      />
    </div>
  );
}