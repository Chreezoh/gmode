import { Tool, Message, ToolCall, ToolCallResult } from './types';

/**
 * Convert tools to the format expected by the OpenAI API
 * @param tools The tools to convert
 * @returns The tools in OpenAI API format
 */
export function formatToolsForAPI(tools: Tool[]): any[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters,
        required: Object.keys(tool.parameters).filter(
          (key) => !tool.parameters[key].optional
        ),
      },
    },
  }));
}

/**
 * Create a system message for the orchestrator
 * @param tools The available tools
 * @param additionalContext Any additional context to include
 * @returns The system message
 */
export function createSystemMessage(tools: Tool[], additionalContext?: string): string {
  const toolDescriptions = tools
    .map((tool) => `${tool.name}: ${tool.description}`)
    .join('\n');

  return `You are an intelligent orchestrator that helps users accomplish tasks by calling appropriate tools.

Available tools:
${toolDescriptions}

${additionalContext ? `Additional context:\n${additionalContext}\n` : ''}

When a user gives you an instruction, analyze it carefully and determine which tools to call and in what order.
Always respond with tool calls when appropriate rather than trying to perform the task yourself.
If you need more information from the user before you can proceed, ask for it.
If a tool call fails, try to recover gracefully or suggest alternatives.
After completing all necessary tool calls, provide a helpful summary of what was done.`;
}

/**
 * Format messages for the OpenAI API
 * @param messages The messages to format
 * @returns The messages in OpenAI API format
 */
export function formatMessagesForAPI(messages: Message[]): any[] {
  return messages.map((message) => {
    const formattedMessage: any = {
      role: message.role,
      content: message.content,
    };

    if (message.role === 'tool') {
      formattedMessage.tool_call_id = message.toolCallId;
      formattedMessage.name = message.name;
    }

    if (message.toolCalls) {
      formattedMessage.tool_calls = message.toolCalls.map((toolCall) => ({
        id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.arguments),
        },
      }));
    }

    return formattedMessage;
  });
}

/**
 * Parse tool calls from the OpenAI API response
 * @param toolCalls The tool calls from the API response
 * @returns The parsed tool calls
 */
export function parseToolCalls(toolCalls: any[]): ToolCall[] {
  return toolCalls.map((toolCall) => ({
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: JSON.parse(toolCall.function.arguments),
  }));
}

/**
 * Find a tool by name
 * @param tools The available tools
 * @param name The name of the tool to find
 * @returns The tool, or undefined if not found
 */
export function findToolByName(tools: Tool[], name: string): Tool | undefined {
  return tools.find((tool) => tool.name === name);
}

/**
 * Create a tool result message
 * @param result The result of the tool call
 * @returns A message representing the tool result
 */
export function createToolResultMessage(result: ToolCallResult): Message {
  return {
    role: 'tool',
    name: result.toolName,
    toolCallId: result.toolCallId,
    content: result.error
      ? `Error: ${result.error.message}`
      : JSON.stringify(result.result),
  };
}
