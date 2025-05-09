/**
 * Validation utilities using Zod
 */
import { z } from 'zod';

/**
 * User schema for validation
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Login credentials schema
 */
export const LoginCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Registration data schema
 */
export const RegistrationDataSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().optional(),
});

/**
 * Password reset request schema
 */
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Password update schema
 */
export const PasswordUpdateSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  token: z.string(),
});

/**
 * Memory entry schema
 */
export const MemoryEntrySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  role: z.enum(['user', 'assistant', 'system']),
  metadata: z.record(z.any()).optional(),
});

/**
 * Orchestration request schema
 */
export const OrchestrationRequestSchema = z.object({
  task: z.string().min(1, 'Task is required'),
  additionalContext: z.string().optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
});

/**
 * Token usage schema
 */
export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
});

/**
 * Web search request schema
 */
export const WebSearchRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  provider: z.enum(['bing', 'google']).optional(),
  numResults: z.number().int().min(1).max(50).optional(),
  safeSearch: z.boolean().optional(),
});
