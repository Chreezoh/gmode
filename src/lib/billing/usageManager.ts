import { TokenUsage, logTokenUsage, logUsageAndUpdateCost } from './tokenUsage';
import { deductCredits, checkSufficientCredits } from './creditDeduction';

/**
 * Result interface for token usage operations
 */
export interface TokenUsageResult {
  success: boolean;
  error?: any;
  insufficientCredits?: boolean;
  creditsBalance?: number;
}

/**
 * Process token usage: check credits, deduct if sufficient, and log usage
 * @param userId The user ID
 * @param model The model used
 * @param usage The token usage data
 * @param description Optional description for the credit transaction
 * @returns Result of the operation
 */
export async function processTokenUsage(
  userId: string,
  model: string,
  usage: TokenUsage,
  description: string = 'Token usage'
): Promise<TokenUsageResult> {
  try {
    // First check if the user has sufficient credits
    const { sufficient, balance, error: checkError } = await checkSufficientCredits(userId, model, usage);
    
    if (checkError) {
      return { success: false, error: checkError };
    }
    
    if (!sufficient) {
      return { 
        success: false, 
        insufficientCredits: true,
        creditsBalance: balance,
        error: new Error('Insufficient credits') 
      };
    }
    
    // Log the token usage
    const logResult = await logTokenUsage(userId, model, usage);
    if (!logResult.success) {
      return logResult;
    }
    
    // Update monthly cost tracking
    const costResult = await logUsageAndUpdateCost(userId, model, usage);
    if (!costResult.success) {
      return costResult;
    }
    
    // Deduct credits from the user's balance
    const deductResult = await deductCredits(userId, model, usage, description);
    if (!deductResult.success) {
      return {
        success: false,
        error: deductResult.error,
        creditsBalance: deductResult.balance
      };
    }
    
    return { 
      success: true,
      creditsBalance: deductResult.balance
    };
  } catch (error) {
    console.error('Exception processing token usage:', error);
    return { success: false, error };
  }
}

/**
 * Check if a user can afford to use a specific model with estimated token usage
 * @param userId The user ID
 * @param model The model to be used
 * @param estimatedUsage The estimated token usage
 * @returns Whether the user can afford the operation and their current balance
 */
export async function canAffordModelUsage(
  userId: string,
  model: string,
  estimatedUsage: TokenUsage
): Promise<{ canAfford: boolean; balance: number; error?: any }> {
  try {
    const { sufficient, balance, error } = await checkSufficientCredits(userId, model, estimatedUsage);
    
    return {
      canAfford: sufficient,
      balance,
      error
    };
  } catch (error) {
    console.error('Exception checking if user can afford model usage:', error);
    return { canAfford: false, balance: 0, error };
  }
}
