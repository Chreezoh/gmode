# Logging and Monitoring

This document describes the logging and monitoring setup for the application.

## Structured Logging with Pino

The application uses [Pino](https://getpino.io/) for structured logging. Pino is a low-overhead JSON logger that is designed to be fast and efficient.

### Logger Configuration

The Pino logger is configured in `src/lib/utils/pino-logger.ts`. The configuration includes:

- Different log levels based on the environment (debug in development, info in production)
- Redaction of sensitive information (passwords, tokens, etc.)
- Pretty printing in development for better readability
- JSON output in production for easier parsing

### Usage

You can use the logger in your code as follows:

```typescript
import { pinoLogger } from '@/lib/utils/pino-logger';

// Simple logging
pinoLogger.info('User logged in');

// Logging with context
pinoLogger.info('User action', { userId: '123', action: 'login' });

// Different log levels
pinoLogger.debug('Debug message');
pinoLogger.info('Info message');
pinoLogger.warn('Warning message');
pinoLogger.error('Error message', { error: err });
pinoLogger.fatal('Fatal error', { error: err });
```

### Request Logging

All API requests are automatically logged using the request logging middleware in `src/lib/middleware/logging-middleware.ts`. This middleware logs:

- Request details (method, path, query parameters)
- Request headers (with sensitive information redacted)
- Request body (with sensitive information redacted)
- Response status code
- Response time
- Any errors that occur during request processing

## Error Handling

The application includes a robust error handling system defined in `src/lib/middleware/error-middleware.ts`. This middleware:

- Catches unhandled errors in API routes
- Formats errors consistently
- Returns standardized error responses
- Logs errors with appropriate context
- Integrates with Sentry for error tracking (in production)

### Custom Error Classes

The application defines several custom error classes in `src/lib/utils/error.ts`:

- `ApiError`: General API errors with status code
- `AuthError`: Authentication errors
- `ValidationError`: Input validation errors
- `BillingError`: Billing-related errors
- `ToolError`: Errors from tool execution

### Usage

You can use the error handling middleware in your API routes as follows:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withLoggingAndErrorHandling } from '@/lib/middleware/error-middleware';
import { ValidationError } from '@/lib/utils/error';

async function handler(req: NextRequest): Promise<NextResponse> {
  // Your handler code
  if (!isValid) {
    throw new ValidationError('Invalid input', { field: 'error message' });
  }
  
  return NextResponse.json({ success: true });
}

// Export the handler with logging and error handling
export const POST = withLoggingAndErrorHandling(handler);
```

## Error Monitoring with Sentry

The application integrates with [Sentry](https://sentry.io/) for error monitoring in production. Sentry captures unhandled exceptions and provides detailed error reports.

### Configuration

Sentry is configured in:

- `sentry.client.config.ts`: Client-side configuration
- `sentry.server.config.ts`: Server-side configuration
- `src/lib/monitoring/sentry.ts`: Utility functions for Sentry

### Environment Variables

Sentry requires the following environment variables:

- `SENTRY_DSN`: Your Sentry DSN (required)
- `SENTRY_ENABLED`: Whether Sentry is enabled (default: false)
- `SENTRY_TRACES_SAMPLE_RATE`: Percentage of transactions to sample (default: 0.1)

### Manual Error Capturing

You can manually capture errors in Sentry as follows:

```typescript
import { captureException } from '@/lib/monitoring/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, { context: 'additional context' });
  // Handle the error
}
```

## Best Practices

1. **Use appropriate log levels**:
   - `debug`: Detailed information for debugging
   - `info`: General information about application operation
   - `warn`: Warning conditions that don't affect normal operation
   - `error`: Error conditions that affect operation but don't crash the application
   - `fatal`: Severe error conditions that may cause the application to crash

2. **Include context in logs**:
   - Add relevant context to logs (user ID, request ID, etc.)
   - Don't include sensitive information in logs

3. **Use custom error classes**:
   - Use the appropriate error class for each type of error
   - Include relevant details in the error message and context

4. **Handle errors at the appropriate level**:
   - Handle expected errors at the lowest level possible
   - Let unexpected errors propagate to the error middleware

5. **Monitor error rates**:
   - Set up alerts for unusual error rates in Sentry
   - Regularly review error reports to identify patterns
