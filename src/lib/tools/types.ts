/**
 * Tool Types Module
 * 
 * This module extends the base Tool interface with additional metadata
 * for better organization and management of tools.
 */

import { Tool } from '../orchestration/types';

/**
 * Enum for tool categories
 */
export enum ToolCategory {
  COMMUNICATION = 'communication',
  DATA_PROCESSING = 'data_processing',
  EXTERNAL_API = 'external_api',
  FILE_SYSTEM = 'file_system',
  UTILITY = 'utility',
  CUSTOM = 'custom',
}

/**
 * Extended Tool interface with additional metadata
 */
export interface ExtendedTool extends Tool {
  /** The category of the tool */
  category: ToolCategory | string;
  
  /** Version of the tool */
  version?: string;
  
  /** Whether the tool requires authentication */
  requiresAuth?: boolean;
  
  /** The cost of using the tool (e.g., API credits) */
  cost?: number;
  
  /** Rate limit information */
  rateLimit?: {
    /** Maximum number of requests */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool factory function type
 */
export type ToolFactory<T extends Record<string, any> = Record<string, any>> = (
  config?: T
) => Tool | ExtendedTool;

/**
 * Tool configuration type
 */
export interface ToolConfig<T extends Record<string, any> = Record<string, any>> {
  /** The factory function to create the tool */
  factory: ToolFactory<T>;
  /** Default configuration for the tool */
  defaultConfig?: T;
}