/**
 * Application constants and environment variables
 *
 * This file imports environment variables from the centralized env.ts module,
 * which handles validation and provides type safety.
 */

// Import environment variables from centralized module
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  OPENAI_API_KEY,
  OPENAI_API_ENDPOINT,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLIC_KEY,
  BING_SEARCH_API_KEY,
  BING_SEARCH_ENDPOINT,
  GOOGLE_SEARCH_API_KEY,
  GOOGLE_SEARCH_ENGINE_ID,
  APP_URL,
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST
} from './env';

// Memory configuration
export const DEFAULT_MEMORY_LIMIT = 20;

// Token usage and billing
export const DEFAULT_MODEL = 'gpt-4-1106-preview';
export const MODEL_COST_PER_1K_TOKENS = {
  'gpt-4-1106-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4-1106-vision-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4-0125-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4-turbo-preview': {
    prompt: 0.01,
    completion: 0.03,
  },
  'gpt-4': {
    prompt: 0.03,
    completion: 0.06,
  },
  'gpt-4-32k': {
    prompt: 0.06,
    completion: 0.12,
  },
  'gpt-3.5-turbo': {
    prompt: 0.0015,
    completion: 0.002,
  },
  'gpt-3.5-turbo-16k': {
    prompt: 0.003,
    completion: 0.004,
  },
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    monthlyCredits: 500,
    maxTokensPerRequest: 8000,
    price: 0,
  },
  BASIC: {
    name: 'Basic',
    monthlyCredits: 5000,
    maxTokensPerRequest: 16000,
    price: 10,
  },
  PRO: {
    name: 'Pro',
    monthlyCredits: 20000,
    maxTokensPerRequest: 32000,
    price: 30,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyCredits: 100000,
    maxTokensPerRequest: 64000,
    price: 100,
  },
};
