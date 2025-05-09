import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { calculateCost, TokenUsage } from './tokenUsage';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config/env';

// Create a function to get the Supabase client
// This makes it easier to mock in tests
export function getSupabaseClient(): ReturnType<typeof createClient<Database>> | null {
  try {
    // Use service role key for admin operations
    return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
}

// For testing purposes
export let _supabaseClientForTesting: ReturnType<typeof createClient<Database>> | null = null;

// We'll get a fresh client for each function call to make testing easier

/**
 * Interface for credit transaction types
 */
export enum CreditTransactionType {
  DEDUCTION = 'deduction',
  ADDITION = 'addition',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

/**
 * Interface for credit transaction data
 */
export interface CreditTransaction {
  user_id: string;
  amount: number;
  balance_after: number;
  description: string;
  transaction_type: CreditTransactionType;
  reference_id?: string;
}

/**
 * Check if a user has sufficient credits for a token usage
 * @param userId The user ID
 * @param model The model to be used
 * @param usage The estimated token usage
 * @returns Whether the user has sufficient credits and the current balance
 */
export async function checkSufficientCredits(
  userId: string,
  model: string,
  usage: TokenUsage
): Promise<{ sufficient: boolean; balance: number; error?: any }> {
  try {
    // Get a fresh Supabase client or use the testing client
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Credit check bypassed.');
      return { sufficient: true, balance: 0 }; // Bypass check in development
    }

    // Calculate the cost of the operation
    const cost = calculateCost(model, usage);

    // Get the user's current credit balance
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking user credits:', error);
      return { sufficient: false, balance: 0, error };
    }

    // If no record exists, the user has no credits
    if (!data) {
      return { sufficient: false, balance: 0 };
    }

    const balance = data.credits_balance;

    // Check if the user has enough credits
    return {
      sufficient: balance >= cost,
      balance
    };
  } catch (error) {
    console.error('Exception checking user credits:', error);
    return { sufficient: false, balance: 0, error };
  }
}

/**
 * Deduct credits from a user's balance
 * @param userId The user ID
 * @param model The model used
 * @param usage The token usage data
 * @param description Optional description of the transaction
 * @returns Result of the operation
 */
export async function deductCredits(
  userId: string,
  model: string,
  usage: TokenUsage,
  description: string = 'Token usage'
): Promise<{ success: boolean; balance?: number; error?: any }> {
  try {
    // Get a fresh Supabase client or use the testing client
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Credits not deducted.');
      return { success: true }; // Return success to avoid disrupting the application flow
    }

    // Calculate the cost to deduct
    const amount = calculateCost(model, usage);

    // First check if the user has sufficient credits
    const { sufficient, balance, error: checkError } = await checkSufficientCredits(userId, model, usage);

    if (checkError) {
      return { success: false, error: checkError };
    }

    if (!sufficient) {
      return {
        success: false,
        balance,
        error: new Error('Insufficient credits')
      };
    }

    // Start a transaction to update the balance and record the transaction
    // Note: Supabase doesn't support true transactions via the JS client yet,
    // so we'll do our best to ensure consistency

    // 1. Update the user's credit balance
    const newBalance = balance - amount;
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        credits_balance: newBalance,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return { success: false, error: updateError };
    }

    // 2. Record the transaction in the ledger
    const transaction: CreditTransaction = {
      user_id: userId,
      amount: -amount, // Negative amount for deductions
      balance_after: newBalance,
      description: `${description}: ${model} (${usage.totalTokens} tokens)`,
      transaction_type: CreditTransactionType.DEDUCTION,
    };

    const { error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert(transaction);

    if (ledgerError) {
      console.error('Error recording credit transaction:', ledgerError);
      // We should try to revert the balance update here in a real transaction
      return { success: false, error: ledgerError };
    }

    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('Exception deducting credits:', error);
    return { success: false, error };
  }
}

/**
 * Add credits to a user's balance
 * @param userId The user ID
 * @param amount The amount of credits to add
 * @param description Description of the transaction
 * @param transactionType Type of transaction (default: addition)
 * @param referenceId Optional reference ID (e.g., payment ID)
 * @returns Result of the operation
 */
export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  transactionType: CreditTransactionType = CreditTransactionType.ADDITION,
  referenceId?: string
): Promise<{ success: boolean; balance?: number; error?: any }> {
  try {
    // Get a fresh Supabase client or use the testing client
    const supabase = _supabaseClientForTesting || getSupabaseClient();

    // Check if Supabase client is available
    if (!supabase) {
      console.warn('Supabase client not initialized. Credits not added.');
      return { success: true }; // Return success to avoid disrupting the application flow
    }

    // Get the user's current credit balance
    const { data, error: fetchError } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', userId)
      .single();

    let currentBalance = 0;
    let isNewUser = false;

    if (fetchError) {
      // If the error is that no rows were returned, this is a new user
      if (fetchError.code === 'PGRST116') {
        isNewUser = true;
      } else {
        console.error('Error fetching user credits:', fetchError);
        return { success: false, error: fetchError };
      }
    } else if (data) {
      currentBalance = data.credits_balance;
    }

    const newBalance = currentBalance + amount;

    // Update or insert the user's credit balance
    if (isNewUser) {
      // Insert a new record
      const { error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          credits_balance: newBalance,
          last_updated: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting user credits:', insertError);
        return { success: false, error: insertError };
      }
    } else {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          credits_balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return { success: false, error: updateError };
      }
    }

    // Record the transaction in the ledger
    const transaction: CreditTransaction = {
      user_id: userId,
      amount: amount, // Positive amount for additions
      balance_after: newBalance,
      description,
      transaction_type: transactionType,
      reference_id: referenceId
    };

    const { error: ledgerError } = await supabase
      .from('credit_ledger')
      .insert(transaction);

    if (ledgerError) {
      console.error('Error recording credit transaction:', ledgerError);
      return { success: false, error: ledgerError };
    }

    return { success: true, balance: newBalance };
  } catch (error) {
    console.error('Exception adding credits:', error);
    return { success: false, error };
  }
}
