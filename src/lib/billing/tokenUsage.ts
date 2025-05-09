import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config/env';

// Initialize Supabase client
// Only create the client if not in a test environment
let supabase: ReturnType<typeof createClient<Database>> | null = null;

try {
  // Use service role key for admin operations
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // In a production environment, this would be a critical error
  // In a test environment, we might mock the client
}

/**
 * Interface for token usage data
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Interface for the log entry
 */
export interface TokenUsageLogEntry {
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Log token usage to the database
 * @param userId The user ID
 * @param model The model used (e.g., 'gpt-4-1106-preview')
 * @param usage The token usage data
 * @returns Result of the database operation
 */
export async function logTokenUsage(
  userId: string,
  model: string,
  usage: TokenUsage
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Token usage not logged.');
      return { success: true }; // Return success to avoid disrupting the application flow
    }

    // Create the log entry
    const logEntry: TokenUsageLogEntry = {
      user_id: userId,
      model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
    };

    // Insert into the database
    const { error } = await supabase
      .from('usage_logs')
      .insert(logEntry);

    if (error) {
      console.error('Error logging token usage:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception logging token usage:', error);
    return { success: false, error };
  }
}

/**
 * Extract token usage from an OpenAI API response
 * @param response The OpenAI API response
 * @returns The token usage data
 */
export function extractTokenUsage(response: any): TokenUsage {
  // Handle different response formats
  const usage = response.usage || {};

  return {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
  };
}

/**
 * Calculate the cost in USD for token usage
 * @param model The model used
 * @param usage The token usage data
 * @returns The cost in USD
 */
export function calculateCost(model: string, usage: TokenUsage): number {
  // Pricing per 1000 tokens (as of May 2023)
  // These rates should be stored in a database or configuration for easy updates
  const pricing: Record<string, { promptRate: number; completionRate: number }> = {
    'gpt-4-1106-preview': { promptRate: 0.01, completionRate: 0.03 },
    'gpt-4-1106-vision-preview': { promptRate: 0.01, completionRate: 0.03 },
    'gpt-4': { promptRate: 0.03, completionRate: 0.06 },
    'gpt-4-32k': { promptRate: 0.06, completionRate: 0.12 },
    'gpt-3.5-turbo': { promptRate: 0.0015, completionRate: 0.002 },
    'gpt-3.5-turbo-16k': { promptRate: 0.003, completionRate: 0.004 },
    'gpt-4.1-nano': { promptRate: 0.0005, completionRate: 0.0015 },
    // Add more models as needed
  };

  // Default to gpt-3.5-turbo rates if model not found
  const rates = pricing[model] || pricing['gpt-3.5-turbo'];

  // Calculate cost
  const promptCost = (usage.promptTokens / 1000) * rates.promptRate;
  const completionCost = (usage.completionTokens / 1000) * rates.completionRate;

  return promptCost + completionCost;
}

/**
 * Update the monthly cost for a user
 * @param userId The user ID
 * @param cost The cost to add
 * @returns Result of the database operation
 */
export async function updateMonthlyCost(
  userId: string,
  cost: number
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Monthly cost not updated.');
      return { success: true }; // Return success to avoid disrupting the application flow
    }

    // Get the current month in YYYY-MM format
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if there's an existing record for this user and month
    const { data, error: fetchError } = await supabase
      .from('user_costs')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching user cost:', fetchError);
      return { success: false, error: fetchError };
    }

    if (data) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_costs')
        .update({ cost_usd: data.cost_usd + cost })
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating user cost:', updateError);
        return { success: false, error: updateError };
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_costs')
        .insert({
          user_id: userId,
          month,
          cost_usd: cost,
        });

      if (insertError) {
        console.error('Error inserting user cost:', insertError);
        return { success: false, error: insertError };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Exception updating monthly cost:', error);
    return { success: false, error };
  }
}

/**
 * Log token usage and update monthly cost in one operation
 * @param userId The user ID
 * @param model The model used
 * @param usage The token usage data
 * @returns Result of the operation
 */
export async function logUsageAndUpdateCost(
  userId: string,
  model: string,
  usage: TokenUsage
): Promise<{ success: boolean; error?: any }> {
  // Log the token usage
  const logResult = await logTokenUsage(userId, model, usage);
  if (!logResult.success) {
    return logResult;
  }

  // Calculate the cost
  const cost = calculateCost(model, usage);

  // Update the monthly cost
  return await updateMonthlyCost(userId, cost);
}
