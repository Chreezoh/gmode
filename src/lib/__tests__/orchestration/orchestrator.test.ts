import { orchestrate } from '../../orchestration/orchestrator';
import { Tool, OrchestrationRequest } from '../../orchestration/types';
import { withRetry } from '../../orchestration/retry';

// Mock fetch
global.fetch = jest.fn();

// Mock tools for testing
const mockTools: Tool[] = [
  {
    name: 'test_tool',
    description: 'A test tool',
    parameters: {
      param1: {
        type: 'string',
        description: 'A test parameter',
      },
    },
    execute: jest.fn().mockResolvedValue({ success: true }),
  },
  {
    name: 'failing_tool',
    description: 'A tool that fails',
    parameters: {
      param1: {
        type: 'string',
        description: 'A test parameter',
      },
    },
    execute: jest.fn().mockRejectedValue(new Error('Tool execution failed')),
  },
];

// Mock withRetry
jest.mock('../../orchestration/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  DEFAULT_RETRY_OPTIONS: {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 10000,
  },
}));

describe('Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('should call the GPT-4.1 API with the correct parameters', async () => {
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
      }),
    });

    const request: OrchestrationRequest = {
      instruction: 'Test instruction',
      context: {
        userId: 'test-user',
      },
      tools: mockTools,
    };

    await orchestrate(request);

    // Check that fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];

    expect(url).toContain('api.openai.com');
    expect(JSON.parse(options.body)).toMatchObject({
      model: expect.any(String),
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
        }),
        expect.objectContaining({
          role: 'user',
          content: 'Test instruction',
        }),
      ]),
      tools: expect.arrayContaining([
        expect.objectContaining({
          type: 'function',
          function: expect.objectContaining({
            name: 'test_tool',
          }),
        }),
      ]),
    });
  });

  it('should execute tool calls from the API response', async () => {
    // Mock successful API response with tool calls
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I will help you with that',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'test_tool',
                    arguments: JSON.stringify({ param1: 'test value' }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    // Mock second API call with no tool calls
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Task completed successfully',
            },
          },
        ],
      }),
    });

    const request: OrchestrationRequest = {
      instruction: 'Test instruction with tool call',
      context: {
        userId: 'test-user',
      },
      tools: mockTools,
    };

    const result = await orchestrate(request);

    // Check that the tool was executed
    expect(mockTools[0].execute).toHaveBeenCalledTimes(1);
    expect(mockTools[0].execute).toHaveBeenCalledWith({ param1: 'test value' });

    // Check that fetch was called twice (initial request + follow-up after tool call)
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Check the result
    expect(result).toMatchObject({
      response: 'Task completed successfully',
      toolCalls: [
        expect.objectContaining({
          toolCallId: 'call_123',
          toolName: 'test_tool',
          result: { success: true },
        }),
      ],
    });
  });

  it('should handle tool execution failures with retry', async () => {
    // Mock successful API response with failing tool call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I will help you with that',
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'failing_tool',
                    arguments: JSON.stringify({ param1: 'test value' }),
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    // Mock second API call with no tool calls
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'There was an error with the tool',
            },
          },
        ],
      }),
    });

    const request: OrchestrationRequest = {
      instruction: 'Test instruction with failing tool',
      context: {
        userId: 'test-user',
      },
      tools: mockTools,
      maxRetries: 2,
    };

    const result = await orchestrate(request);

    // Check that withRetry was called at least once
    expect(withRetry).toHaveBeenCalled();

    // Check that the failing tool was executed
    expect(mockTools[1].execute).toHaveBeenCalledTimes(1);

    // Check the result includes the expected properties
    expect(result).toMatchObject({
      response: 'There was an error with the tool',
      toolCalls: [
        expect.objectContaining({
          toolCallId: 'call_456',
          toolName: 'failing_tool',
        }),
      ],
    });
  });
});
