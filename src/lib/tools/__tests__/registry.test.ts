/**
 * Tests for the Tool Registry
 */

import { ToolRegistry, getToolRegistry, registerTool, registerTools, getTool, getAllTools } from '../registry';
import { Tool } from '../../orchestration/types';
import { ExtendedTool, ToolCategory } from '../types';

describe('ToolRegistry', () => {
  // Reset the registry before each test
  beforeEach(() => {
    getToolRegistry().clearTools();
  });

  // Mock tools for testing
  const mockTool1: Tool = {
    name: 'tool1',
    description: 'Test tool 1',
    parameters: {},
    execute: jest.fn().mockResolvedValue({ result: 'success' }),
  };

  const mockTool2: ExtendedTool = {
    name: 'tool2',
    description: 'Test tool 2',
    category: ToolCategory.UTILITY,
    parameters: {},
    execute: jest.fn().mockResolvedValue({ result: 'success' }),
  };

  test('should be a singleton', () => {
    const registry1 = ToolRegistry.getInstance();
    const registry2 = ToolRegistry.getInstance();
    expect(registry1).toBe(registry2);
  });

  test('should register a tool', () => {
    const registry = getToolRegistry();
    registry.registerTool(mockTool1);
    expect(registry.hasTool('tool1')).toBe(true);
    expect(registry.getTool('tool1')).toBe(mockTool1);
  });

  test('should register multiple tools', () => {
    const registry = getToolRegistry();
    registry.registerTools([mockTool1, mockTool2]);
    expect(registry.hasTool('tool1')).toBe(true);
    expect(registry.hasTool('tool2')).toBe(true);
  });

  test('should get all tools', async () => {
    const registry = getToolRegistry();
    registry.registerTools([mockTool1, mockTool2]);
    const tools = await registry.getAllTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContain(mockTool1);
    expect(tools).toContain(mockTool2);
  });

  test('should get tools by category', async () => {
    const registry = getToolRegistry();
    registry.registerTools([mockTool1, mockTool2]);
    const utilityTools = await registry.getToolsByCategory(ToolCategory.UTILITY);
    expect(utilityTools).toHaveLength(1);
    expect(utilityTools[0]).toBe(mockTool2);
  });

  test('should unregister a tool', () => {
    const registry = getToolRegistry();
    registry.registerTool(mockTool1);
    expect(registry.hasTool('tool1')).toBe(true);

    const result = registry.unregisterTool('tool1');
    expect(result).toBe(true);
    expect(registry.hasTool('tool1')).toBe(false);
  });

  test('should clear all tools', async () => {
    const registry = getToolRegistry();
    registry.registerTools([mockTool1, mockTool2]);
    expect((await registry.getAllTools())).toHaveLength(2);

    registry.clearTools();
    expect((await registry.getAllTools())).toHaveLength(0);
  });

  test('should throw error when registering duplicate tool', () => {
    const registry = getToolRegistry();
    registry.registerTool(mockTool1);

    expect(() => {
      registry.registerTool(mockTool1);
    }).toThrow(`Tool with name '${mockTool1.name}' is already registered`);
  });

  test('convenience functions should work', async () => {
    registerTool(mockTool1);
    registerTools([mockTool2]);

    expect(getTool('tool1')).toBe(mockTool1);
    expect((await getAllTools())).toHaveLength(2);
  });
});