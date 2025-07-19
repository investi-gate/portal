import { test, expect, Page } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

test.describe('Graph Interactions', () => {
  let dbUtils: TestDatabaseUtils;
  let testEntities: string[] = [];
  let testRelations: string[] = [];

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    // Clean database and create test data
    await dbUtils.cleanDatabase();
    
    // Create a simple network for testing interactions
    testEntities = [
      await dbUtils.createTestEntity({ facial: true, text: false }),
      await dbUtils.createTestEntity({ facial: false, text: true }),
      await dbUtils.createTestEntity({ facial: true, text: true }),
      await dbUtils.createTestEntity({ facial: false, text: true })
    ];
    
    testRelations = [
      await dbUtils.createTestRelation(testEntities[0], 'knows', testEntities[1]),
      await dbUtils.createTestRelation(testEntities[1], 'works_with', testEntities[2]),
      await dbUtils.createTestRelation(testEntities[2], 'manages', testEntities[3])
    ];
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for ReactFlow to initialize
    await page.waitForSelector('.react-flow__renderer', { state: 'visible' });
  });

  test.afterAll(async () => {
    await dbUtils.close();
  });

  // Helper function to get node position
  async function getNodePosition(page: Page, nodeIndex: number) {
    return await page.locator('.react-flow__node').nth(nodeIndex).evaluate(el => {
      const transform = el.style.transform;
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      }
      return { x: 0, y: 0 };
    });
  }

  test.describe('Node Interactions', () => {
    test('should select node on click', async ({ page }) => {
      // Click on a node
      const node = page.locator('.react-flow__node').first();
      await node.click();
      
      // Verify node is selected
      await expect(node).toHaveClass(/selected/);
      
      // Verify selected item info panel shows
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Entity');
      await expect(infoPanel).toContainText('ID:');
    });

    test('should drag and drop node', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      
      // Get initial position
      const initialPos = await getNodePosition(page, 0);
      
      // Drag the node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(initialPos.x + 100, initialPos.y + 100);
      await page.mouse.up();
      
      // Get new position
      const newPos = await getNodePosition(page, 0);
      
      // Verify node moved
      expect(newPos.x).toBeGreaterThan(initialPos.x);
      expect(newPos.y).toBeGreaterThan(initialPos.y);
    });

    test('should show node context menu on right click', async ({ page }) => {
      // Right-click on a node
      const node = page.locator('.react-flow__node').first();
      await node.click({ button: 'right' });
      
      // Verify context menu appears
      const contextMenu = page.getByTestId('node-context-menu');
      await expect(contextMenu).toBeVisible();
      
      // Verify menu options
      await expect(contextMenu.getByTestId('edit-node')).toBeVisible();
      await expect(contextMenu.getByTestId('delete-node')).toBeVisible();
      await expect(contextMenu.getByTestId('duplicate-node')).toBeVisible();
      await expect(contextMenu.getByTestId('connect-node')).toBeVisible();
    });

    test('should highlight connected nodes on hover', async ({ page }) => {
      // Hover over a node
      const node = page.locator('.react-flow__node').nth(1); // Middle node with connections
      await node.hover();
      
      // Verify connected nodes are highlighted
      const connectedNodes = page.locator('.react-flow__node.highlighted');
      await expect(connectedNodes).toHaveCount(2); // Two connected nodes
    });

    test('should multi-select nodes with ctrl/cmd click', async ({ page }) => {
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';
      
      // Select first node
      await page.locator('.react-flow__node').first().click();
      
      // Ctrl/Cmd click on second node
      await page.keyboard.down(modifier);
      await page.locator('.react-flow__node').nth(1).click();
      await page.keyboard.up(modifier);
      
      // Verify both nodes are selected
      const selectedNodes = page.locator('.react-flow__node.selected');
      await expect(selectedNodes).toHaveCount(2);
      
      // Verify multi-select info panel
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toContainText('2 items selected');
    });

    test('should select nodes with box selection', async ({ page }) => {
      // Get flow pane for box selection
      const flowPane = page.locator('.react-flow__pane');
      
      // Perform box selection
      await flowPane.hover();
      await page.mouse.move(50, 50);
      await page.keyboard.down('Shift');
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();
      await page.keyboard.up('Shift');
      
      // Verify multiple nodes are selected
      const selectedNodes = page.locator('.react-flow__node.selected');
      const count = await selectedNodes.count();
      expect(count).toBeGreaterThan(1);
    });
  });

  test.describe('Edge Interactions', () => {
    test('should select edge on click', async ({ page }) => {
      // Click on an edge
      const edge = page.locator('.react-flow__edge').first();
      await edge.click();
      
      // Verify edge is selected
      await expect(edge).toHaveClass(/selected/);
      
      // Verify selected item info panel shows
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Relation');
      await expect(infoPanel).toContainText('Predicate:');
    });

    test('should show edge context menu on right click', async ({ page }) => {
      // Right-click on an edge
      const edge = page.locator('.react-flow__edge').first();
      await edge.click({ button: 'right' });
      
      // Verify context menu appears
      const contextMenu = page.getByTestId('edge-context-menu');
      await expect(contextMenu).toBeVisible();
      
      // Verify menu options
      await expect(contextMenu.getByTestId('edit-edge')).toBeVisible();
      await expect(contextMenu.getByTestId('delete-edge')).toBeVisible();
      await expect(contextMenu.getByTestId('reverse-edge')).toBeVisible();
    });

    test('should highlight edge on hover', async ({ page }) => {
      // Hover over an edge
      const edge = page.locator('.react-flow__edge').first();
      await edge.hover();
      
      // Verify edge is highlighted
      await expect(edge).toHaveClass(/highlighted/);
      
      // Verify connected nodes are also highlighted
      const highlightedNodes = page.locator('.react-flow__node.highlighted');
      await expect(highlightedNodes).toHaveCount(2);
    });
  });

  test.describe('Graph Controls', () => {
    test('should zoom in and out', async ({ page }) => {
      // Get initial zoom level
      const viewport = page.locator('.react-flow__viewport');
      const initialTransform = await viewport.getAttribute('transform');
      
      // Click zoom in button
      await page.getByTestId('zoom-in-button').click();
      await page.waitForTimeout(300);
      
      // Verify zoom changed
      const zoomedInTransform = await viewport.getAttribute('transform');
      expect(zoomedInTransform).not.toBe(initialTransform);
      
      // Click zoom out button
      await page.getByTestId('zoom-out-button').click();
      await page.waitForTimeout(300);
      
      // Verify zoom changed again
      const zoomedOutTransform = await viewport.getAttribute('transform');
      expect(zoomedOutTransform).not.toBe(zoomedInTransform);
    });

    test('should fit view to show all nodes', async ({ page }) => {
      // Move a node far away
      const node = page.locator('.react-flow__node').first();
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(1000, 1000);
      await page.mouse.up();
      
      // Click fit view button
      await page.getByTestId('fit-view-button').click();
      
      // Verify all nodes are visible
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      
      for (let i = 0; i < nodeCount; i++) {
        await expect(nodes.nth(i)).toBeInViewport();
      }
    });

    test('should toggle minimap', async ({ page }) => {
      // Verify minimap is initially visible
      const minimap = page.locator('.react-flow__minimap');
      await expect(minimap).toBeVisible();
      
      // Toggle minimap off
      await page.getByTestId('toggle-minimap').click();
      await expect(minimap).toBeHidden();
      
      // Toggle minimap on
      await page.getByTestId('toggle-minimap').click();
      await expect(minimap).toBeVisible();
    });

    test('should navigate using minimap', async ({ page }) => {
      // Get initial viewport position
      const viewport = page.locator('.react-flow__viewport');
      const initialTransform = await viewport.getAttribute('transform');
      
      // Click on minimap to navigate
      const minimap = page.locator('.react-flow__minimap');
      await minimap.click({ position: { x: 10, y: 10 } });
      
      // Verify viewport changed
      await page.waitForTimeout(300);
      const newTransform = await viewport.getAttribute('transform');
      expect(newTransform).not.toBe(initialTransform);
    });

    test('should toggle controls panel', async ({ page }) => {
      // Verify controls are initially visible
      const controls = page.locator('.react-flow__controls');
      await expect(controls).toBeVisible();
      
      // Toggle controls off
      await page.getByTestId('toggle-controls').click();
      await expect(controls).toBeHidden();
      
      // Toggle controls on
      await page.getByTestId('toggle-controls').click();
      await expect(controls).toBeVisible();
    });
  });

  test.describe('Edge Creation', () => {
    test('should create edge by dragging from node handle', async ({ page }) => {
      // Get initial edge count
      const initialEdgeCount = await page.locator('.react-flow__edge').count();
      
      // Find source and target nodes
      const sourceNode = page.locator('.react-flow__node').first();
      const targetNode = page.locator('.react-flow__node').last();
      
      // Get handle positions
      const sourceHandle = sourceNode.locator('.source');
      const targetHandle = targetNode.locator('.target');
      
      // Drag from source to target
      await sourceHandle.hover();
      await page.mouse.down();
      await targetHandle.hover();
      await page.mouse.up();
      
      // Fill in predicate in the dialog
      await expect(page.getByTestId('create-edge-dialog')).toBeVisible();
      await page.getByTestId('edge-predicate-input').fill('connected_to');
      await page.getByTestId('create-edge-button').click();
      
      // Verify new edge is created
      await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount + 1);
    });

    test('should cancel edge creation', async ({ page }) => {
      // Get initial edge count
      const initialEdgeCount = await page.locator('.react-flow__edge').count();
      
      // Start edge creation
      const sourceHandle = page.locator('.react-flow__node').first().locator('.source');
      await sourceHandle.hover();
      await page.mouse.down();
      
      // Cancel by pressing Escape
      await page.keyboard.press('Escape');
      await page.mouse.up();
      
      // Verify no new edge is created
      await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should delete selected node with Delete key', async ({ page }) => {
      // Get initial node count
      const initialNodeCount = await page.locator('.react-flow__node').count();
      
      // Select a node
      await page.locator('.react-flow__node').first().click();
      
      // Press Delete
      await page.keyboard.press('Delete');
      
      // Confirm deletion if dialog appears
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify node is deleted
      await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCount - 1);
    });

    test('should select all nodes with Ctrl/Cmd+A', async ({ page }) => {
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';
      
      // Select all
      await page.keyboard.press(`${modifier}+a`);
      
      // Verify all nodes are selected
      const selectedNodes = page.locator('.react-flow__node.selected');
      const totalNodes = page.locator('.react-flow__node');
      
      const selectedCount = await selectedNodes.count();
      const totalCount = await totalNodes.count();
      
      expect(selectedCount).toBe(totalCount);
    });

    test('should copy and paste nodes', async ({ page }) => {
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';
      
      // Get initial node count
      const initialNodeCount = await page.locator('.react-flow__node').count();
      
      // Select a node
      await page.locator('.react-flow__node').first().click();
      
      // Copy
      await page.keyboard.press(`${modifier}+c`);
      
      // Move mouse to new position
      await page.mouse.move(200, 200);
      
      // Paste
      await page.keyboard.press(`${modifier}+v`);
      
      // Verify new node is created
      await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCount + 1);
    });

    test('should undo and redo actions', async ({ page }) => {
      const isMac = process.platform === 'darwin';
      const modifier = isMac ? 'Meta' : 'Control';
      
      // Get initial position
      const node = page.locator('.react-flow__node').first();
      const initialPos = await getNodePosition(page, 0);
      
      // Move node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(initialPos.x + 100, initialPos.y + 100);
      await page.mouse.up();
      
      // Verify node moved
      const movedPos = await getNodePosition(page, 0);
      expect(movedPos.x).toBeGreaterThan(initialPos.x);
      
      // Undo
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForTimeout(300);
      
      // Verify node returned to initial position
      const undonePos = await getNodePosition(page, 0);
      expect(Math.abs(undonePos.x - initialPos.x)).toBeLessThan(5);
      
      // Redo
      await page.keyboard.press(`${modifier}+y`);
      await page.waitForTimeout(300);
      
      // Verify node moved again
      const redonePos = await getNodePosition(page, 0);
      expect(redonePos.x).toBeGreaterThan(initialPos.x);
    });
  });

  test.describe('Layout Options', () => {
    test('should apply automatic layout', async ({ page }) => {
      // Get initial node positions
      const nodeCount = await page.locator('.react-flow__node').count();
      const initialPositions = [];
      for (let i = 0; i < nodeCount; i++) {
        initialPositions.push(await getNodePosition(page, i));
      }
      
      // Apply automatic layout
      await page.getByTestId('layout-button').click();
      await page.getByTestId('layout-hierarchical').click();
      
      // Wait for animation
      await page.waitForTimeout(1000);
      
      // Get new positions
      const newPositions = [];
      for (let i = 0; i < nodeCount; i++) {
        newPositions.push(await getNodePosition(page, i));
      }
      
      // Verify positions changed
      let positionsChanged = false;
      for (let i = 0; i < nodeCount; i++) {
        if (initialPositions[i].x !== newPositions[i].x || 
            initialPositions[i].y !== newPositions[i].y) {
          positionsChanged = true;
          break;
        }
      }
      expect(positionsChanged).toBe(true);
    });

    test('should switch between layout types', async ({ page }) => {
      // Apply hierarchical layout
      await page.getByTestId('layout-button').click();
      await page.getByTestId('layout-hierarchical').click();
      await page.waitForTimeout(1000);
      
      const hierarchicalPositions = [];
      const nodeCount = await page.locator('.react-flow__node').count();
      for (let i = 0; i < nodeCount; i++) {
        hierarchicalPositions.push(await getNodePosition(page, i));
      }
      
      // Apply circular layout
      await page.getByTestId('layout-button').click();
      await page.getByTestId('layout-circular').click();
      await page.waitForTimeout(1000);
      
      const circularPositions = [];
      for (let i = 0; i < nodeCount; i++) {
        circularPositions.push(await getNodePosition(page, i));
      }
      
      // Verify layouts are different
      let layoutsDiffer = false;
      for (let i = 0; i < nodeCount; i++) {
        if (hierarchicalPositions[i].x !== circularPositions[i].x || 
            hierarchicalPositions[i].y !== circularPositions[i].y) {
          layoutsDiffer = true;
          break;
        }
      }
      expect(layoutsDiffer).toBe(true);
    });
  });

  test.describe('Graph Export', () => {
    test('should export graph as image', async ({ page }) => {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Export as image
      await page.getByTestId('export-button').click();
      await page.getByTestId('export-as-png').click();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/graph.*\.png$/);
    });

    test('should export graph data as JSON', async ({ page }) => {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      
      // Export as JSON
      await page.getByTestId('export-button').click();
      await page.getByTestId('export-as-json').click();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/graph.*\.json$/);
    });
  });

  test.describe('Performance with Large Graphs', () => {
    test('should handle large number of nodes efficiently', async ({ page }) => {
      // Create many entities
      const entityPromises = [];
      for (let i = 0; i < 50; i++) {
        entityPromises.push(dbUtils.createTestEntity({ 
          facial: i % 2 === 0, 
          text: i % 2 === 1 
        }));
      }
      const entities = await Promise.all(entityPromises);
      
      // Create connections
      for (let i = 0; i < entities.length - 1; i++) {
        await dbUtils.createTestRelation(entities[i], 'connected', entities[i + 1]);
      }
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Measure rendering time
      const startTime = Date.now();
      await page.waitForSelector('.react-flow__node');
      const renderTime = Date.now() - startTime;
      
      // Verify reasonable render time (less than 5 seconds)
      expect(renderTime).toBeLessThan(5000);
      
      // Verify all nodes are rendered
      await expect(page.locator('.react-flow__node')).toHaveCount(50);
      
      // Test interaction performance
      const interactionStart = Date.now();
      await page.locator('.react-flow__node').first().click();
      await expect(page.locator('.react-flow__node.selected')).toBeVisible();
      const interactionTime = Date.now() - interactionStart;
      
      // Verify reasonable interaction time (less than 500ms)
      expect(interactionTime).toBeLessThan(500);
    });
  });
});