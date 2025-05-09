/**
 * Cost Estimator Module
 *
 * This module provides functions for estimating token usage and cost
 * for tools and operations based on historical metrics.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { TokenUsage, calculateCost } from './tokenUsage';
import { getUsageMetrics, UsageMetric } from './metrics';
import { getTool } from '../tools/registry';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config/env';

// Initialize Supabase client
let supabase: ReturnType<typeof createClient<Database>> | null = null;

try {
  // Use service role key for admin operations
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (error) {
  console.error('Failed to initialize Supabase client for cost estimator:', error);
}

/**
 * Result of a cost estimation operation
 */
export interface CostEstimateResult {
  /** The estimated token usage */
  estimatedUsage: TokenUsage;
  /** The estimated cost in USD */
  estimatedCost: number;
  /** Whether the estimate is based on actual metrics or defaults */
  isBasedOnMetrics: boolean;
  /** The tool name */
  toolName: string;
  /** The model used for cost calculation */
  model: string;
}

/**
 * Default token usage values for when no metrics are available
 */
const DEFAULT_TOKEN_USAGE: Record<string, TokenUsage> = {
  // Default values for common models
  'gpt-4': {
    promptTokens: 1000,
    completionTokens: 300,
    totalTokens: 1300,
  },
  'gpt-3.5-turbo': {
    promptTokens: 800,
    completionTokens: 200,
    totalTokens: 1000,
  },
  'gpt-4.1-nano': {
    promptTokens: 500,
    completionTokens: 100,
    totalTokens: 600,
  },
  // Default for tools
  'default': {
    promptTokens: 500,
    completionTokens: 150,
    totalTokens: 650,
  },
};

/**
 * Get the default token usage for a model
 * @param model The model name
 * @returns Default token usage for the model
 */
function getDefaultTokenUsage(model: string): TokenUsage {
  return DEFAULT_TOKEN_USAGE[model] || DEFAULT_TOKEN_USAGE['default'];
}

/**
 * Convert average tokens to a TokenUsage object
 * @param avgTokens The average total tokens
 * @returns A TokenUsage object with estimated prompt and completion tokens
 */
function avgTokensToUsage(avgTokens: number): TokenUsage {
  // Estimate prompt and completion tokens based on typical ratios
  // Typically, prompt tokens are about 70% of total tokens
  const promptTokens = Math.round(avgTokens * 0.7);
  const completionTokens = Math.round(avgTokens * 0.3);

  return {
    promptTokens,
    completionTokens,
    totalTokens: Math.round(avgTokens),
  };
}

/**
 * Estimate the cost of using a tool
 * @param toolName The name of the tool
 * @param userId Optional user ID to get user-specific metrics
 * @param model Optional model to use for cost calculation (defaults to gpt-3.5-turbo)
 * @returns The estimated cost and token usage
 */
export async function estimateToolCost(
  toolName: string,
  userId?: string,
  model: string = 'gpt-3.5-turbo'
): Promise<CostEstimateResult> {
  // Check if the tool exists
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Tool '${toolName}' not found`);
  }

  try {

    // Get metrics for the tool
    const { data: metrics, error } = await getUsageMetrics(toolName, userId);

    if (error) {
      console.error(`Error fetching metrics for tool '${toolName}':`, error);
      // Fall back to default values
      const defaultUsage = getDefaultTokenUsage(model);
      return {
        estimatedUsage: defaultUsage,
        estimatedCost: calculateCost(model, defaultUsage),
        isBasedOnMetrics: false,
        toolName,
        model,
      };
    }

    // If we have metrics, use them to estimate token usage
    if (metrics && metrics.length > 0) {
      // Find the most relevant metric (user-specific if available, otherwise global)
      let relevantMetric: UsageMetric | undefined;

      // First try to find a user-specific metric
      if (userId) {
        relevantMetric = metrics.find(m => m.user_id === userId);
      }

      // If no user-specific metric, use the global one
      if (!relevantMetric) {
        relevantMetric = metrics.find(m => !m.user_id);
      }

      // If still no metric, use the first one available
      if (!relevantMetric && metrics.length > 0) {
        relevantMetric = metrics[0];
      }

      if (relevantMetric) {
        const estimatedUsage = avgTokensToUsage(relevantMetric.avg_tokens);
        return {
          estimatedUsage,
          estimatedCost: calculateCost(model, estimatedUsage),
          isBasedOnMetrics: true,
          toolName,
          model,
        };
      }
    }

    // If no metrics are available, use default values
    const defaultUsage = getDefaultTokenUsage(model);
    return {
      estimatedUsage: defaultUsage,
      estimatedCost: calculateCost(model, defaultUsage),
      isBasedOnMetrics: false,
      toolName,
      model,
    };
  } catch (error) {
    console.error(`Exception estimating cost for tool '${toolName}':`, error);
    // Fall back to default values
    const defaultUsage = getDefaultTokenUsage(model);
    return {
      estimatedUsage: defaultUsage,
      estimatedCost: calculateCost(model, defaultUsage),
      isBasedOnMetrics: false,
      toolName,
      model,
    };
  }
}

/**
 * Estimate the cost of a task based on the model and context length
 * @param model The model to use
 * @param contextLength The estimated context length in tokens
 * @param completionLength The estimated completion length in tokens
 * @returns The estimated cost and token usage
 */
export function estimateModelCost(
  model: string,
  contextLength: number = 1000,
  completionLength: number = 300
): CostEstimateResult {
  const estimatedUsage: TokenUsage = {
    promptTokens: contextLength,
    completionTokens: completionLength,
    totalTokens: contextLength + completionLength,
  };

  return {
    estimatedUsage,
    estimatedCost: calculateCost(model, estimatedUsage),
    isBasedOnMetrics: false,
    toolName: 'direct_model_call',
    model,
  };
}
