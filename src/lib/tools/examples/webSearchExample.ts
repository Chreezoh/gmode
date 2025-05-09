/**
 * Web Search Tool Example
 *
 * This file demonstrates how to use the web search tool with different search providers:
 * - Bing Web Search API
 * - Google Custom Search API (planned)
 */

import { createWebSearchTool, SearchProvider } from '../webSearchTool';
import { registerTool } from '../registry';
import { saveToolConfig, getToolConfig } from '../../toolConfigs';

/**
 * Example of how to register and use the web search tool with Bing
 * @param userId The user ID to associate with the tool configuration
 * @param apiKey The Bing Web Search API key
 */
export async function webSearchToolExample(userId: string, apiKey: string) {
  try {
    // First, save the API key in the tool_configs table
    const saveResult = await saveToolConfig({
      user_id: userId,
      tool_name: 'web_search',
      config_json: {
        provider: SearchProvider.BING,
        api_key: apiKey,
        default_result_count: 5,
        enable_caching: true,
        cache_ttl_ms: 300000, // 5 minutes
        rate_limit: {
          max_requests: 10,
          window_ms: 60000, // 1 minute
        },
      },
    });

    if (saveResult.error) {
      console.error('Failed to save web search tool configuration:', saveResult.error);
      return;
    }

    console.log('Web search tool configuration saved successfully');

    // Retrieve the saved configuration
    const { data: userConfig } = await getToolConfig(userId, 'web_search');

    if (!userConfig) {
      console.error('Failed to retrieve web search tool configuration');
      return;
    }

    // Create the web search tool with the saved configuration
    const webSearchTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: userConfig.config_json.api_key,
      defaultResultCount: userConfig.config_json.default_result_count,
      enableCaching: userConfig.config_json.enable_caching,
      cacheTtlMs: userConfig.config_json.cache_ttl_ms,
      rateLimit: userConfig.config_json.rate_limit,
    });

    // Register the tool
    registerTool(webSearchTool);
    console.log('Web search tool registered successfully');

    // Example usage of the tool
    console.log('Searching for "TypeScript best practices"...');
    const results = await webSearchTool.execute({
      query: 'TypeScript best practices',
      count: 3,
    });

    console.log('Search results:');
    console.log(JSON.stringify(results, null, 2));

    // Example with different parameters
    console.log('Searching for "latest AI news" with freshness filter...');
    const newsResults = await webSearchTool.execute({
      query: 'latest AI news',
      count: 3,
      freshness: 'Week',
    });

    console.log('News search results:');
    console.log(JSON.stringify(newsResults, null, 2));

  } catch (error) {
    console.error('Error in web search tool example:', error);
  }
}

/**
 * Example of how to register and use the web search tool with Google
 * @param userId The user ID to associate with the tool configuration
 * @param apiKey The Google API key
 * @param searchEngineId The Google Custom Search Engine ID
 */
export async function googleSearchToolExample(userId: string, apiKey: string, searchEngineId: string) {
  try {
    // First, save the API key in the tool_configs table
    const saveResult = await saveToolConfig({
      user_id: userId,
      tool_name: 'google_search',
      config_json: {
        provider: SearchProvider.GOOGLE,
        api_key: apiKey,
        search_engine_id: searchEngineId,
        default_result_count: 5,
        enable_caching: true,
        cache_ttl_ms: 300000, // 5 minutes
        rate_limit: {
          max_requests: 10,
          window_ms: 60000, // 1 minute
        },
      },
    });

    if (saveResult.error) {
      console.error('Failed to save Google search tool configuration:', saveResult.error);
      return;
    }

    console.log('Google search tool configuration saved successfully');

    // Retrieve the saved configuration
    const { data: userConfig } = await getToolConfig(userId, 'google_search');

    if (!userConfig) {
      console.error('Failed to retrieve Google search tool configuration');
      return;
    }

    // Create the web search tool with the saved configuration
    const googleSearchTool = createWebSearchTool({
      provider: SearchProvider.GOOGLE,
      apiKey: userConfig.config_json.api_key,
      searchEngineId: userConfig.config_json.search_engine_id,
      defaultResultCount: userConfig.config_json.default_result_count,
      enableCaching: userConfig.config_json.enable_caching,
      cacheTtlMs: userConfig.config_json.cache_ttl_ms,
      rateLimit: userConfig.config_json.rate_limit,
    });

    // Register the tool
    registerTool(googleSearchTool);
    console.log('Google search tool registered successfully');

    // Execute a search with Google
    console.log('Searching for "TypeScript best practices" with Google...');
    const results = await googleSearchTool.execute({
      query: 'TypeScript best practices',
      count: 3,
    });

    console.log('Search results:');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error in Google search example:', error);
  }
}

/**
 * Example of how to create and use the web search tool with a factory
 */
export function registerWebSearchToolFactory() {
  const { registerToolFactory, createToolForUser } = require('../factory');

  // Register a factory for the web search tool
  registerToolFactory('web_search', (config) => {
    return createWebSearchTool({
      provider: config.provider || SearchProvider.BING,
      apiKey: config.apiKey,
      searchEngineId: config.searchEngineId,
      defaultResultCount: config.defaultResultCount || 5,
      enableCaching: config.enableCaching !== false,
      cacheTtlMs: config.cacheTtlMs || 300000,
      rateLimit: config.rateLimit || {
        maxRequests: 10,
        windowMs: 60000,
      },
    });
  }, {
    // Default configuration (API key must be provided)
    provider: SearchProvider.BING,
    defaultResultCount: 5,
    enableCaching: true,
    cacheTtlMs: 300000,
    rateLimit: {
      maxRequests: 10,
      windowMs: 60000,
    },
  });

  console.log('Web search tool factory registered');
}

/**
 * Example of how to create a web search tool for a specific user
 * @param userId The user ID to create the tool for
 */
export async function createWebSearchToolForUser(userId: string) {
  const { createToolForUser } = require('../factory');

  try {
    // Create a tool for the user with their specific configuration
    const webSearchTool = await createToolForUser(userId, 'web_search');

    if (!webSearchTool) {
      console.error('Failed to create web search tool for user');
      return;
    }

    console.log('Created web search tool for user:', userId);

    // Example usage
    const results = await webSearchTool.execute({
      query: 'JavaScript frameworks 2023',
      count: 5,
    });

    console.log('Search results:');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error creating web search tool for user:', error);
  }
}
