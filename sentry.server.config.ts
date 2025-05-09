/**
 * Sentry Server Configuration
 * 
 * This file configures Sentry for server-side error tracking.
 */

import * as Sentry from '@sentry/nextjs';
import { IS_PRODUCTION } from './src/lib/config/constants';

const SENTRY_ENABLED = process.env.SENTRY_ENABLED === 'true';
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const SENTRY_ENVIRONMENT = IS_PRODUCTION ? 'production' : 'development';

if (SENTRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions
    
    // Only send errors in production by default
    enabled: IS_PRODUCTION || SENTRY_ENABLED,
    
    // Adjust this value to control the volume of errors sent to Sentry
    sampleRate: 0.5,
    
    // Set the maximum breadcrumbs to capture
    maxBreadcrumbs: 50,
    
    // Sanitize sensitive data
    beforeSend(event) {
      // Don't send errors in development unless explicitly enabled
      if (!IS_PRODUCTION && !SENTRY_ENABLED) {
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
