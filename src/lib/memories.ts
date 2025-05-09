import { supabase } from './supabase';

/**
 * Interface representing a chat message in the chat_history table
 */
export interface ChatMessage {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

/**
 * Inserts a chat message into the chat_history table
 * @param message The message to insert
 * @returns The inserted message or an error
 */
export async function saveMessage(message: Omit<ChatMessage, 'id' | 'created_at'>) {
  try {
    // Ensure user_id is set
    if (!message.user_id) {
      throw new Error('User ID is required');
    }

    // Validate role
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      throw new Error('Invalid role. Must be "user", "assistant", or "system"');
    }

    // Insert the message with the current timestamp
    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        user_id: message.user_id,
        role: message.role,
        content: message.content,
        // created_at will be set automatically by Supabase
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error saving message:', error);
    return { data: null, error };
  }
}

/**
 * Fetches the last N messages for a specific user
 * @param userId The user ID to fetch messages for
 * @param limit The maximum number of messages to fetch (default: 10)
 * @returns The fetched messages or an error
 */
export async function getRecentMessages(userId: string, limit: number = 10) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch the most recent messages for the user, ordered by creation time
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Return the messages in chronological order (oldest first)
    return { data: data.reverse(), error: null };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { data: null, error };
  }
}

/**
 * Deletes all messages for a specific user
 * @param userId The user ID to delete messages for
 * @returns Success status or an error
 */
export async function clearUserMessages(userId: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error clearing messages:', error);
    return { success: false, error };
  }
}
