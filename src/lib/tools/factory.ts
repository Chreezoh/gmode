/**
 * Tool Factory Module
 * 
 * This module provides factory functions for creating tools with
 * consistent configurations and defaults.
 */

import { Tool } from '../orchestration/types';
import { ExtendedTool, ToolCategory, ToolFactory, ToolConfig } from './types';
import { getToolConfig } from '../toolConfigs';

/**
 * Registry of tool factories
 */
const toolFactories = new Map<string, ToolConfig>();

/**
 * Register a tool factory
 * @param name The name of the tool
 * @param factory The factory function
 * @param defaultConfig Default configuration for the tool
 */
export function registerToolFactory<T extends Record<string, any>>(
  name: string,
  factory: ToolFactory<T>,
  defaultConfig?: T
): void {
  toolFactories.set(name, { factory, defaultConfig });
}

/**
 * Create a tool using a registered factory
 * @param name The name of the tool factory
 * @param config Configuration to override defaults
 * @returns The created tool
 * @throws Error if the factory is not registered
 */
export function createToolFromFactory<T extends Record<string, any>>(
  name: string,
  config?: T
): Tool | ExtendedTool {
  const toolConfig = toolFactories.get(name);
  
  if (!toolConfig) {
    throw new Error(`Tool factory '${name}' is not registered`);
  }
  
  const mergedConfig = {
    ...(toolConfig.defaultConfig || {}),
    ...(config || {}),
  };
  
  return toolConfig.factory(mergedConfig);
}

/**
 * Create a tool using a registered factory and user-specific configuration
 * @param userId The user ID
 * @param factoryName The name of the tool factory
 * @param overrideConfig Configuration to override user and default configs
 * @returns The created tool
 */
export async function createToolForUser<T extends Record<string, any>>(
  userId: string,
  factoryName: string,
  overrideConfig?: T
): Promise<Tool | ExtendedTool> {
  // Get user-specific configuration from the database
  const { data: userConfig } = await getToolConfig(userId, factoryName);
  
  // Create the tool with merged configuration
  return createToolFromFactory(factoryName, {
    ...(userConfig?.config_json || {}),
    ...(overrideConfig || {}),
  });
}

/**
 * Create a basic tool with minimal configuration
 * @param name The name of the tool
 * @param description The description of the tool
 * @param execute The execution function
 * @param parameters The parameters schema
 * @returns A basic tool
 */
export function createBasicTool(
  name: string,
  description: string,
  execute: (args: Record<string, any>) => Promise<any>,
  parameters: Record<string, any> = {}
): Tool {
  return {
    name,
    description,
    parameters,
    execute,
  };
}

/**
 * Create an extended tool with additional metadata
 * @param name The name of the tool
 * @param description The description of the tool
 * @param category The category of the tool
 * @param execute The execution function
 * @param parameters The parameters schema
 * @param options Additional options
 * @returns An extended tool
 */
export function createExtendedTool(
  name: string,
  description: string,
  category: ToolCategory | string,
  execute: (args: Record<string, any>) => Promise<any>,
  parameters: Record<string, any> = {},
  options: Partial<Omit<ExtendedTool, 'name' | 'description' | 'category' | 'execute' | 'parameters'>> = {}
): ExtendedTool {
  return {
    name,
    description,
    category,
    parameters,
    execute,
    ...options,
  };
}