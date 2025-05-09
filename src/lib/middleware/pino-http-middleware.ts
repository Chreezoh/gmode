/**
 * Pino HTTP Middleware for Next.js API Routes
 * 
 * This middleware integrates pino-http with Next.js API routes
 * to provide structured request logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import pinoHttp from 'pino-http';
import { getPinoLogger } from '../utils/pino-logger';
import { v4 as uuidv4 } from 'uuid';

// Create pino-http instance
const pinoHttpMiddleware = pinoHttp({
  logger: getPinoLogger(),
  genReqId: () => uuidv4(),
  customLogLevel: (req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'responseTimeMs',
  },
  redact: {
    paths: [
      'request.headers.authorization',
      'request.headers.cookie',
      'request.headers["x-api-key"]',
      'request.body.password',
      'request.body.token',
      'request.body.accessToken',
      'request.body.refreshToken',
      'request.body.apiKey',
      'request.body.secret',
      'request.body.credentials',
      'response.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req: (req) => {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        path: req.path,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      };
    },
    res: (res) => {
      return {
        statusCode: res.statusCode,
        headers: res.headers,
      };
    },
    err: (err) => {
      return {
        type: err.type,
        message: err.message,
        stack: err.stack,
      };
    },
  },
});

/**
 * Adapter for pino-http to work with Next.js API routes
 * @param handler Next.js API route handler
 * @returns Handler with pino-http logging
 */
export function withPinoHttp(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Create a mock Node.js request and response objects
    const mockReq: any = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      socket: {
        remoteAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        remotePort: 0,
      },
    };
    
    let responseBody: any;
    let responseStatus = 200;
    let responseHeaders: Record<string, string> = {};
    
    const mockRes: any = {
      statusCode: 200,
      headers: {},
      setHeader: (name: string, value: string) => {
        mockRes.headers[name] = value;
      },
      getHeader: (name: string) => mockRes.headers[name],
      removeHeader: (name: string) => {
        delete mockRes.headers[name];
      },
    };
    
    // Apply pino-http middleware to mock objects
    pinoHttpMiddleware(mockReq, mockRes);
    
    try {
      // Execute the handler
      const response = await handler(req);
      
      // Extract response details
      responseStatus = response.status;
      responseHeaders = Object.fromEntries(response.headers.entries());
      
      try {
        // Try to clone and parse the response body
        const clonedResponse = response.clone();
        const contentType = clonedResponse.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          responseBody = await clonedResponse.json();
        }
      } catch (error) {
        // Ignore errors when trying to parse the response body
      }
      
      // Update mock response for logging
      mockRes.statusCode = responseStatus;
      mockRes.headers = responseHeaders;
      
      // Log the response
      mockReq.log.info({
        response: {
          statusCode: responseStatus,
          headers: responseHeaders,
          body: responseBody,
        },
      });
      
      return response;
    } catch (error) {
      // Update mock response for logging
      mockRes.statusCode = 500;
      
      // Log the error
      mockReq.log.error({
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
      
      // Re-throw the error to be handled by error middleware
      throw error;
    }
  };
}
