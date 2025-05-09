import { RetryOptions } from './types';

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 10000,
};

/**
 * Sleep for a specified number of milliseconds
 * @param ms The number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculate the delay for a retry attempt
 * @param attempt The current attempt number (0-based)
 * @param options The retry options
 * @returns The delay in milliseconds
 */
export const calculateRetryDelay = (
  attempt: number,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): number => {
  const delay = options.initialDelayMs * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelayMs);
};

/**
 * Execute a function with retry logic
 * @param fn The function to execute
 * @param options The retry options
 * @returns The result of the function
 * @throws The last error encountered if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // If this is a retry attempt, wait before trying again
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1, options);
        await sleep(delay);
      }

      // Execute the function
      return await fn();
    } catch (error) {
      // Store the error for potential re-throw
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log the error and retry information
      console.error(`Attempt ${attempt + 1}/${options.maxRetries + 1} failed:`, lastError);
      
      // If this was the last attempt, we'll fall through and throw the error
    }
  }

  // If we get here, all attempts failed
  throw lastError || new Error('All retry attempts failed');
}
