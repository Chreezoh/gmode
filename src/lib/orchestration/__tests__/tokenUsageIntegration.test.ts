import { orchestrate } from '../orchestrator';
import { OrchestrationRequest } from '../types';
import { logUsageAndUpdateCost } from '../../billing/tokenUsage';

// Mock the token usage logging function
jest.mock('../../billing/tokenUsage', () => ({
  extractTokenUsage: jest.fn().mockReturnValue({
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
  }),
  logUsageAndUpdateCost: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Token Usage Integration with Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log token usage after API call', async () => {
    // Mock successful API response with no tool calls
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    });

    const request: OrchestrationRequest = {
      instruction: 'Test instruction',
      context: {
        userId: 'test-user',
      },
      tools: [],
    };

    await orchestrate(request);

    // Check that token usage was logged
    expect(logUsageAndUpdateCost).toHaveBeenCalledWith(
      'test-user',
      expect.any(String), // model
      {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      }
    );
  });

  it('should not log token usage if usage data is missing', async () => {
    // Mock successful API response with no usage data
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
          },
        ],
        // No usage field
      }),
    });

    const request: OrchestrationRequest = {
      instruction: 'Test instruction',
      context: {
        userId: 'test-user',
      },
      tools: [],
    };

    await orchestrate(request);

    // Check that token usage was not logged
    expect(logUsageAndUpdateCost).not.toHaveBeenCalled();
  });

  it('should handle errors in token usage logging without affecting the main flow', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    });

    // Mock token usage logging to throw an error
    (logUsageAndUpdateCost as jest.Mock).mockRejectedValueOnce(new Error('Logging error'));

    const request: OrchestrationRequest = {
      instruction: 'Test instruction',
      context: {
        userId: 'test-user',
      },
      tools: [],
    };

    // This should complete successfully despite the logging error
    const result = await orchestrate(request);

    // Check that the orchestration completed successfully
    expect(result.response).toBe('This is a test response');
    
    // Check that token usage logging was attempted
    expect(logUsageAndUpdateCost).toHaveBeenCalled();
  });
});
