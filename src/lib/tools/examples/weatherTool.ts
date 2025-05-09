/**
 * Weather Tool Example
 * 
 * This is an example implementation of a tool that fetches weather data.
 */

import { ExtendedTool, ToolCategory } from '../types';

/**
 * Weather API configuration
 */
export interface WeatherToolConfig {
  /** API key for the weather service */
  apiKey: string;
  /** Base URL for the weather API */
  baseUrl?: string;
  /** Default units (metric or imperial) */
  defaultUnits?: 'metric' | 'imperial';
}

/**
 * Create a weather tool with the given configuration
 * @param config Configuration for the weather tool
 * @returns A configured weather tool
 */
export function createWeatherTool(config: WeatherToolConfig): ExtendedTool {
  const baseUrl = config.baseUrl || 'https://api.example.com/weather';
  const defaultUnits = config.defaultUnits || 'metric';

  return {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    category: ToolCategory.EXTERNAL_API,
    version: '1.0.0',
    requiresAuth: true,
    parameters: {
      location: {
        type: 'string',
        description: 'The city and state, e.g., San Francisco, CA',
      },
      units: {
        type: 'string',
        enum: ['metric', 'imperial'],
        description: 'The unit system to use',
        optional: true,
        default: defaultUnits,
      },
    },
    execute: async (args: { location: string; units?: 'metric' | 'imperial' }) => {
      try {
        // This is a mock implementation
        console.log(`Getting weather for ${args.location} in ${args.units || defaultUnits} units`);
        
        // In a real implementation, we would make an API call here
        // const response = await fetch(`${baseUrl}?location=${encodeURIComponent(args.location)}&units=${args.units || defaultUnits}&apiKey=${config.apiKey}`);
        // const data = await response.json();
        
        // For demonstration, return mock data
        return {
          location: args.location,
          temperature: args.units === 'imperial' ? 72 : 22,
          units: args.units || defaultUnits,
          condition: 'sunny',
          humidity: 45,
          windSpeed: 10,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error fetching weather data:', error);
        throw new Error(`Failed to get weather data: ${(error as Error).message}`);
      }
    },
    metadata: {
      provider: 'Example Weather API',
      documentation: 'https://example.com/weather-api-docs',
    },
  };
}