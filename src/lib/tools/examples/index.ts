/**
 * Example Tools Module
 *
 * This module exports example tool implementations and demonstrates
 * how to register and use tools with the registry.
 */

import { createWeatherTool } from './weatherTool';
import { createCalculatorTool } from './calculatorTool';
import { registerTool, registerTools, getAllTools, getTool } from '../registry';
import { ExtendedTool } from '../types';
import { webSearchToolExample, registerWebSearchToolFactory } from './webSearchExample';
import {
  createReliableWeatherTool,
  createReliableCalculatorTool,
  demonstrateReliableTools
} from './errorHandlingExample';

/**
 * Register example tools with the registry
 * @param weatherApiKey API key for the weather service
 * @param webSearchApiKey API key for the Bing Web Search API
 */
export function registerExampleTools(weatherApiKey: string, webSearchApiKey?: string): void {
  // Create tool instances
  const weatherTool = createWeatherTool({
    apiKey: weatherApiKey,
    defaultUnits: 'metric',
  });

  const calculatorTool = createCalculatorTool();

  // Register tools individually
  registerTool(weatherTool);

  // Or register multiple tools at once
  registerTools([calculatorTool]);

  // Register web search tool factory if API key is provided
  if (webSearchApiKey) {
    registerWebSearchToolFactory();
    console.log('Registered web search tool factory');
  }

  // Register reliable tools with error handling
  const reliableWeatherTool = createReliableWeatherTool(weatherApiKey);
  const reliableCalculatorTool = createReliableCalculatorTool();

  registerTools([reliableWeatherTool, reliableCalculatorTool]);

  console.log(`Registered ${getAllTools().length} example tools`);
}

/**
 * Export web search tool example functions
 */
export { webSearchToolExample, googleSearchToolExample, registerWebSearchToolFactory };

/**
 * Export error handling example functions
 */
export { createReliableWeatherTool, createReliableCalculatorTool, demonstrateReliableTools };

/**
 * Example of using the tool registry
 */
export async function exampleToolUsage(): Promise<void> {
  try {
    // Get a tool by name
    const calculator = getTool('calculator') as ExtendedTool;

    if (calculator) {
      console.log(`Found tool: ${calculator.name} (${calculator.category})`);

      // Execute the tool
      const result = await calculator.execute({
        operation: 'add',
        a: 5,
        b: 3,
      });

      console.log('Calculator result:', result);
    } else {
      console.log('Calculator tool not found');
    }

    // Get all tools
    const allTools = getAllTools();
    console.log(`All registered tools: ${allTools.map(t => t.name).join(', ')}`);

  } catch (error) {
    console.error('Error in example tool usage:', error);
  }
}