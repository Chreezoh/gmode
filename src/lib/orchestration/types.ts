/**
 * Types for the orchestration engine
 */

/**
 * Represents a tool that can be called by the orchestrator
 */
export interface Tool {
  /** Unique name of the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON schema for the tool's parameters */
  parameters: Record<string, any>;
  /** Function to execute the tool */
  execute: (args: Record<string, any>) => Promise<any>;
}

/**
 * Represents a tool call from GPT-4.1
 */
export interface ToolCall {
  /** Unique ID for the tool call */
  id: string;
  /** The name of the tool to call */
  name: string;
  /** The arguments to pass to the tool */
  arguments: Record<string, any>;
}

/**
 * Represents the result of a tool call
 */
export interface ToolCallResult {
  /** The ID of the tool call this is a result for */
  toolCallId: string;
  /** The name of the tool that was called */
  toolName: string;
  /** The result of the tool call */
  result: any;
  /** Any error that occurred during the tool call */
  error?: Error;
}

/**
 * Represents a message in a conversation
 */
export interface Message {
  /** The role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** The content of the message */
  content: string;
  /** The name of the tool (only for tool messages) */
  name?: string;
  /** The ID of the tool call this message is responding to (only for tool messages) */
  toolCallId?: string;
  /** Any tool calls included in this message (only for assistant messages) */
  toolCalls?: ToolCall[];
}

/**
 * Represents the context for an orchestration request
 */
export interface OrchestrationContext {
  /** The user ID for the current session */
  userId: string;
  /** Any memory/history to include */
  memory?: Message[];
  /** Any additional context to include */
  additionalContext?: string;
}

/**
 * Represents a request to the orchestrator
 */
export interface OrchestrationRequest {
  /** The user's instruction */
  instruction: string;
  /** The context for the request */
  context: OrchestrationContext;
  /** The available tools */
  tools: Tool[];
  /** The maximum number of retries for failed tool calls */
  maxRetries?: number;
}

/**
 * Represents the result of an orchestration
 */
export interface OrchestrationResult {
  /** The final response to the user */
  response: string;
  /** The tool calls that were made */
  toolCalls: ToolCallResult[];
  /** Any errors that occurred */
  errors?: Error[];
}

/**
 * Configuration for the GPT-4.1 API
 */
export interface GPT41Config {
  /** The API key */
  apiKey: string;
  /** The model to use */
  model: string;
  /** The temperature to use */
  temperature?: number;
  /** The maximum number of tokens to generate */
  maxTokens?: number;
  /** The API endpoint */
  endpoint?: string;
}

/**
 * Options for retrying failed tool calls
 */
export interface RetryOptions {
  /** The maximum number of retries */
  maxRetries: number;
  /** The initial delay in milliseconds */
  initialDelayMs: number;
  /** The factor to multiply the delay by after each retry */
  backoffFactor: number;
  /** The maximum delay in milliseconds */
  maxDelayMs: number;
}
