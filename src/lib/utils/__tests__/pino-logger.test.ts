/**
 * Tests for the Pino logger implementation
 */

import { configurePinoLogger, getPinoLogger, pinoLogger, LogLevel } from '../pino-logger';

// Mock pino
jest.mock('pino', () => {
  const mockPino = jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  });
  
  // Add stdTimeFunctions to the mock
  mockPino.stdTimeFunctions = {
    isoTime: jest.fn(),
  };
  
  return mockPino;
});

describe('Pino Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create a logger with default configuration', () => {
    const logger = getPinoLogger();
    expect(logger).toBeDefined();
  });
  
  it('should allow configuration changes', () => {
    configurePinoLogger({
      level: LogLevel.ERROR,
      enabled: false,
    });
    
    const logger = getPinoLogger();
    expect(logger).toBeDefined();
  });
  
  it('should provide convenience methods that match our API', () => {
    const logger = getPinoLogger();
    
    pinoLogger.debug('Debug message', { context: 'test' });
    expect(logger.debug).toHaveBeenCalled();
    
    pinoLogger.info('Info message', { context: 'test' });
    expect(logger.info).toHaveBeenCalled();
    
    pinoLogger.warn('Warning message', { context: 'test' });
    expect(logger.warn).toHaveBeenCalled();
    
    pinoLogger.error('Error message', { context: 'test' });
    expect(logger.error).toHaveBeenCalled();
    
    pinoLogger.fatal('Fatal message', { context: 'test' });
    expect(logger.fatal).toHaveBeenCalled();
  });
  
  it('should handle context objects correctly', () => {
    const logger = getPinoLogger();
    
    pinoLogger.info('Message with context', { user: 'test', action: 'login' });
    expect(logger.info).toHaveBeenCalledWith({ user: 'test', action: 'login' }, 'Message with context');
  });
  
  it('should handle messages without context', () => {
    const logger = getPinoLogger();
    
    pinoLogger.info('Message without context');
    expect(logger.info).toHaveBeenCalledWith({}, 'Message without context');
  });
});
