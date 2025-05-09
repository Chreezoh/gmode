/**
 * Error Handling Middleware
 * 
 * This middleware catches unhandled errors in API routes,
 * formats them consistently, and returns standardized error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPinoLogger } from '../utils/pino-logger';
import { formatErrorResponse } from '../utils/error';
import * as Sentry from '@sentry/nextjs';
import { IS_PRODUCTION } from '../config/constants';

/**
 * Middleware to handle errors in API routes
 * @param handler API route handler
 * @returns Handler with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const logger = getPinoLogger();
    
    try {
      // Execute the handler
      return await handler(req);
    } catch (error) {
      // Log the error
      logger.error({
        type: 'unhandled_error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: req.url,
        method: req.method,
      }, 'Unhandled error in API route');
      
      // Capture error in Sentry if in production
      if (IS_PRODUCTION) {
        Sentry.captureException(error);
      }
      
      // Format the error response
      const formattedError = formatErrorResponse(error);
      
      // Return a standardized error response
      return NextResponse.json(
        { error: formattedError.error, details: formattedError.details },
        { status: formattedError.statusCode || 500 }
      );
    }
  };
}

/**
 * Combine multiple middleware functions
 * @param middlewares Array of middleware functions
 * @returns Combined middleware function
 */
export function combineMiddleware(
  middlewares: Array<(handler: (req: NextRequest) => Promise<NextResponse>) => (req: NextRequest) => Promise<NextResponse>>
) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Combine request logging and error handling middleware
 * @param handler API route handler
 * @returns Handler with logging and error handling
 */
export function withLoggingAndErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  // Import here to avoid circular dependency
  const { withRequestLogging } = require('./logging-middleware');
  
  return combineMiddleware([
    withErrorHandling,
    withRequestLogging,
  ])(handler);
}
