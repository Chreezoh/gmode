/**
 * Tests for the Tool Error Handling module
 */

import { withToolErrorHandling, createToolExecuteWithErrorHandling } from '../errorHandling';
import { Tool } from '../../orchestration/types';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

describe('Tool Error Handling', () => {
  // Setup and teardown
  beforeEach(() => {
    console.error = jest.fn();
    console.info = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    jest.clearAllMocks();
  });

  describe('withToolErrorHandling', () => {
    it('should return the result when the tool call succeeds', async () => {
      // Arrange
      const mockToolCall = jest.fn().mockResolvedValue({ success: true, data: 'test' });

      // Act
      const result = await withToolErrorHandling(mockToolCall);

      // Assert
      expect(result).toEqual({ success: true, data: 'test' });
      expect(mockToolCall).toHaveBeenCalledTimes(1);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should retry once by default when the tool call fails', async () => {
      // Arrange
      const mockToolCall = jest.fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({ success: true, data: 'retry succeeded' });

      // Act
      const result = await withToolErrorHandling(mockToolCall, {
        retryDelayMs: 10, // Use a small delay for testing
      });

      // Assert
      expect(result).toEqual({ success: true, data: 'retry succeeded' });
      expect(mockToolCall).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(1);
    });

    it('should retry multiple times based on maxRetries', async () => {
      // Arrange
      const mockToolCall = jest.fn()
        .mockRejectedValueOnce(new Error('Test error 1'))
        .mockRejectedValueOnce(new Error('Test error 2'))
        .mockResolvedValueOnce({ success: true, data: 'retry succeeded' });

      // Act
      const result = await withToolErrorHandling(mockToolCall, {
        maxRetries: 2,
        retryDelayMs: 10, // Use a small delay for testing
      });

      // Assert
      expect(result).toEqual({ success: true, data: 'retry succeeded' });
      expect(mockToolCall).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.info).toHaveBeenCalledTimes(2);
    });

    it('should return the default value if all retries fail', async () => {
      // Arrange
      const mockToolCall = jest.fn().mockRejectedValue(new Error('Test error'));
      const defaultValue = { success: false, error: 'Tool execution failed' };

      // Act
      const result = await withToolErrorHandling(mockToolCall, {
        maxRetries: 2,
        retryDelayMs: 10,
        defaultValue,
      });

      // Assert
      expect(result).toEqual(defaultValue);
      expect(mockToolCall).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(console.error).toHaveBeenCalledTimes(3);
    });

    it('should throw the last error if all retries fail and no default value is provided', async () => {
      // Arrange
      const mockToolCall = jest.fn().mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(withToolErrorHandling(mockToolCall, {
        maxRetries: 1,
        retryDelayMs: 10,
      })).rejects.toThrow('Test error');
      
      expect(mockToolCall).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(console.error).toHaveBeenCalledTimes(2);
    });

    it('should use custom error logging if provided', async () => {
      // Arrange
      const mockToolCall = jest.fn().mockRejectedValue(new Error('Test error'));
      const mockLogError = jest.fn();

      // Act
      try {
        await withToolErrorHandling(mockToolCall, {
          maxRetries: 1,
          retryDelayMs: 10,
          logError: mockLogError,
        });
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockLogError).toHaveBeenCalledTimes(2);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should notify the orchestrator if provided and all retries fail', async () => {
      // Arrange
      const mockToolCall = jest.fn().mockRejectedValue(new Error('Test error'));
      const mockNotifyOrchestrator = jest.fn();

      // Act
      try {
        await withToolErrorHandling(mockToolCall, {
          maxRetries: 1,
          retryDelayMs: 10,
          notifyOrchestrator: mockNotifyOrchestrator,
        });
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockNotifyOrchestrator).toHaveBeenCalledTimes(1);
      expect(mockNotifyOrchestrator).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('createToolExecuteWithErrorHandling', () => {
    it('should wrap a tool execute method with error handling', async () => {
      // Arrange
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('Test error'))
        .mockResolvedValueOnce({ success: true, data: 'retry succeeded' });

      const wrappedExecute = createToolExecuteWithErrorHandling(mockExecute, {
        maxRetries: 1,
        retryDelayMs: 10,
      });

      // Act
      const result = await wrappedExecute({ param1: 'test' });

      // Assert
      expect(result).toEqual({ success: true, data: 'retry succeeded' });
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledWith({ param1: 'test' });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should include arguments in the error context', async () => {
      // Arrange
      const mockExecute = jest.fn().mockRejectedValue(new Error('Test error'));
      const mockLogError = jest.fn();

      const wrappedExecute = createToolExecuteWithErrorHandling(mockExecute, {
        maxRetries: 0,
        logError: mockLogError,
      });

      // Act
      try {
        await wrappedExecute({ param1: 'test', param2: 123 });
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          arguments: { param1: 'test', param2: 123 },
        })
      );
    });

    it('should be usable in a tool definition', async () => {
      // Arrange
      const mockExecute = jest.fn().mockResolvedValue({ success: true });
      
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          param1: { type: 'string' },
        },
        execute: createToolExecuteWithErrorHandling(mockExecute),
      };

      // Act
      const result = await tool.execute({ param1: 'test' });

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockExecute).toHaveBeenCalledWith({ param1: 'test' });
    });
  });
});
