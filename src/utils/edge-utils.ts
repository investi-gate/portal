import { Position } from '@xyflow/react';
import { InvestigationNode } from '@/types/react-flow';

interface ConnectionPoints {
  sourcePosition: Position;
  targetPosition: Position;
}

/**
 * Determines the optimal connection points between two nodes based on their relative positions
 */
export function getOptimalConnectionPoints(
  sourceNode: InvestigationNode,
  targetNode: InvestigationNode
): ConnectionPoints {
  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;
  
  // Determine the dominant direction
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  // If nodes are more horizontally separated
  if (absDx > absDy * 1.5) {
    if (dx > 0) {
      // Target is to the right of source
      return {
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    } else {
      // Target is to the left of source
      return {
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      };
    }
  }
  
  // If nodes are more vertically separated
  if (absDy > absDx * 1.5) {
    if (dy > 0) {
      // Target is below source
      return {
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    } else {
      // Target is above source
      return {
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
    }
  }
  
  // For diagonal connections, choose based on quadrant
  if (dx > 0 && dy > 0) {
    // Target is bottom-right of source
    // Prefer horizontal connection if more horizontal, vertical if more vertical
    if (absDx > absDy) {
      return {
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    } else {
      return {
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    }
  } else if (dx > 0 && dy < 0) {
    // Target is top-right of source
    if (absDx > absDy) {
      return {
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    } else {
      return {
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
    }
  } else if (dx < 0 && dy > 0) {
    // Target is bottom-left of source
    if (absDx > absDy) {
      return {
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      };
    } else {
      return {
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    }
  } else {
    // Target is top-left of source
    if (absDx > absDy) {
      return {
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      };
    } else {
      return {
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
    }
  }
}

/**
 * Special handling for relation nodes which act as intermediaries
 * This ensures smoother flow through relation nodes
 */
export function getRelationNodeConnectionPoints(
  sourceNode: InvestigationNode,
  relationNode: InvestigationNode,
  targetNode: InvestigationNode
): {
  sourceToRelation: ConnectionPoints;
  relationToTarget: ConnectionPoints;
} {
  // For relation nodes, we want to create a flow-through effect
  // Determine the general flow direction from source to target
  const flowDx = targetNode.position.x - sourceNode.position.x;
  const flowDy = targetNode.position.y - sourceNode.position.y;
  
  const absFlowDx = Math.abs(flowDx);
  const absFlowDy = Math.abs(flowDy);
  
  // Horizontal flow
  if (absFlowDx > absFlowDy * 1.5) {
    if (flowDx > 0) {
      // Left to right flow
      return {
        sourceToRelation: getOptimalConnectionPoints(sourceNode, relationNode),
        relationToTarget: getOptimalConnectionPoints(relationNode, targetNode),
      };
    } else {
      // Right to left flow
      return {
        sourceToRelation: getOptimalConnectionPoints(sourceNode, relationNode),
        relationToTarget: getOptimalConnectionPoints(relationNode, targetNode),
      };
    }
  }
  
  // Vertical flow
  if (absFlowDy > absFlowDx * 1.5) {
    if (flowDy > 0) {
      // Top to bottom flow
      return {
        sourceToRelation: getOptimalConnectionPoints(sourceNode, relationNode),
        relationToTarget: getOptimalConnectionPoints(relationNode, targetNode),
      };
    } else {
      // Bottom to top flow
      return {
        sourceToRelation: getOptimalConnectionPoints(sourceNode, relationNode),
        relationToTarget: getOptimalConnectionPoints(relationNode, targetNode),
      };
    }
  }
  
  // Diagonal flow - use default optimal connections
  return {
    sourceToRelation: getOptimalConnectionPoints(sourceNode, relationNode),
    relationToTarget: getOptimalConnectionPoints(relationNode, targetNode),
  };
}