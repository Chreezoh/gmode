/**
 * Error Handling Example
 * 
 * This file demonstrates how to use the error handling utilities
 * with tools to provide robust error handling and retry logic.
 */

import { Tool } from '../../orchestration/types';
import { ExtendedTool, ToolCategory } from '../types';
import { createBasicTool, createExtendedTool } from '../factory';
import { withToolErrorHandling, createToolExecuteWithErrorHandling } from '../errorHandling';

/**
 * Example 1: Using withToolErrorHandling directly in a tool's execute method
 */
export function createReliableWeatherTool(apiKey: string): Tool {
  return createBasicTool(
    'reliable_weather',
    'Get weather information with built-in error handling and retry logic',
    async (args: { location: string; units?: 'metric' | 'imperial' }) => {
      return withToolErrorHandling(
        async () => {
          // Original implementation that might fail
          const response = await fetch(
            `https://api.weather.example.com/current?` +
            `location=${encodeURIComponent(args.location)}&` +
            `units=${args.units || 'metric'}&` +
            `apiKey=${apiKey}`
          );
          
          if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
          }
          
          return await response.json();
        },
        {
          // Retry configuration
          maxRetries: 2,
          retryDelayMs: 1000,
          useExponentialBackoff: true,
          
          // Fallback value if all retries fail
          defaultValue: {
            location: args.location,
            temperature: null,
            conditions: 'Unknown',
            error: 'Weather data temporarily unavailable',
          },
          
          // Context for error logging
          context: {
            toolName: 'reliable_weather',
            location: args.location,
            units: args.units,
          },
        }
      );
    },
    {
      location: {
        type: 'string',
        description: 'The location to get weather for',
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'The units to use (metric or imperial)',
        optional: true,
      },
    }
  );
}

/**
 * Example 2: Using createToolExecuteWithErrorHandling to wrap an execute function
 */
export function createReliableCalculatorTool(): ExtendedTool {
  // Define the original execute function
  const originalExecute = async (args: { 
    operation: string; 
    a: number; 
    b: number;
  }) => {
    // Simulate potential failures
    const randomValue = Math.random();
    if (randomValue < 0.3) {
      throw new Error('Calculation service temporarily unavailable');
    }
    
    // Perform the calculation
    let result: number;
    
    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        if (args.b === 0) {
          throw new Error('Division by zero is not allowed');
        }
        result = args.a / args.b;
        break;
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
    
    return {
      operation: args.operation,
      a: args.a,
      b: args.b,
      result,
    };
  };
  
  // Wrap the execute function with error handling
  const executeWithErrorHandling = createToolExecuteWithErrorHandling(
    originalExecute,
    {
      maxRetries: 2,
      retryDelayMs: 500,
      defaultValue: {
        error: 'Calculation failed after multiple attempts',
        result: null,
      },
      logError: (error, context) => {
        console.error(`Calculator tool error:`, error.message, context);
      },
    }
  );
  
  // Create and return the tool with the wrapped execute function
  return createExtendedTool(
    'reliable_calculator',
    'Perform calculations with built-in error handling and retry logic',
    ToolCategory.UTILITY,
    executeWithErrorHandling,
    {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The operation to perform',
      },
      a: {
        type: 'number',
        description: 'The first operand',
      },
      b: {
        type: 'number',
        description: 'The second operand',
      },
    },
    {
      version: '1.0.0',
      metadata: {
        reliability: 'high',
      },
    }
  );
}

/**
 * Example of using the reliable tools
 */
export async function demonstrateReliableTools(): Promise<void> {
  try {
    // Create the reliable tools
    const weatherTool = createReliableWeatherTool('dummy-api-key');
    const calculatorTool = createReliableCalculatorTool();
    
    // Use the weather tool
    console.log('Calling weather tool...');
    const weatherResult = await weatherTool.execute({
      location: 'New York',
      units: 'metric',
    });
    console.log('Weather result:', weatherResult);
    
    // Use the calculator tool
    console.log('Calling calculator tool...');
    const calculationResult = await calculatorTool.execute({
      operation: 'add',
      a: 5,
      b: 3,
    });
    console.log('Calculation result:', calculationResult);
    
  } catch (error) {
    console.error('Error in demonstration:', error);
  }
}
