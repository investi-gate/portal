import { test, expect, Page, Locator } from '@playwright/test';
import { TestDatabaseUtils } from './helpers/db-utils';

// Helper class for graph interactions
class GraphInteractionHelper {
  constructor(private page: Page) {}

  async getNodePosition(nodeIndex: number) {
    return await this.page.locator('.react-flow__node').nth(nodeIndex).evaluate(el => {
      const transform = el.style.transform;
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
      if (match) {
        return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      }
      return { x: 0, y: 0 };
    });
  }

  async selectNode(node: Locator) {
    await node.click();
    await expect(node).toHaveClass(/selected/);
  }

  async verifySelectedItemInfo(type: 'Entity' | 'Relation', additionalText?: string) {
    const infoPanel = this.page.getByTestId('selected-item-info');
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel).toContainText(type);
    if (additionalText) {
      await expect(infoPanel).toContainText(additionalText);
    }
  }

  async dragNode(nodeIndex: number, deltaX: number, deltaY: number) {
    const node = this.page.locator('.react-flow__node').nth(nodeIndex);
    const initialPos = await this.getNodePosition(nodeIndex);
    
    await node.hover();
    await this.page.mouse.down();
    await this.page.mouse.move(initialPos.x + deltaX, initialPos.y + deltaY);
    await this.page.mouse.up();
    
    return { initialPos, newPos: await this.getNodePosition(nodeIndex) };
  }

  async rightClickAndVerifyContextMenu(element: Locator, menuType: 'node' | 'edge') {
    await element.click({ button: 'right' });
    const contextMenu = this.page.getByTestId(`${menuType}-context-menu`);
    await expect(contextMenu).toBeVisible();
    return contextMenu;
  }

  async multiSelectWithModifier(nodes: number[]) {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    
    // Select first node
    await this.page.locator('.react-flow__node').nth(nodes[0]).click();
    
    // Ctrl/Cmd click on subsequent nodes
    for (let i = 1; i < nodes.length; i++) {
      await this.page.keyboard.down(modifier);
      await this.page.locator('.react-flow__node').nth(nodes[i]).click();
      await this.page.keyboard.up(modifier);
    }
  }

  async boxSelectNodes(startX: number, startY: number, endX: number, endY: number) {
    const flowPane = this.page.locator('.react-flow__pane');
    await flowPane.hover();
    await this.page.mouse.move(startX, startY);
    await this.page.keyboard.down('Shift');
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    await this.page.keyboard.up('Shift');
  }

  async verifyViewportTransform() {
    const viewport = this.page.locator('.react-flow__viewport');
    return await viewport.getAttribute('transform');
  }

  async createEdgeBetweenNodes(sourceIndex: number, targetIndex: number, predicate: string) {
    const sourceHandle = this.page.locator('.react-flow__node').nth(sourceIndex).locator('.source');
    const targetHandle = this.page.locator('.react-flow__node').nth(targetIndex).locator('.target');
    
    await sourceHandle.hover();
    await this.page.mouse.down();
    await targetHandle.hover();
    await this.page.mouse.up();
    
    await expect(this.page.getByTestId('create-edge-dialog')).toBeVisible();
    await this.page.getByTestId('edge-predicate-input').fill(predicate);
    await this.page.getByTestId('create-edge-button').click();
  }

  async applyLayout(layoutType: 'hierarchical' | 'circular') {
    await this.page.getByTestId('layout-button').click();
    await this.page.getByTestId(`layout-${layoutType}`).click();
    await this.page.waitForTimeout(1000); // Wait for animation
  }

  getModifierKey() {
    return process.platform === 'darwin' ? 'Meta' : 'Control';
  }
}

