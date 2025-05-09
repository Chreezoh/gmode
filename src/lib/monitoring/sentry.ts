/**
 * Sentry Configuration
 * 
 * This module configures Sentry for error tracking and monitoring.
 */

import * as Sentry from '@sentry/nextjs';
import { IS_PRODUCTION, IS_DEVELOPMENT } from '../config/constants';

// Environment-specific configuration
const SENTRY_ENABLED = process.env.SENTRY_ENABLED === 'true';
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const SENTRY_ENVIRONMENT = IS_PRODUCTION ? 'production' : IS_DEVELOPMENT ? 'development' : 'test';
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');

/**
 * Initialize Sentry
 */
export function initSentry(): void {
  if (!SENTRY_ENABLED || !SENTRY_DSN) {
    console.info('Sentry is disabled or DSN is not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    
    // Only send errors in production by default
    enabled: IS_PRODUCTION || SENTRY_ENABLED,
    
    // Adjust this value to control the volume of errors sent to Sentry
    // Lower values = fewer errors reported
    sampleRate: 0.5,
    
    // Capture unhandled promise rejections
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    // Sanitize sensitive data
    beforeSend(event) {
      // Don't send errors in development unless explicitly enabled
      if (IS_DEVELOPMENT && !SENTRY_ENABLED) {
        return null;
      }
      
      // Sanitize sensitive data from the event
      if (event.request && event.request.headers) {
        const sanitizedHeaders = { ...event.request.headers };
        
        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        for (const header of sensitiveHeaders) {
          if (header in sanitizedHeaders) {
            sanitizedHeaders[header] = '[REDACTED]';
          }
        }
        
        event.request.headers = sanitizedHeaders;
      }
      
      return event;
    },
  });
}

/**
 * Capture an exception in Sentry
 * @param error Error to capture
 * @param context Additional context
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Set user information for Sentry
 * @param user User information
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
}

/**
 * Clear user information from Sentry
 */
export function clearUser(): void {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

export default {
  initSentry,
  captureException,
  setUser,
  clearUser,
};
