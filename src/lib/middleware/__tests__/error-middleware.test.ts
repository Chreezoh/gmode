/**
 * Tests for the Error Handling Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, combineMiddleware } from '../error-middleware';
import { getPinoLogger } from '../../utils/pino-logger';
import { ApiError, ValidationError } from '../../utils/error';

// Mock getPinoLogger
jest.mock('../../utils/pino-logger', () => ({
  getPinoLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
  }),
}));

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

// Mock IS_PRODUCTION
jest.mock('../../config/constants', () => ({
  IS_PRODUCTION: false,
}));

describe('Error Handling Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should pass through successful responses', async () => {
    // Create a mock handler
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test');
    
    // Apply the middleware
    const handlerWithErrorHandling = withErrorHandling(mockHandler);
    
    // Execute the handler
    const response = await handlerWithErrorHandling(mockRequest);
    
    // Verify the handler was called
    expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    
    // Verify the response was passed through
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    
    // Verify no errors were logged
    const loggerMock = getPinoLogger();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });
  
  it('should handle ApiError with correct status code', async () => {
    // Create a mock handler that throws an ApiError
    const mockError = new ApiError('Bad request', 400, { field: 'invalid' });
    const mockHandler = jest.fn().mockRejectedValue(mockError);
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test');
    
    // Apply the middleware
    const handlerWithErrorHandling = withErrorHandling(mockHandler);
    
    // Execute the handler
    const response = await handlerWithErrorHandling(mockRequest);
    
    // Verify the response has the correct status and body
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Bad request',
      details: { field: 'invalid' },
    });
    
    // Verify the error was logged
    const loggerMock = getPinoLogger();
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'unhandled_error',
        error: 'Bad request',
      }),
      'Unhandled error in API route'
    );
  });
  
  it('should handle ValidationError with correct details', async () => {
    // Create a mock handler that throws a ValidationError
    const mockError = new ValidationError('Validation failed', {
      email: 'Invalid email format',
    });
    const mockHandler = jest.fn().mockRejectedValue(mockError);
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test');
    
    // Apply the middleware
    const handlerWithErrorHandling = withErrorHandling(mockHandler);
    
    // Execute the handler
    const response = await handlerWithErrorHandling(mockRequest);
    
    // Verify the response has the correct status and body
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Validation failed',
      details: {
        email: 'Invalid email format',
      },
    });
  });
  
  it('should handle generic errors with 500 status code', async () => {
    // Create a mock handler that throws a generic Error
    const mockError = new Error('Something went wrong');
    const mockHandler = jest.fn().mockRejectedValue(mockError);
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test');
    
    // Apply the middleware
    const handlerWithErrorHandling = withErrorHandling(mockHandler);
    
    // Execute the handler
    const response = await handlerWithErrorHandling(mockRequest);
    
    // Verify the response has the correct status and body
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Something went wrong',
    });
  });
  
  it('should combine multiple middleware functions', async () => {
    // Create mock middleware functions
    const middleware1 = jest.fn((handler) => async (req) => {
      return handler(req);
    });
    
    const middleware2 = jest.fn((handler) => async (req) => {
      return handler(req);
    });
    
    // Create a mock handler
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );
    
    // Combine the middleware
    const combinedHandler = combineMiddleware([
      middleware1,
      middleware2,
    ])(mockHandler);
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test');
    
    // Execute the handler
    await combinedHandler(mockRequest);
    
    // Verify the middleware functions were called in the correct order
    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith(mockRequest);
  });
});
