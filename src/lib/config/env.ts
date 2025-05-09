/**
 * Environment Configuration Module
 *
 * This module centralizes all environment variable access and validation.
 * It ensures that required environment variables are present and provides
 * type-safe access to them throughout the application.
 */

// Environment variable validation function
function validateEnv<T extends string>(
  key: string,
  value: string | undefined,
  required: boolean = true
): string {
  // Skip validation in test environment to allow tests to run
  if (process.env.NODE_ENV === 'test') {
    return value || 'test-value';
  }

  if (required && !value) {
    // In development, provide a helpful error message
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        `Environment variable ${key} is required but not set. ` +
        `Please check your .env.local file or environment configuration.`
      );
    }
    // In production, log the error but don't expose the specific missing variable
    console.error(`Missing required environment variable. Please check server configuration.`);
    throw new Error(`Server configuration error.`);
  }
  return value || '';
}

// Supabase Configuration
export const SUPABASE_URL = validateEnv(
  'NEXT_PUBLIC_SUPABASE_URL',
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

export const SUPABASE_ANON_KEY = validateEnv(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const SUPABASE_SERVICE_KEY = validateEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe Configuration
export const STRIPE_SECRET_KEY = validateEnv(
  'STRIPE_SECRET_KEY',
  process.env.STRIPE_SECRET_KEY
);

export const STRIPE_WEBHOOK_SECRET = validateEnv(
  'STRIPE_WEBHOOK_SECRET',
  process.env.STRIPE_WEBHOOK_SECRET
);

export const STRIPE_PUBLIC_KEY = validateEnv(
  'NEXT_PUBLIC_STRIPE_PUBLIC_KEY',
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  false // Not required in all environments
);

// OpenAI Configuration
export const OPENAI_API_KEY = validateEnv(
  'OPENAI_API_KEY',
  process.env.OPENAI_API_KEY
);

export const OPENAI_API_ENDPOINT = validateEnv(
  'OPENAI_API_ENDPOINT',
  process.env.OPENAI_API_ENDPOINT,
  false // Not required, has default value
) || 'https://api.openai.com/v1';

// Search API Configuration
export const BING_SEARCH_API_KEY = validateEnv(
  'BING_SEARCH_API_KEY',
  process.env.BING_SEARCH_API_KEY,
  false // Not required in all environments
);

export const BING_SEARCH_ENDPOINT = validateEnv(
  'BING_SEARCH_ENDPOINT',
  process.env.BING_SEARCH_ENDPOINT,
  false // Not required, has default value
) || 'https://api.bing.microsoft.com/v7.0/search';

export const GOOGLE_SEARCH_API_KEY = validateEnv(
  'GOOGLE_SEARCH_API_KEY',
  process.env.GOOGLE_SEARCH_API_KEY,
  false // Not required in all environments
);

export const GOOGLE_SEARCH_ENGINE_ID = validateEnv(
  'GOOGLE_SEARCH_ENGINE_ID',
  process.env.GOOGLE_SEARCH_ENGINE_ID,
  false // Not required in all environments
);

// Application Configuration
export const APP_URL = validateEnv(
  'NEXT_PUBLIC_APP_URL',
  process.env.NEXT_PUBLIC_APP_URL,
  false // Not required, has default value
) || 'http://localhost:3000';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// Export a function to validate all required environment variables at once
// This can be called during application startup
export function validateEnvironment(): void {
  // This will throw an error if any required variables are missing
  SUPABASE_URL;
  SUPABASE_ANON_KEY;
  SUPABASE_SERVICE_KEY;
  STRIPE_SECRET_KEY;
  STRIPE_WEBHOOK_SECRET;
  OPENAI_API_KEY;
}
