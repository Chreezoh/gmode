import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config/env';

// Initialize Supabase client
let supabase: ReturnType<typeof createClient<Database>> | null = null;

try {
  // Use service role key for admin operations
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (error) {
  console.error('Failed to initialize Supabase client for metrics:', error);
}

// For testing purposes
let _supabaseClientForTesting: ReturnType<typeof createClient<Database>> | null = null;

export function setSupabaseClientForTesting(client: ReturnType<typeof createClient<Database>> | null) {
  _supabaseClientForTesting = client;
}

function getSupabaseClient() {
  return _supabaseClientForTesting || supabase;
}

/**
 * Interface for metrics data
 */
export interface UsageMetric {
  tool_name: string;
  avg_tokens: number;
  total_tokens: number;
  count: number;
  user_id?: string;
  model?: string;
}

/**
 * Filter options for aggregating metrics
 */
export interface MetricsFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  model?: string;
  toolName?: string;
}

/**
 * Calculate and update metrics for token usage
 * @param filter Optional filter parameters
 * @returns Result of the operation
 */
export async function updateUsageMetrics(
  filter: MetricsFilter = {}
): Promise<{ success: boolean; error?: any }> {
  try {
    const supabase = getSupabaseClient();

    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Metrics not updated.');
      return { success: true }; // Return success to avoid disrupting the application flow
    }

    // Build the query to get usage logs
    let query = supabase
      .from('usage_logs')
      .select('*');

    // Apply filters
    if (filter.startDate) {
      query = query.gte('timestamp', filter.startDate.toISOString());
    }

    if (filter.endDate) {
      query = query.lte('timestamp', filter.endDate.toISOString());
    }

    if (filter.userId) {
      query = query.eq('user_id', filter.userId);
    }

    if (filter.model) {
      query = query.eq('model', filter.model);
    }

    // Execute the query
    const { data: logs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching usage logs:', fetchError);
      return { success: false, error: fetchError };
    }

    if (!logs || logs.length === 0) {
      console.log('No usage logs found for the given filters.');
      return { success: true };
    }

    // Extract tool names from the logs
    // In this implementation, we're assuming the tool name is stored in the description
    // or can be derived from other fields. Adjust as needed for your actual data structure.
    const toolMetrics = new Map<string, {
      totalTokens: number;
      count: number;
      userId?: string;
      model?: string;
    }>();

    // Process logs to calculate metrics
    for (const log of logs) {
      // Extract tool name - this is a placeholder, adjust based on your actual data
      // For example, you might parse it from a description field or use another field
      const toolName = extractToolName(log);

      if (!toolName) continue;

      // Create a unique key for the metric based on the grouping criteria
      const metricKey = createMetricKey(toolName, filter.userId, filter.model);

      // Update or create the metric
      if (toolMetrics.has(metricKey)) {
        const metric = toolMetrics.get(metricKey)!;
        metric.totalTokens += log.total_tokens;
        metric.count += 1;
      } else {
        toolMetrics.set(metricKey, {
          totalTokens: log.total_tokens,
          count: 1,
          userId: filter.userId,
          model: filter.model
        });
      }
    }

    // Update the metrics table for each tool
    for (const [key, metric] of toolMetrics.entries()) {
      const { toolName, userId, model } = parseMetricKey(key);
      const avgTokens = metric.totalTokens / metric.count;

      // Check if the metric already exists
      const { data: existingMetric, error: metricFetchError } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('tool_name', toolName)
        .is('user_id', userId ? userId : null)
        .is('model', model ? model : null)
        .maybeSingle();

      if (metricFetchError) {
        console.error('Error fetching existing metric:', metricFetchError);
        continue; // Skip this metric but continue with others
      }

      if (existingMetric) {
        // Update existing metric
        const newTotalTokens = existingMetric.total_tokens + metric.totalTokens;
        const newCount = existingMetric.count + metric.count;
        const newAvgTokens = newTotalTokens / newCount;

        const { error: updateError } = await supabase
          .from('usage_metrics')
          .update({
            avg_tokens: newAvgTokens,
            total_tokens: newTotalTokens,
            count: newCount,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingMetric.id);

        if (updateError) {
          console.error(`Error updating metric for ${toolName}:`, updateError);
        }
      } else {
        // Insert new metric
        const { error: insertError } = await supabase
          .from('usage_metrics')
          .insert({
            tool_name: toolName,
            avg_tokens: avgTokens,
            total_tokens: metric.totalTokens,
            count: metric.count,
            user_id: userId || null,
            model: model || null,
            last_updated: new Date().toISOString()
          });

        if (insertError) {
          console.error(`Error inserting metric for ${toolName}:`, insertError);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Exception updating metrics:', error);
    return { success: false, error };
  }
}

/**
 * Extract tool name from a usage log entry
 * This is a placeholder implementation - adjust based on your actual data structure
 */
function extractToolName(log: any): string | null {
  // In a real implementation, you might:
  // 1. Parse the tool name from a description field
  // 2. Use a dedicated tool_name field if available
  // 3. Derive it from other fields

  // For now, we'll use a simple placeholder implementation
  // that extracts the tool name from the model field as an example
  if (log.model && log.model.includes(':')) {
    return log.model.split(':')[0];
  }

  return log.model || 'unknown';
}

/**
 * Create a unique key for a metric based on the grouping criteria
 */
function createMetricKey(toolName: string, userId?: string, model?: string): string {
  return `${toolName}|${userId || ''}|${model || ''}`;
}

/**
 * Parse a metric key back into its components
 */
function parseMetricKey(key: string): { toolName: string; userId?: string; model?: string } {
  const [toolName, userId, model] = key.split('|');
  return {
    toolName,
    userId: userId || undefined,
    model: model || undefined
  };
}

/**
 * Get metrics for a specific tool or all tools
 * @param toolName Optional tool name to filter by
 * @param userId Optional user ID to filter by
 * @returns The metrics data
 */
export async function getUsageMetrics(
  toolName?: string,
  userId?: string
): Promise<{ data: UsageMetric[] | null; error?: any }> {
  try {
    const supabase = getSupabaseClient();

    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Cannot get metrics.');
      return { data: null };
    }

    // Build the query
    let query = supabase
      .from('usage_metrics')
      .select('*');

    if (toolName) {
      query = query.eq('tool_name', toolName);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching metrics:', error);
      return { data: null, error };
    }

    return { data };
  } catch (error) {
    console.error('Exception getting metrics:', error);
    return { data: null, error };
  }
}
