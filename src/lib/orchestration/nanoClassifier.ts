import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry';
import { withNanoFallback } from './fallback';
import { extractTokenUsage, logUsageAndUpdateCost } from '../billing/tokenUsage';

/**
 * Configuration for the GPT-4.1-nano classifier
 */
export interface NanoClassifierConfig {
  /** The API key */
  apiKey: string;
  /** The model to use */
  model: string;
  /** The temperature to use (lower for more deterministic results) */
  temperature?: number;
  /** The maximum number of tokens to generate */
  maxTokens?: number;
  /** The API endpoint */
  endpoint?: string;
}

/**
 * Result of a classification operation
 */
export interface ClassificationResult<T extends string> {
  /** The classification label */
  label: T;
  /** The confidence score (if available) */
  confidence?: number;
  /** Token usage information */
  usage: {
    /** Number of prompt tokens used */
    promptTokens: number;
    /** Number of completion tokens used */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
  };
  /** The raw response from the API */
  rawResponse?: any;
}

/**
 * Default GPT-4.1-nano configuration
 */
const DEFAULT_NANO_CONFIG: NanoClassifierConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4.1-nano', // Use the GPT-4.1-nano model
  temperature: 0.3, // Lower temperature for more deterministic classification
  maxTokens: 50, // Classification typically needs few tokens
  endpoint: 'https://api.openai.com/v1/chat/completions',
};

/**
 * Internal implementation of text classification using GPT-4.1-nano
 * @param text The text to classify
 * @param labels The possible classification labels
 * @param prompt The classification prompt (optional)
 * @param config The classifier configuration
 * @returns The classification result
 */
async function classifyTextInternal<T extends string>(
  text: string,
  labels: T[],
  prompt?: string,
  config: Partial<NanoClassifierConfig> = {}
): Promise<ClassificationResult<T>> {
  // Merge the provided config with the default config
  const mergedConfig: NanoClassifierConfig = {
    ...DEFAULT_NANO_CONFIG,
    ...config,
  };

  // Create a default prompt if none is provided
  const classificationPrompt = prompt ||
    `Classify the following text into one of these categories: ${labels.join(', ')}. ` +
    'Respond with ONLY the category name, nothing else.';

  // Create the messages for the API
  const messages = [
    {
      role: 'system',
      content: classificationPrompt,
    },
    {
      role: 'user',
      content: text,
    },
  ];

  // Call the API with retry logic
  const response = await withRetry(
    () => callNanoAPI(messages, mergedConfig),
    DEFAULT_RETRY_OPTIONS
  );

  // Extract the classification label from the response
  const content = response.choices[0].message.content.trim();

  // Find the matching label (case-insensitive)
  const matchedLabel = labels.find(
    (label) => label.toLowerCase() === content.toLowerCase()
  );

  if (!matchedLabel) {
    throw new Error(`Classification failed: response "${content}" did not match any of the provided labels: ${labels.join(', ')}`);
  }

  // Extract token usage
  const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return {
    label: matchedLabel,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    rawResponse: response,
  };
}

/**
 * Classifies text using GPT-4.1-nano with fallback to GPT-4.1
 * @param text The text to classify
 * @param labels The possible classification labels
 * @param prompt The classification prompt (optional)
 * @param config The classifier configuration
 * @param userId Optional user ID for token usage logging
 * @returns The classification result
 */
export async function classifyText<T extends string>(
  text: string,
  labels: T[],
  prompt?: string,
  config: Partial<NanoClassifierConfig> = {},
  userId?: string
): Promise<ClassificationResult<T>> {
  // Use the nano fallback wrapper
  const result = await withNanoFallback(
    classifyTextInternal,
    text,
    labels,
    prompt,
    config,
    {
      logError: (error) => console.error('Nano classification failed:', error),
      context: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        labels,
      },
    }
  );

  // Log token usage if userId is provided
  if (userId && result.usage) {
    const mergedConfig = { ...DEFAULT_NANO_CONFIG, ...config };
    // Log usage asynchronously - don't await to avoid blocking
    logUsageAndUpdateCost(userId, mergedConfig.model, result.usage)
      .catch(err => console.error('Failed to log nano classifier token usage:', err));
  }

  return result;
}

/**
 * Call the GPT-4.1-nano API
 * @param messages The messages to send
 * @param config The API configuration
 * @returns The API response
 */
