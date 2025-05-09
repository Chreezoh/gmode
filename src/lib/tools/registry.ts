/**
 * Tool Registry Module
 *
 * This module provides a centralized registry for managing tools that can be
 * dynamically loaded and executed by the orchestration engine.
 */

import { Tool } from '../orchestration/types';

/**
 * ToolRegistry class for managing the registration and retrieval of tools
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool>;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.tools = new Map<string, Tool>();
  }

  /**
   * Get the singleton instance of the ToolRegistry
   * @returns The ToolRegistry instance
   */
  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool with the registry
   * @param tool The tool to register
   * @throws Error if a tool with the same name is already registered
   */
  public registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools with the registry
   * @param tools An array of tools to register
   * @throws Error if any tool with the same name is already registered
   */
  public registerTools(tools: Tool[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * Get a tool by name
   * @param name The name of the tool to retrieve
   * @returns The tool, or undefined if not found
   */
  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   * @param userId Optional user ID to filter tools by user-specific configurations
   * @returns An array of all registered tools, potentially customized for the user
   */
  public async getAllTools(userId?: string): Promise<Tool[]> {
    const tools = Array.from(this.tools.values());

    // If no userId is provided, return all tools without customization
    if (!userId) {
      return tools;
    }

    try {
      // In the future, this could load user-specific tool configurations
      // from the tool_configs table and customize tools accordingly

      // For now, just return all tools
      return tools;
    } catch (error) {
      console.error('Error loading user-specific tool configurations:', error);
      // Fall back to returning all tools without customization
      return tools;
    }
  }

  /**
   * Get tools by category
   * @param category The category to filter by
   * @param userId Optional user ID to filter tools by user-specific configurations
   * @returns An array of tools in the specified category
   */
  public async getToolsByCategory(category: string, userId?: string): Promise<Tool[]> {
    const tools = await this.getAllTools(userId);
    return tools.filter(tool =>
      (tool as any).category === category
    );
  }

  /**
   * Check if a tool is registered
   * @param name The name of the tool to check
   * @returns True if the tool is registered, false otherwise
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   * @param name The name of the tool to unregister
   * @returns True if the tool was unregistered, false if it wasn't registered
   */
  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all registered tools
   */
  public clearTools(): void {
    this.tools.clear();
  }
}

/**
 * Convenience function to get the singleton ToolRegistry instance
 * @returns The ToolRegistry instance
 */
export function getToolRegistry(): ToolRegistry {
  return ToolRegistry.getInstance();
}

/**
 * Convenience function to register a tool
 * @param tool The tool to register
 */
export function registerTool(tool: Tool): void {
  getToolRegistry().registerTool(tool);
}

/**
 * Convenience function to register multiple tools
 * @param tools The tools to register
 */
export function registerTools(tools: Tool[]): void {
  getToolRegistry().registerTools(tools);
}

/**
 * Convenience function to get a tool by name
 * @param name The name of the tool to retrieve
 * @returns The tool, or undefined if not found
 */
export function getTool(name: string): Tool | undefined {
  return getToolRegistry().getTool(name);
}

/**
 * Convenience function to get all registered tools
 * @param userId Optional user ID to filter tools by user-specific configurations
 * @returns An array of all registered tools, potentially customized for the user
 */
export async function getAllTools(userId?: string): Promise<Tool[]> {
  return getToolRegistry().getAllTools(userId);
}