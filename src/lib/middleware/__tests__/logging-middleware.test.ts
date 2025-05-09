/**
 * Tests for the Request Logging Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '../logging-middleware';
import { getPinoLogger } from '../../utils/pino-logger';

// Mock getPinoLogger
jest.mock('../../utils/pino-logger', () => ({
  getPinoLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

describe('Request Logging Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should log request and response details', async () => {
    // Create a mock handler
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test?param=value', {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      },
    });
    
    // Get the logger mock
    const loggerMock = getPinoLogger();
    
    // Apply the middleware
    const handlerWithLogging = withRequestLogging(mockHandler);
    
    // Execute the handler
    await handlerWithLogging(mockRequest);
    
    // Verify the request was logged
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        requestId: 'test-uuid',
        method: 'GET',
        path: '/api/test',
      }),
      expect.stringContaining('Request: GET /api/test')
    );
    
    // Verify the response was logged
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        requestId: 'test-uuid',
        status: 200,
      }),
      expect.stringContaining('Response: 200 GET /api/test')
    );
    
    // Verify the handler was called
    expect(mockHandler).toHaveBeenCalledWith(mockRequest);
  });
  
  it('should log errors when the handler throws', async () => {
    // Create a mock handler that throws an error
    const mockError = new Error('Test error');
    const mockHandler = jest.fn().mockRejectedValue(mockError);
    
    // Create a mock request
    const mockRequest = new NextRequest('https://example.com/api/test', {
      method: 'POST',
    });
    
    // Get the logger mock
    const loggerMock = getPinoLogger();
    
    // Apply the middleware
    const handlerWithLogging = withRequestLogging(mockHandler);
    
    // Execute the handler and expect it to throw
    await expect(handlerWithLogging(mockRequest)).rejects.toThrow('Test error');
    
    // Verify the request was logged
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        requestId: 'test-uuid',
        method: 'POST',
        path: '/api/test',
      }),
      expect.stringContaining('Request: POST /api/test')
    );
    
    // Verify the error was logged
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        requestId: 'test-uuid',
        error: 'Test error',
      }),
      expect.stringContaining('Error: POST /api/test')
    );
  });
  
  it('should redact sensitive headers', async () => {
    // Create a mock handler
    const mockHandler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );
    
    // Create a mock request with sensitive headers
    const mockRequest = new NextRequest('https://example.com/api/test', {
      method: 'GET',
      headers: {
        'authorization': 'Bearer token123',
        'cookie': 'session=abc123',
        'x-api-key': 'secret-api-key',
        'user-agent': 'test-agent',
      },
    });
    
    // Get the logger mock
    const loggerMock = getPinoLogger();
    
    // Apply the middleware
    const handlerWithLogging = withRequestLogging(mockHandler);
    
    // Execute the handler
    await handlerWithLogging(mockRequest);
    
    // Verify sensitive headers were redacted
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'authorization': '[REDACTED]',
          'cookie': '[REDACTED]',
          'x-api-key': '[REDACTED]',
          'user-agent': 'test-agent',
        }),
      }),
      expect.any(String)
    );
  });
});
