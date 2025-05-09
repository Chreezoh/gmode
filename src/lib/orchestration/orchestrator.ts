import {
  OrchestrationRequest,
  OrchestrationResult,
  Message,
  Tool,
  ToolCall,
  ToolCallResult,
  GPT41Config,
} from './types';
import {
  formatToolsForAPI,
  createSystemMessage,
  formatMessagesForAPI,
  parseToolCalls,
  findToolByName,
  createToolResultMessage,
} from './utils';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry';
import { withFallback, withToolFallback } from './fallback';
import { extractTokenUsage, logUsageAndUpdateCost } from '../billing/tokenUsage';

/**
 * Default GPT-4.1 configuration
 */
const DEFAULT_GPT41_CONFIG: GPT41Config = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-1106-preview', // Use the appropriate model ID for GPT-4.1
  temperature: 0.7,
  maxTokens: 4000,
  endpoint: 'https://api.openai.com/v1/chat/completions',
};

/**
 * Send a request to the GPT-4.1 API
 * @param messages The messages to send
 * @param tools The tools to include
 * @param config The GPT-4.1 configuration
 * @returns The API response
 */
export async function callGPT41API(
  messages: Message[],
  tools: Tool[],
  config: GPT41Config = DEFAULT_GPT41_CONFIG
): Promise<any> {
  const formattedMessages = formatMessagesForAPI(messages);
  const formattedTools = formatToolsForAPI(tools);

  // Define the primary API call function
  const makeApiCall = async () => {
    const response = await fetch(config.endpoint || DEFAULT_GPT41_CONFIG.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: formattedMessages,
        tools: formattedTools,
        temperature: config.temperature ?? DEFAULT_GPT41_CONFIG.temperature,
        max_tokens: config.maxTokens ?? DEFAULT_GPT41_CONFIG.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-4.1 API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  };

  // Use the fallback wrapper with retry
  const response = await withFallback(
    () => withRetry(makeApiCall, DEFAULT_RETRY_OPTIONS),
    {
      logError: (error) => console.error('GPT-4.1 API call failed:', error),
      fallbackValue: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your instruction.',
            },
          },
        ],
      },
      context: {
        type: 'gpt-4.1-api-call',
        messageCount: messages.length,
        toolCount: tools.length,
      },
    }
  );

  return response;
}

/**
 * Execute a tool call
 * @param toolCall The tool call to execute
 * @param tools The available tools
 * @param maxRetries The maximum number of retries
 * @returns The result of the tool call
 */
async function executeToolCall(
  toolCall: ToolCall,
  tools: Tool[],
  maxRetries: number = DEFAULT_RETRY_OPTIONS.maxRetries
): Promise<ToolCallResult> {
  // Use the tool fallback wrapper
  return withToolFallback(toolCall, tools, {
    // Default result to return if the tool call fails
    defaultResult: {
      message: 'The operation could not be completed. Please try again or use a different approach.',
    },
    // Log errors
    logError: (error) => console.error(`Tool call '${toolCall.name}' failed:`, error),
    // Context information for logging
    context: {
      toolName: toolCall.name,
      arguments: toolCall.arguments,
    },
  });
}

/**
 * Process a response from GPT-4.1
 * @param response The API response
 * @param tools The available tools
 * @param maxRetries The maximum number of retries
 * @returns The processed response and any tool results
 */
async function processGPT41Response(
  response: any,
  tools: Tool[],
  maxRetries: number = DEFAULT_RETRY_OPTIONS.maxRetries
): Promise<{ message: Message; toolResults: ToolCallResult[] }> {
  const assistantMessage = response.choices[0].message;

  // Parse the message
  const message: Message = {
    role: 'assistant',
    content: assistantMessage.content || '',
  };

  // If there are tool calls, parse and execute them
  const toolResults: ToolCallResult[] = [];

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    message.toolCalls = parseToolCalls(assistantMessage.tool_calls);

    // Execute each tool call
    const toolCallPromises = message.toolCalls.map((toolCall) =>
      executeToolCall(toolCall, tools, maxRetries)
    );

    const results = await Promise.all(toolCallPromises);
    toolResults.push(...results);
  }

  return { message, toolResults };
}

/**
 * Orchestrate a user instruction into a sequence of tool calls
 * @param request The orchestration request
 * @returns The orchestration result
 */
export async function orchestrate(
  request: OrchestrationRequest,
  config: GPT41Config = DEFAULT_GPT41_CONFIG
): Promise<OrchestrationResult> {
  const { instruction, context, tools, maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries } = request;
  const { userId, memory = [], additionalContext } = context;

  // Define the primary orchestration function
  const runOrchestration = async (): Promise<OrchestrationResult> => {
    // Initialize the conversation
    const messages: Message[] = [
      {
        role: 'system',
        content: createSystemMessage(tools, additionalContext),
      },
      ...memory,
      {
        role: 'user',
        content: instruction,
      },
    ];

    // Track all tool calls and errors
    const allToolResults: ToolCallResult[] = [];
    const errors: Error[] = [];

    // Continue the conversation until no more tool calls are needed
    let finalResponse = '';
    let continueConversation = true;

    while (continueConversation) {
      try {
        // Call the GPT-4.1 API
        const apiResponse = await callGPT41API(messages, tools, config);

        // Log token usage if available
        if (apiResponse.usage) {
          const tokenUsage = extractTokenUsage(apiResponse);
          // Log usage asynchronously - don't await to avoid blocking
          logUsageAndUpdateCost(userId, config.model, tokenUsage)
            .catch(err => console.error('Failed to log token usage:', err));
        }

        // Process the response
        const { message, toolResults } = await processGPT41Response(
          apiResponse,
          tools,
          maxRetries
        );

        // Add the assistant message to the conversation
        messages.push(message);

        // Track tool results and errors
        allToolResults.push(...toolResults);
        toolResults
          .filter((result) => result.error)
          .forEach((result) => {
            if (result.error) errors.push(result.error);
          });

        // If there were tool calls, add the tool results to the conversation
        if (toolResults.length > 0) {
          const toolResultMessages = toolResults.map(createToolResultMessage);
          messages.push(...toolResultMessages);
        } else {
          // No tool calls, so we're done
          continueConversation = false;
          finalResponse = message.content;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        console.error('Orchestration error:', err);

        // Add an error message to the conversation
        messages.push({
          role: 'system',
          content: `Error: ${err.message}. Please try a different approach or provide guidance to the user.`,
        });

        // One more attempt after an error, then we'll stop
        if (continueConversation) {
          continueConversation = false;
        } else {
          finalResponse = 'I encountered an error while processing your request. Please try again or rephrase your instruction.';
          break;
        }
      }
    }

    return {
      response: finalResponse,
      toolCalls: allToolResults,
      errors: errors.length > 0 ? errors : undefined,
    };
  };

  // Use the fallback wrapper for the entire orchestration process
  return withFallback(
    runOrchestration,
    {
      logError: (error) => console.error('Orchestration failed:', error),
      fallbackValue: {
        response: 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your instruction.',
        toolCalls: [],
        errors: [new Error('Orchestration failed with fallback response')],
      },
      context: {
        type: 'orchestration',
        userId,
        instruction: instruction.substring(0, 100) + (instruction.length > 100 ? '...' : ''),
      },
    }
  );
}
