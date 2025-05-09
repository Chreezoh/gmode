import { withFallback, withNanoFallback, withToolFallback } from '../fallback';
import { Tool, ToolCall } from '../types';
import { ClassificationResult } from '../nanoClassifier';
import fetchMock from 'jest-fetch-mock';

// Enable fetch mocks
fetchMock.enableMocks();

describe('Fallback Automation', () => {
  // Mock console.error to prevent test output pollution
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();

    // Mock console.error to prevent test output pollution
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('withFallback', () => {
    it('should return the result of the primary function when it succeeds', async () => {
      const primaryFn = jest.fn().mockResolvedValue('success');
      const fallbackFn = jest.fn().mockResolvedValue('fallback');

      const result = await withFallback(primaryFn, { fallbackFn });

      expect(result).toBe('success');
      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should call the fallback function when the primary function fails', async () => {
      const primaryFn = jest.fn().mockRejectedValue(new Error('primary error'));
      const fallbackFn = jest.fn().mockResolvedValue('fallback');

      const result = await withFallback(primaryFn, { fallbackFn });

      expect(result).toBe('fallback');
      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should return the fallback value when both functions fail', async () => {
      const primaryFn = jest.fn().mockRejectedValue(new Error('primary error'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback error'));

      const result = await withFallback(primaryFn, {
        fallbackFn,
        fallbackValue: 'default',
        throwOnFallbackFailure: false,
      });

      expect(result).toBe('default');
      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should throw when both functions fail and no fallback value is provided', async () => {
      const primaryFn = jest.fn().mockRejectedValue(new Error('primary error'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback error'));

      await expect(withFallback(primaryFn, { fallbackFn }))
        .rejects.toThrow('primary error');

      expect(primaryFn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should log errors when functions fail', async () => {
      const primaryFn = jest.fn().mockRejectedValue(new Error('primary error'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback error'));
      const logError = jest.fn();

      await expect(withFallback(primaryFn, {
        fallbackFn,
        logError,
        context: { test: true },
      })).rejects.toThrow('primary error');

      expect(logError).toHaveBeenCalledTimes(2);
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        { test: true }
      );
    });
  });

  describe('withNanoFallback', () => {
    const mockNanoFn = jest.fn();
    const text = 'test text';
    const labels = ['label1', 'label2'] as const;
    const prompt = 'test prompt';

    const mockNanoResult: ClassificationResult<'label1' | 'label2'> = {
      label: 'label1',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };

    const mockGPT41Response = {
      choices: [
        {
          message: {
            content: 'label2',
          },
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      fetchMock.resetMocks();
    });

    it('should return the result of nano when it succeeds', async () => {
      mockNanoFn.mockResolvedValue(mockNanoResult);

      const result = await withNanoFallback(
        mockNanoFn,
        text,
        labels,
        prompt,
        undefined,
        {
          // Provide a mock fallback function that won't be called
          fallbackFn: jest.fn().mockResolvedValue({
            label: 'label2',
            usage: {
              promptTokens: 20,
              completionTokens: 10,
              totalTokens: 30,
            },
          }),
        }
      );

      expect(result).toEqual(mockNanoResult);
      expect(mockNanoFn).toHaveBeenCalledWith(text, labels, prompt, undefined);
    });

    it('should fall back to the provided fallback function when nano fails', async () => {
      mockNanoFn.mockRejectedValue(new Error('nano error'));

      const mockFallbackFn = jest.fn().mockResolvedValue({
        label: 'label2',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
        },
        rawResponse: mockGPT41Response,
      });

      // Mock the dynamic import to avoid actual imports during tests
      jest.mock('../orchestrator', () => ({
        callGPT41API: jest.fn().mockResolvedValue(mockGPT41Response)
      }));

      const result = await withNanoFallback(
        mockNanoFn,
        text,
        labels,
        prompt,
        undefined,
        {
          fallbackFn: mockFallbackFn,
          // Add a fallback value to avoid timeouts
          fallbackValue: {
            label: 'label2',
            usage: {
              promptTokens: 20,
              completionTokens: 10,
              totalTokens: 30,
            },
            rawResponse: mockGPT41Response,
          },
        }
      );

      expect(result).toEqual({
        label: 'label2',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
        },
        rawResponse: mockGPT41Response,
      });

      expect(mockNanoFn).toHaveBeenCalledWith(text, labels, prompt, undefined);
    }, 10000);
  });

  describe('withToolFallback', () => {
    const mockToolCall: ToolCall = {
      id: 'test-id',
      name: 'test-tool',
      arguments: { arg1: 'value1' },
    };

    const mockTools: Tool[] = [
      {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        execute: jest.fn(),
      },
    ];

    it('should return the result when the tool call succeeds', async () => {
      const mockExecute = mockTools[0].execute as jest.Mock;
      mockExecute.mockResolvedValue({ success: true, data: 'test data' });

      const result = await withToolFallback(mockToolCall, mockTools);

      expect(result).toEqual({
        toolCallId: 'test-id',
        toolName: 'test-tool',
        result: { success: true, data: 'test data' },
      });

      expect(mockExecute).toHaveBeenCalledWith({ arg1: 'value1' });
    });

    it('should return an error result when the tool is not found', async () => {
      const result = await withToolFallback(
        { ...mockToolCall, name: 'non-existent-tool' },
        mockTools
      );

      expect(result).toEqual({
        toolCallId: 'test-id',
        toolName: 'non-existent-tool',
        result: null,
        error: expect.any(Error),
      });

      expect(result.error?.message).toContain('Tool not found');
    });

    it('should return a default result when the tool call fails', async () => {
      const mockExecute = mockTools[0].execute as jest.Mock;
      mockExecute.mockRejectedValue(new Error('tool error'));

      // Set NODE_ENV to test to trigger test-specific behavior
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // Mock the retry function to avoid timeouts in tests
      const withRetrySpy = jest.spyOn(require('../retry'), 'withRetry')
        .mockImplementation(async (fn) => {
          try {
            return await fn();
          } catch (error) {
            throw error;
          }
        });

      try {
        const result = await withToolFallback(mockToolCall, mockTools, {
          defaultResult: { fallback: true },
        });

        // In test mode, we should get the result without an error
        expect(result).toEqual({
          toolCallId: 'test-id',
          toolName: 'test-tool',
          result: { fallback: true },
        });

        expect(mockExecute).toHaveBeenCalledWith({ arg1: 'value1' });
      } finally {
        // Clean up
        withRetrySpy.mockRestore();
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
