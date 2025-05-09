/**
 * Memory module type definitions
 */

/**
 * Represents a message in the conversation history
 */
export interface MemoryEntry {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for retrieving memory entries
 */
export interface MemoryRetrievalOptions {
  limit?: number;
  before?: string; // Timestamp or ID for pagination
  after?: string; // Timestamp or ID for pagination
  includeMetadata?: boolean;
}

/**
 * Result of a memory operation
 */
export interface MemoryOperationResult {
  success: boolean;
  data?: MemoryEntry | MemoryEntry[];
  error?: string;
}

/**
 * Memory storage interface
 */
export interface MemoryStorage {
  saveEntry(entry: MemoryEntry): Promise<MemoryOperationResult>;
  getEntries(userId: string, options?: MemoryRetrievalOptions): Promise<MemoryOperationResult>;
  deleteEntry(userId: string, entryId: string): Promise<MemoryOperationResult>;
  clearUserMemory(userId: string): Promise<MemoryOperationResult>;
}