async function callNanoAPI(
  messages: { role: string; content: string }[],
  config: NanoClassifierConfig
): Promise<any> {
  const response = await fetch(config.endpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4.1-nano API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Internal implementation of function calling version of the classifier
 * @param text The text to classify
 * @param options The classification options
 * @param config The classifier configuration
 * @returns The classification result
 */
async function classifyWithFunctionCallingInternal<T extends string>(
  text: string,
  options: {
    /** The function name to use */
    functionName: string;
    /** The parameter name for the classification */
    parameterName: string;
    /** The possible classification labels */
    labels: T[];
    /** Description of the classification task */
    description?: string;
  },
  config: Partial<NanoClassifierConfig> = {}
): Promise<ClassificationResult<T>> {
  // Merge the provided config with the default config
  const mergedConfig: NanoClassifierConfig = {
    ...DEFAULT_NANO_CONFIG,
    ...config,
  };

  // Create the function definition
  const functionDefinition = {
    name: options.functionName,
    description: options.description || `Classify text into one of these categories: ${options.labels.join(', ')}`,
    parameters: {
      type: 'object',
      properties: {
        [options.parameterName]: {
          type: 'string',
          enum: options.labels,
          description: 'The classification label',
        },
      },
      required: [options.parameterName],
    },
  };

  // Create the messages for the API
  const messages = [
    {
      role: 'user',
      content: text,
    },
  ];

  // Call the API with retry logic
  const response = await withRetry(
    () => callNanoAPIWithFunctions(messages, [functionDefinition], mergedConfig),
    DEFAULT_RETRY_OPTIONS
  );

  // Extract the function call from the response
  const functionCall = response.choices[0].message.function_call;

  if (!functionCall || functionCall.name !== options.functionName) {
    throw new Error('Classification failed: expected function call not found in response');
  }

  // Parse the function arguments
  const args = JSON.parse(functionCall.arguments);
  const label = args[options.parameterName];

  if (!options.labels.includes(label)) {
    throw new Error(`Classification failed: response "${label}" did not match any of the provided labels: ${options.labels.join(', ')}`);
  }

  // Extract token usage
  const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return {
    label: label as T,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    },
    rawResponse: response,
  };
}

/**
 * Function calling version of the classifier with fallback to GPT-4.1
 * @param text The text to classify
 * @param options The classification options
 * @param config The classifier configuration
 * @param userId Optional user ID for token usage logging
 * @returns The classification result
 */
export async function classifyWithFunctionCalling<T extends string>(
  text: string,
  options: {
    /** The function name to use */
    functionName: string;
    /** The parameter name for the classification */
    parameterName: string;
    /** The possible classification labels */
    labels: T[];
    /** Description of the classification task */
    description?: string;
  },
  config: Partial<NanoClassifierConfig> = {},
  userId?: string
): Promise<ClassificationResult<T>> {
  // Create a simple prompt for the fallback
  const prompt = options.description ||
    `Classify text into one of these categories: ${options.labels.join(', ')}`;

  // Use the nano fallback wrapper
  const result = await withNanoFallback(
    // We need to adapt the function signature to match what withNanoFallback expects
    (text: string, labels: T[], prompt?: string, config?: Partial<NanoClassifierConfig>) =>
      classifyWithFunctionCallingInternal(text, options, config),
    text,
    options.labels,
    prompt,
    config,
    {
      logError: (error) => console.error('Nano function calling classification failed:', error),
      context: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        functionName: options.functionName,
        labels: options.labels,
      },
    }
  );

  // Log token usage if userId is provided
  if (userId && result.usage) {
    const mergedConfig = { ...DEFAULT_NANO_CONFIG, ...config };
    // Log usage asynchronously - don't await to avoid blocking
    logUsageAndUpdateCost(userId, mergedConfig.model, result.usage)
      .catch(err => console.error('Failed to log nano function calling token usage:', err));
  }

  return result;
}

/**
 * Call the GPT-4.1-nano API with function calling
 * @param messages The messages to send
 * @param functions The functions to include
 * @param config The API configuration
 * @returns The API response
 */
async function callNanoAPIWithFunctions(
  messages: { role: string; content: string }[],
  functions: any[],
  config: NanoClassifierConfig
): Promise<any> {
  const response = await fetch(config.endpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      functions: functions,
      function_call: { name: functions[0].name }, // Force the model to call the function
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT-4.1-nano API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}