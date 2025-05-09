import { classifyText, classifyWithFunctionCalling } from '../nanoClassifier';

// Mock the global fetch function
global.fetch = jest.fn();

describe('nanoClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyText', () => {
    it('should classify text correctly', async () => {
      // Mock the API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Positive',
              },
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 1,
            total_tokens: 21,
          },
        }),
      });

      // Call the classifier
      const result = await classifyText(
        'I love this product!',
        ['Positive', 'Negative', 'Neutral'],
        'Classify the sentiment of this text.',
        { apiKey: 'test-key' }
      );

      // Check the result
      expect(result.label).toBe('Positive');
      expect(result.usage.promptTokens).toBe(20);
      expect(result.usage.completionTokens).toBe(1);
      expect(result.usage.totalTokens).toBe(21);

      // Check the API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(JSON.parse(options.body as string)).toMatchObject({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: 'Classify the sentiment of this text.',
          },
          {
            role: 'user',
            content: 'I love this product!',
          },
        ],
      });
    });

    it('should throw an error if the response does not match any label', async () => {
      // Mock the API response with a non-matching label
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Unknown',
              },
            },
          ],
        }),
      });

      // Mock the fallback function to avoid dynamic imports
      jest.mock('../fallback', () => ({
        withNanoFallback: jest.fn().mockImplementation(async (fn, ...args) => {
          return fn(...args);
        }),
      }));

      // Call the classifier and expect it to throw
      await expect(
        classifyText(
          'I love this product!',
          ['Positive', 'Negative', 'Neutral'],
          'Classify the sentiment of this text.',
          { apiKey: 'test-key' }
        )
      ).rejects.toThrow('Classification failed: response "Unknown" did not match any of the provided labels');
    }, 10000);

    // Increase timeout for this test
    it('should handle API errors', async () => {
      // Mock the retry function to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
        cb();
        return {} as any;
      });

      // Mock an API error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Call the classifier and expect it to throw after retries
      await expect(
        classifyText(
          'I love this product!',
          ['Positive', 'Negative', 'Neutral'],
          'Classify the sentiment of this text.',
          { apiKey: 'test-key' }
        )
      ).rejects.toThrow('Network error');

      // Restore setTimeout
      (global.setTimeout as jest.Mock).mockRestore();
    }, 10000);
  });

  describe('classifyWithFunctionCalling', () => {
    it('should classify text using function calling', async () => {
      // Mock the API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                function_call: {
                  name: 'classifySentiment',
                  arguments: '{"sentiment":"Positive"}',
                },
              },
            },
          ],
          usage: {
            prompt_tokens: 25,
            completion_tokens: 10,
            total_tokens: 35,
          },
        }),
      });

      // Call the classifier
      const result = await classifyWithFunctionCalling(
        'I love this product!',
        {
          functionName: 'classifySentiment',
          parameterName: 'sentiment',
          labels: ['Positive', 'Negative', 'Neutral'],
          description: 'Classify the sentiment of this text.',
        },
        { apiKey: 'test-key' }
      );

      // Check the result
      expect(result.label).toBe('Positive');
      expect(result.usage.promptTokens).toBe(25);
      expect(result.usage.completionTokens).toBe(10);
      expect(result.usage.totalTokens).toBe(35);

      // Check the API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');

      const body = JSON.parse(options.body as string);
      expect(body.model).toBe('gpt-4.1-nano');
      expect(body.messages).toEqual([
        {
          role: 'user',
          content: 'I love this product!',
        },
      ]);
      expect(body.functions[0].name).toBe('classifySentiment');
      expect(body.functions[0].parameters.properties.sentiment.enum).toEqual([
        'Positive', 'Negative', 'Neutral',
      ]);
    });

    it('should throw an error if the function call is missing', async () => {
      // Mock the API response without a function call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Positive',
              },
            },
          ],
        }),
      });

      // Mock the fallback function to avoid dynamic imports
      jest.mock('../fallback', () => ({
        withNanoFallback: jest.fn().mockImplementation(async (fn, ...args) => {
          return fn(...args);
        }),
      }));

      // Call the classifier and expect it to throw
      await expect(
        classifyWithFunctionCalling(
          'I love this product!',
          {
            functionName: 'classifySentiment',
            parameterName: 'sentiment',
            labels: ['Positive', 'Negative', 'Neutral'],
          },
          { apiKey: 'test-key' }
        )
      ).rejects.toThrow('Classification failed: expected function call not found in response');
    }, 10000);
  });
});