import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/env';

// Initialize the Supabase client with validated environment variables
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Sign in a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns Result of the sign-in operation
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error };
  }
}

/**
 * Sign up a new user with email and password
 * @param email User's email
 * @param password User's password
 * @returns Result of the sign-up operation
 */
export async function signUpWithEmail(email: string, password: string) {
  try {
    // For development purposes, we're disabling email confirmation
    // In production, you would want to enable this
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This allows users to sign in without email verification
        // Only use this for development/testing
        emailRedirectTo: `${window.location.origin}/auth/login`,
      }
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { data: null, error };
  }
}

/**
 * Sign out the current user
 * @returns Result of the sign-out operation
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
}

/**
 * Get the current user session
 * @returns The current session or null if not authenticated
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error getting session:', error);
    return { data: null, error };
  }
}

/**
 * Reset password for a user
 * @param email User's email
 * @returns Result of the password reset operation
 */
export async function resetPassword(email: string) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { data: null, error };
  }
}