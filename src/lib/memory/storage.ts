/**
 * Memory storage implementation
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/config/env';
import { DEFAULT_MEMORY_LIMIT } from '@/lib/config/constants';
import { MemoryEntry, MemoryOperationResult, MemoryRetrievalOptions } from './types';
import { logger } from '@/lib/utils/logger';
import { Database } from '@/lib/types/database.types';

// Create a Supabase client with the service key for admin operations
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Save a memory entry to the database
 * @param entry The memory entry to save
 * @returns Result of the operation
 */
export async function saveEntry(entry: MemoryEntry): Promise<MemoryOperationResult> {
  try {
    // Ensure required fields are present
    if (!entry.user_id || !entry.content || !entry.role) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    // Add timestamp if not provided
    const entryWithTimestamp = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    // Insert the entry into the memories table
    const { data, error } = await supabase
      .from('memories')
      .insert(entryWithTimestamp)
      .select()
      .single();

    if (error) {
      logger.error('Error saving memory entry', { error, entry });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    logger.error('Exception saving memory entry', { error, entry });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get memory entries for a user
 * @param userId The user ID
 * @param options Retrieval options
 * @returns Result of the operation
 */
export async function getEntries(
  userId: string,
  options: MemoryRetrievalOptions = {}
): Promise<MemoryOperationResult> {
  try {
    // Set default options
    const {
      limit = DEFAULT_MEMORY_LIMIT,
      before,
      after,
      includeMetadata = false,
    } = options;

    // Start building the query
    let query = supabase
      .from('memories')
      .select(includeMetadata ? '*' : 'id, user_id, role, content, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    // Add time-based filters if provided
    if (before) {
      query = query.lt('timestamp', before);
    }

    if (after) {
      query = query.gt('timestamp', after);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      logger.error('Error retrieving memory entries', { error, userId, options });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    logger.error('Exception retrieving memory entries', { error, userId, options });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Delete a memory entry
 * @param userId The user ID
 * @param entryId The entry ID to delete
 * @returns Result of the operation
 */
export async function deleteEntry(
  userId: string,
  entryId: string
): Promise<MemoryOperationResult> {
  try {
    // Delete the entry
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting memory entry', { error, userId, entryId });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Exception deleting memory entry', { error, userId, entryId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Clear all memory entries for a user
 * @param userId The user ID
 * @returns Result of the operation
 */
export async function clearUserMemory(userId: string): Promise<MemoryOperationResult> {
  try {
    // Delete all entries for the user
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Error clearing user memory', { error, userId });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Exception clearing user memory', { error, userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
