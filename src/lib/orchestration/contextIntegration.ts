import { Message } from './types';
import { getRecentMessages } from '../memories';
import { ChatMessage } from '../memories';

/**
 * Maximum number of tokens to allow in the combined prompt
 * GPT-4.1 has a context window of up to 1M tokens, but we'll be conservative
 */
const MAX_PROMPT_TOKENS = 100000;

/**
 * Rough estimate of tokens per character for English text
 * This is a very rough approximation - actual tokenization depends on the model
 */
const TOKENS_PER_CHAR = 0.25;

/**
 * Default number of recent messages to include in the prompt
 */
const DEFAULT_RECENT_MESSAGES_COUNT = 5;

/**
 * Converts a ChatMessage from the database to a Message for the orchestrator
 * @param chatMessage The chat message from the database
 * @returns A message formatted for the orchestrator
 */
function convertChatMessageToMessage(chatMessage: ChatMessage): Message {
  return {
    role: chatMessage.role as 'system' | 'user' | 'assistant', // ChatMessage roles align with Message roles
    content: chatMessage.content,
  };
}

/**
 * Estimates the number of tokens in a string
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

/**
 * Trims the memory to fit within the token limit
 * @param messages The messages to trim
 * @param newInstruction The new instruction to add
 * @param maxTokens The maximum number of tokens allowed
 * @returns The trimmed messages
 */
function trimMemoryToFitTokenLimit(
  messages: Message[],
  newInstruction: string,
  maxTokens: number = MAX_PROMPT_TOKENS
): Message[] {
  // Estimate tokens for the new instruction
  const instructionTokens = estimateTokenCount(newInstruction);
  
  // Reserve tokens for the system message (assuming ~500 tokens)
  const reservedTokens = 500 + instructionTokens;
  
  // Calculate remaining tokens for memory
  const remainingTokens = maxTokens - reservedTokens;
  
  if (remainingTokens <= 0) {
    // Not enough tokens for any memory
    return [];
  }
  
  // Start with the most recent messages and add as many as will fit
  let tokenCount = 0;
  const trimmedMessages: Message[] = [];
  
  // Process in reverse order (newest first) to prioritize recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokenCount(message.content);
    
    if (tokenCount + messageTokens <= remainingTokens) {
      trimmedMessages.unshift(message); // Add to the beginning to maintain chronological order
      tokenCount += messageTokens;
    } else {
      // This message won't fit, stop adding more
      break;
    }
  }
  
  return trimmedMessages;
}

/**
 * Combines the last N user messages from memory with a new instruction into a single prompt
 * @param userId The user ID to fetch messages for
 * @param newInstruction The new instruction to combine with memory
 * @param limit The maximum number of recent messages to include (default: 5)
 * @param maxTokens The maximum number of tokens allowed in the combined prompt
 * @returns The messages array ready for use with the orchestrator
 */
export async function combineMemoryWithInstruction(
  userId: string,
  newInstruction: string,
  limit: number = DEFAULT_RECENT_MESSAGES_COUNT,
  maxTokens: number = MAX_PROMPT_TOKENS
): Promise<Message[]> {
  try {
    // Fetch recent messages from the database
    const { data, error } = await getRecentMessages(userId, limit);
    
    if (error) {
      console.error('Error fetching recent messages:', error);
      // If we can't fetch memory, just return the new instruction
      return [
        {
          role: 'user',
          content: newInstruction,
        },
      ];
    }
    
    // Convert database messages to orchestrator messages
    const memoryMessages: Message[] = data ? data.map(convertChatMessageToMessage) : [];
    
    // Trim memory to fit within token limit
    const trimmedMemory = trimMemoryToFitTokenLimit(memoryMessages, newInstruction, maxTokens);
    
    // Add the new instruction as a user message
    const combinedMessages: Message[] = [
      ...trimmedMemory,
      {
        role: 'user',
        content: newInstruction,
      },
    ];
    
    return combinedMessages;
  } catch (error) {
    console.error('Error combining memory with instruction:', error);
    // If anything goes wrong, just return the new instruction
    return [
      {
        role: 'user',
        content: newInstruction,
      },
    ];
  }
}

/**
 * Creates a complete orchestration prompt by combining memory, system message, and new instruction
 * @param userId The user ID to fetch messages for
 * @param newInstruction The new instruction to combine with memory
 * @param systemMessage Optional system message to include
 * @param limit The maximum number of recent messages to include (default: 5)
 * @param maxTokens The maximum number of tokens allowed in the combined prompt
 * @returns The complete messages array ready for use with the orchestrator
 */
export async function createOrchestrationPrompt(
  userId: string,
  newInstruction: string,
  systemMessage?: string,
  limit: number = DEFAULT_RECENT_MESSAGES_COUNT,
  maxTokens: number = MAX_PROMPT_TOKENS
): Promise<Message[]> {
  // Get memory combined with the new instruction
  const combinedMessages = await combineMemoryWithInstruction(
    userId,
    newInstruction,
    limit,
    maxTokens
  );
  
  // If a system message is provided, add it at the beginning
  if (systemMessage) {
    return [
      {
        role: 'system',
        content: systemMessage,
      },
      ...combinedMessages,
    ];
  }
  
  return combinedMessages;
}
