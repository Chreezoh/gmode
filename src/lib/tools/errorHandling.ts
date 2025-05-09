/**
 * Tool Error Handling Module
 * 
 * This module provides utility functions for handling errors in tool execution
 * with retry logic and fallback values.
 */

/**
 * Options for tool error handling
 */
export interface ToolErrorHandlingOptions<T> {
  /** Maximum number of retries (default: 1) */
  maxRetries?: number;
  
  /** Delay in milliseconds before retrying (default: 1000) */
  retryDelayMs?: number;
  
  /** Whether to use exponential backoff for retries (default: true) */
  useExponentialBackoff?: boolean;
  
  /** Maximum delay in milliseconds when using exponential backoff (default: 10000) */
  maxBackoffDelayMs?: number;
  
  /** Default value to return if all retries fail */
  defaultValue?: T;
  
  /** Function to log errors */
  logError?: (error: Error, context?: any) => void;
  
  /** Additional context information for error logging */
  context?: Record<string, any>;
  
  /** Function to notify the orchestrator of the failure */
  notifyOrchestrator?: (error: Error, context?: any) => void;
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate the delay for a retry attempt with exponential backoff
 * @param attempt The current attempt number (0-based)
 * @param baseDelayMs The base delay in milliseconds
 * @param maxDelayMs The maximum delay in milliseconds
 * @returns The delay in milliseconds
 */
const calculateBackoffDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number => {
  const delay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, maxDelayMs);
};

/**
 * Wraps a tool call function with error handling, retry logic, and fallback values
 * 
 * @param toolCall The function to execute the tool
 * @param options Error handling options
 * @returns The result of the tool call or the default value if all retries fail
 * 
 * @example
 * // Basic usage with default options (retry once)
 * const result = await withToolErrorHandling(
 *   () => myTool.execute({ param1: 'value' })
 * );
 * 
 * @example
 * // With custom options
 * const result = await withToolErrorHandling(
 *   () => myTool.execute({ param1: 'value' }),
 *   {
 *     maxRetries: 3,
 *     retryDelayMs: 2000,
 *     defaultValue: { status: 'error', message: 'Tool execution failed' },
 *     logError: (error) => console.error('Custom error log:', error)
 *   }
 * );
 */
export async function withToolErrorHandling<T>(
  toolCall: () => Promise<T>,
  options: ToolErrorHandlingOptions<T> = {}
): Promise<T> {
  // Set default options
  const {
    maxRetries = 1,
    retryDelayMs = 1000,
    useExponentialBackoff = true,
    maxBackoffDelayMs = 10000,
    defaultValue,
    logError = console.error,
    context = {},
    notifyOrchestrator,
  } = options;

  let lastError: Error | null = null;

  // Try the initial call and retries if needed
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If this is a retry attempt, wait before trying again
      if (attempt > 0) {
        const delay = useExponentialBackoff
          ? calculateBackoffDelay(attempt - 1, retryDelayMs, maxBackoffDelayMs)
          : retryDelayMs;
        
        await sleep(delay);
        
        // Log retry attempt
        console.info(`Retrying tool call (attempt ${attempt}/${maxRetries})...`);
      }

      // Execute the tool call
      return await toolCall();
    } catch (error) {
      // Convert error to proper Error object
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log the error with context
      logError(lastError, {
        attempt: attempt + 1,
        maxRetries,
        ...context,
      });
      
      // If this was the last attempt, we'll fall through to the fallback logic
    }
  }

  // If we get here, all attempts failed
  if (lastError && notifyOrchestrator) {
    notifyOrchestrator(lastError, context);
  }

  // If a default value was provided, return it
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // Otherwise, throw the last error
  throw lastError || new Error('Tool execution failed with unknown error');
}

/**
 * Wraps a tool's execute method with error handling
 * 
 * @param execute The original execute method
 * @param options Error handling options
 * @returns A new execute method with error handling
 * 
 * @example
 * const myTool = {
 *   name: 'my_tool',
 *   description: 'A tool that does something',
 *   parameters: { ... },
 *   execute: createToolExecuteWithErrorHandling(
 *     async (args) => {
 *       // Original implementation
 *       return { result: 'success' };
 *     },
 *     {
 *       maxRetries: 2,
 *       defaultValue: { status: 'error' }
 *     }
 *   )
 * };
 */
export function createToolExecuteWithErrorHandling<T extends Record<string, any>, R>(
  execute: (args: T) => Promise<R>,
  options: ToolErrorHandlingOptions<R> = {}
): (args: T) => Promise<R> {
  return async (args: T): Promise<R> => {
    return withToolErrorHandling(() => execute(args), {
      ...options,
      context: {
        ...options.context,
        arguments: args,
      },
    });
  };
}