test.describe('Graph Interactions', () => {
  let dbUtils: TestDatabaseUtils;
  let testEntities: string[] = [];
  let testRelations: string[] = [];
  let helper: GraphInteractionHelper;

  test.beforeAll(async () => {
    dbUtils = new TestDatabaseUtils();
  });

  test.beforeEach(async ({ page }) => {
    helper = new GraphInteractionHelper(page);
    
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
  })

  test.describe('Node Interactions', () => {
    test('should select node on click', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await helper.selectNode(node);
      await helper.verifySelectedItemInfo('Entity', 'ID:');
    });

    test('should drag and drop node', async ({ page }) => {
      const { initialPos, newPos } = await helper.dragNode(0, 100, 100);
      expect(newPos.x).toBeGreaterThan(initialPos.x);
      expect(newPos.y).toBeGreaterThan(initialPos.y);
    });

    test('should show node context menu on right click', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      const contextMenu = await helper.rightClickAndVerifyContextMenu(node, 'node');
      
      // Verify menu options
      await expect(contextMenu.getByTestId('edit-node')).toBeVisible();
      await expect(contextMenu.getByTestId('delete-node')).toBeVisible();
      await expect(contextMenu.getByTestId('duplicate-node')).toBeVisible();
      await expect(contextMenu.getByTestId('connect-node')).toBeVisible();
    });

    test('should highlight connected nodes on hover', async ({ page }) => {
      const node = page.locator('.react-flow__node').nth(1);
      await node.hover();
      
      const connectedNodes = page.locator('.react-flow__node.highlighted');
      await expect(connectedNodes).toHaveCount(2);
    });

    test('should multi-select nodes with ctrl/cmd click', async ({ page }) => {
      await helper.multiSelectWithModifier([0, 1]);
      
      const selectedNodes = page.locator('.react-flow__node.selected');
      await expect(selectedNodes).toHaveCount(2);
      
      const infoPanel = page.getByTestId('selected-item-info');
      await expect(infoPanel).toContainText('2 items selected');
    });

    test('should select nodes with box selection', async ({ page }) => {
      await helper.boxSelectNodes(50, 50, 300, 300);
      
      const selectedNodes = page.locator('.react-flow__node.selected');
      const count = await selectedNodes.count();
      expect(count).toBeGreaterThan(1);
    });
  });

  test.describe('Edge Interactions', () => {
    test('should select edge on click', async ({ page }) => {
      const edge = page.locator('.react-flow__edge').first();
      await edge.click();
      await expect(edge).toHaveClass(/selected/);
      await helper.verifySelectedItemInfo('Relation', 'Predicate:');
    });

    test('should show edge context menu on right click', async ({ page }) => {
      const edge = page.locator('.react-flow__edge').first();
      const contextMenu = await helper.rightClickAndVerifyContextMenu(edge, 'edge');
      
      await expect(contextMenu.getByTestId('edit-edge')).toBeVisible();
      await expect(contextMenu.getByTestId('delete-edge')).toBeVisible();
      await expect(contextMenu.getByTestId('reverse-edge')).toBeVisible();
    });

    test('should highlight edge on hover', async ({ page }) => {
      const edge = page.locator('.react-flow__edge').first();
      await edge.hover();
      
      await expect(edge).toHaveClass(/highlighted/);
      const highlightedNodes = page.locator('.react-flow__node.highlighted');
      await expect(highlightedNodes).toHaveCount(2);
    });
  });

  test.describe('Graph Controls', () => {
    async function verifyZoomChange(page: Page, buttonTestId: string) {
      const initialTransform = await helper.verifyViewportTransform();
      await page.getByTestId(buttonTestId).click();
      await page.waitForTimeout(300);
      const newTransform = await helper.verifyViewportTransform();
      expect(newTransform).not.toBe(initialTransform);
      return newTransform;
    }

    async function toggleElement(page: Page, toggleTestId: string, elementSelector: string) {
      const element = page.locator(elementSelector);
      await expect(element).toBeVisible();
      
      await page.getByTestId(toggleTestId).click();
      await expect(element).toBeHidden();
      
      await page.getByTestId(toggleTestId).click();
      await expect(element).toBeVisible();
    }

    test('should zoom in and out', async ({ page }) => {
      const zoomedInTransform = await verifyZoomChange(page, 'zoom-in-button');
      const zoomedOutTransform = await verifyZoomChange(page, 'zoom-out-button');
      expect(zoomedOutTransform).not.toBe(zoomedInTransform);
    });

    test('should fit view to show all nodes', async ({ page }) => {
      await helper.dragNode(0, 1000, 1000);
      await page.getByTestId('fit-view-button').click();
      
      const nodes = page.locator('.react-flow__node');
      const nodeCount = await nodes.count();
      
      for (let i = 0; i < nodeCount; i++) {
        await expect(nodes.nth(i)).toBeInViewport();
      }
    });

    test('should toggle minimap', async ({ page }) => {
      await toggleElement(page, 'toggle-minimap', '.react-flow__minimap');
    });

    test('should navigate using minimap', async ({ page }) => {
      const initialTransform = await helper.verifyViewportTransform();
      
      const minimap = page.locator('.react-flow__minimap');
      await minimap.click({ position: { x: 10, y: 10 } });
      
      await page.waitForTimeout(300);
      const newTransform = await helper.verifyViewportTransform();
      expect(newTransform).not.toBe(initialTransform);
    });

    test('should toggle controls panel', async ({ page }) => {
      await toggleElement(page, 'toggle-controls', '.react-flow__controls');
    });
  });

  test.describe('Edge Creation', () => {
    test('should create edge by dragging from node handle', async ({ page }) => {
      const initialEdgeCount = await page.locator('.react-flow__edge').count();
      
      await helper.createEdgeBetweenNodes(0, 3, 'connected_to');
      
      await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount + 1);
    });

    test('should cancel edge creation', async ({ page }) => {
      const initialEdgeCount = await page.locator('.react-flow__edge').count();
      
      const sourceHandle = page.locator('.react-flow__node').first().locator('.source');
      await sourceHandle.hover();
      await page.mouse.down();
      await page.keyboard.press('Escape');
      await page.mouse.up();
      
      await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    async function deleteNodeWithConfirmation(page: Page) {
      const initialNodeCount = await page.locator('.react-flow__node').count();
      await page.locator('.react-flow__node').first().click();
      await page.keyboard.press('Delete');
      
      const confirmButton = page.getByTestId('confirm-delete');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      return initialNodeCount;
    }

    test('should delete selected node with Delete key', async ({ page }) => {
      const initialNodeCount = await deleteNodeWithConfirmation(page);
      await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCount - 1);
    });

    test('should select all nodes with Ctrl/Cmd+A', async ({ page }) => {
      const modifier = helper.getModifierKey();
      await page.keyboard.press(`${modifier}+a`);
      
      const selectedNodes = page.locator('.react-flow__node.selected');
      const totalNodes = page.locator('.react-flow__node');
      
      const selectedCount = await selectedNodes.count();
      const totalCount = await totalNodes.count();
      
      expect(selectedCount).toBe(totalCount);
    });

    test('should copy and paste nodes', async ({ page }) => {
      const modifier = helper.getModifierKey();
      const initialNodeCount = await page.locator('.react-flow__node').count();
      
      await page.locator('.react-flow__node').first().click();
      await page.keyboard.press(`${modifier}+c`);
      await page.mouse.move(200, 200);
      await page.keyboard.press(`${modifier}+v`);
      
      await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCount + 1);
    });

    test('should undo and redo actions', async ({ page }) => {
      const modifier = helper.getModifierKey();
      const { initialPos, newPos: movedPos } = await helper.dragNode(0, 100, 100);
      
      expect(movedPos.x).toBeGreaterThan(initialPos.x);
      
      // Undo
      await page.keyboard.press(`${modifier}+z`);
      await page.waitForTimeout(300);
      
      const undonePos = await helper.getNodePosition(0);
      expect(Math.abs(undonePos.x - initialPos.x)).toBeLessThan(5);
      
      // Redo
      await page.keyboard.press(`${modifier}+y`);
      await page.waitForTimeout(300);
      
      const redonePos = await helper.getNodePosition(0);
      expect(redonePos.x).toBeGreaterThan(initialPos.x);
    });
  });

  test.describe('Layout Options', () => {
    async function getNodePositions(page: Page, nodeCount: number) {
      const positions = [];
      for (let i = 0; i < nodeCount; i++) {
        positions.push(await helper.getNodePosition(i));
      }
      return positions;
    }

    function comparePositions(positions1: any[], positions2: any[]) {
      for (let i = 0; i < positions1.length; i++) {
        if (positions1[i].x !== positions2[i].x || 
            positions1[i].y !== positions2[i].y) {
          return true;
        }
      }
      return false;
    }

    test('should apply automatic layout', async ({ page }) => {
      const nodeCount = await page.locator('.react-flow__node').count();
      const initialPositions = await getNodePositions(page, nodeCount);
      
      await helper.applyLayout('hierarchical');
      
      const newPositions = await getNodePositions(page, nodeCount);
      expect(comparePositions(initialPositions, newPositions)).toBe(true);
    });

    test('should switch between layout types', async ({ page }) => {
      await helper.applyLayout('hierarchical');
      
      const nodeCount = await page.locator('.react-flow__node').count();
      const hierarchicalPositions = await getNodePositions(page, nodeCount);
      
      await helper.applyLayout('circular');
      
      const circularPositions = await getNodePositions(page, nodeCount);
      expect(comparePositions(hierarchicalPositions, circularPositions)).toBe(true);
    });
  });

  test.describe('Graph Export', () => {
    async function exportAndVerifyDownload(page: Page, exportType: string, filePattern: RegExp) {
      const downloadPromise = page.waitForEvent('download');
      
      await page.getByTestId('export-button').click();
      await page.getByTestId(`export-as-${exportType}`).click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(filePattern);
    }

    test('should export graph as image', async ({ page }) => {
      await exportAndVerifyDownload(page, 'png', /graph.*\.png$/);
    });

    test('should export graph data as JSON', async ({ page }) => {
      await exportAndVerifyDownload(page, 'json', /graph.*\.json$/);
    });
  });

  test.describe('Performance with Large Graphs', () => {
    async function createLargeGraph(entityCount: number) {
      const entityPromises = [];
      for (let i = 0; i < entityCount; i++) {
        entityPromises.push(dbUtils.createTestEntity({ 
          facial: i % 2 === 0, 
          text: i % 2 === 1 
        }));
      }
      const entities = await Promise.all(entityPromises);
      
      for (let i = 0; i < entities.length - 1; i++) {
        await dbUtils.createTestRelation(entities[i], 'connected', entities[i + 1]);
      }
      
      return entities;
    }

    async function measurePerformance(fn: () => Promise<void>) {
      const startTime = Date.now();
      await fn();
      return Date.now() - startTime;
    }

    test('should handle large number of nodes efficiently', async ({ page }) => {
      await createLargeGraph(50);
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const renderTime = await measurePerformance(async () => {
        await page.waitForSelector('.react-flow__node');
      });
      
      expect(renderTime).toBeLessThan(5000);
      await expect(page.locator('.react-flow__node')).toHaveCount(50);
      
      const interactionTime = await measurePerformance(async () => {
        await page.locator('.react-flow__node').first().click();
        await expect(page.locator('.react-flow__node.selected')).toBeVisible();
      });
      
      expect(interactionTime).toBeLessThan(500);
    });
  });
});