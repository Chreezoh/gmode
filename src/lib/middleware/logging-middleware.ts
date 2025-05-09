/**
 * Request Logging Middleware
 * 
 * This middleware logs HTTP requests and responses using Pino.
 * It includes request details, timing information, and response status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPinoLogger } from '../utils/pino-logger';
import { v4 as uuidv4 } from 'uuid';

// Fields to redact from request/response logs
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
];

// Fields to exclude from request body logging
const SENSITIVE_BODY_FIELDS = [
  'password',
  'passwordConfirm',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'credentials',
  'credit_card',
  'creditCard',
  'cardNumber',
  'cvv',
];

/**
 * Redact sensitive information from an object
 * @param obj Object to redact
 * @param sensitiveFields Fields to redact
 * @returns Redacted object
 */
function redactSensitiveInfo(obj: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
  const redacted = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}

/**
 * Safely stringify an object for logging
 * @param obj Object to stringify
 * @returns Safe string representation
 */
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '[Unstringifiable Object]';
  }
}

/**
 * Safely parse request body for logging
 * @param req Next.js request
 * @returns Parsed body or null
 */
async function safeParseBody(req: NextRequest): Promise<Record<string, any> | null> {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const text = await req.text();
      const body = JSON.parse(text);
      return redactSensitiveInfo(body, SENSITIVE_BODY_FIELDS);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get safe headers for logging
 * @param headers Headers object
 * @returns Safe headers object
 */
function getSafeHeaders(headers: Headers): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  
  headers.forEach((value, key) => {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      safeHeaders[key] = '[REDACTED]';
    } else {
      safeHeaders[key] = value;
    }
  });
  
  return safeHeaders;
}

/**
 * Middleware to log HTTP requests and responses
 * @param handler API route handler
 * @returns Handler with request logging
 */
export function withRequestLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const logger = getPinoLogger();
    const requestId = uuidv4();
    const startTime = Date.now();
    
    // Extract request details for logging
    const method = req.method;
    const url = req.url;
    const path = new URL(url).pathname;
    const query = Object.fromEntries(new URL(url).searchParams);
    const headers = getSafeHeaders(req.headers);
    const body = await safeParseBody(req);
    
    // Log the request
    logger.info({
      type: 'request',
      requestId,
      method,
      path,
      query,
      headers,
      body,
    }, `Request: ${method} ${path}`);
    
    try {
      // Execute the handler
      const response = await handler(req);
      
      // Calculate request duration
      const duration = Date.now() - startTime;
      
      // Extract response details for logging
      const status = response.status;
      const responseHeaders = getSafeHeaders(response.headers);
      
      // Log the response
      logger.info({
        type: 'response',
        requestId,
        status,
        headers: responseHeaders,
        duration,
      }, `Response: ${status} ${method} ${path} (${duration}ms)`);
      
      return response;
    } catch (error) {
      // Calculate request duration
      const duration = Date.now() - startTime;
      
      // Log the error
      logger.error({
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      }, `Error: ${method} ${path} (${duration}ms)`);
      
      // Re-throw the error to be handled by error middleware
      throw error;
    }
  };
}
