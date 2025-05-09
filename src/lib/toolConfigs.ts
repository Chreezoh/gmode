import { supabase } from './supabase';

/**
 * Interface representing a tool configuration in the tool_configs table
 */
export interface ToolConfig {
  id?: string;
  user_id: string;
  tool_name: string;
  config_json: Record<string, any>;
  created_at?: string;
}

/**
 * Saves or updates a tool configuration in the tool_configs table
 * @param config The tool configuration to save
 * @returns The saved/updated configuration or an error
 */
export async function saveToolConfig(config: Omit<ToolConfig, 'id' | 'created_at'>) {
  try {
    // Ensure user_id is set
    if (!config.user_id) {
      throw new Error('User ID is required');
    }

    // Ensure tool_name is set
    if (!config.tool_name) {
      throw new Error('Tool name is required');
    }

    // Check if a configuration for this tool and user already exists
    const { data: existingConfig } = await supabase
      .from('tool_configs')
      .select('id')
      .eq('user_id', config.user_id)
      .eq('tool_name', config.tool_name)
      .maybeSingle();

    let result;

    if (existingConfig) {
      // Update existing configuration
      result = await supabase
        .from('tool_configs')
        .update({
          config_json: config.config_json,
          // updated_at will be set automatically by Supabase
        })
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      // Insert new configuration
      result = await supabase
        .from('tool_configs')
        .insert({
          user_id: config.user_id,
          tool_name: config.tool_name,
          config_json: config.config_json,
          // created_at will be set automatically by Supabase
        })
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error saving tool configuration:', error);
    return { data: null, error };
  }
}

/**
 * Retrieves a tool configuration for a specific user and tool
 * @param userId The user ID to fetch the configuration for
 * @param toolName The name of the tool to fetch the configuration for
 * @returns The tool configuration or an error
 */
export async function getToolConfig(userId: string, toolName: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!toolName) {
      throw new Error('Tool name is required');
    }

    const { data, error } = await supabase
      .from('tool_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_name', toolName)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching tool configuration:', error);
    return { data: null, error };
  }
}

/**
 * Retrieves all tool configurations for a specific user
 * @param userId The user ID to fetch configurations for
 * @returns The tool configurations or an error
 */
export async function getAllToolConfigs(userId: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase
      .from('tool_configs')
      .select('*')
      .eq('user_id', userId)
      .order('tool_name', { ascending: true });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching tool configurations:', error);
    return { data: null, error };
  }
}

/**
 * Deletes a tool configuration for a specific user and tool
 * @param userId The user ID to delete the configuration for
 * @param toolName The name of the tool to delete the configuration for
 * @returns Success status or an error
 */
export async function deleteToolConfig(userId: string, toolName: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!toolName) {
      throw new Error('Tool name is required');
    }

    const { error } = await supabase
      .from('tool_configs')
      .delete()
      .eq('user_id', userId)
      .eq('tool_name', toolName);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting tool configuration:', error);
    return { success: false, error };
  }
}
