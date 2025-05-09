/**
 * Web Search Example
 *
 * This example demonstrates how to use the web search tool with different search providers:
 * - Bing Web Search API (default)
 * - Google Custom Search API (planned)
 *
 * It shows how to:
 * 1. Save the API key in the tool_configs table
 * 2. Create and register the web search tool
 * 3. Execute web searches with different parameters
 */

import { createWebSearchTool, SearchProvider } from '../lib/tools/webSearchTool';
import { registerTool } from '../lib/tools/registry';
import { saveToolConfig } from '../lib/toolConfigs';
import { supabase } from '../lib/supabase';

async function main() {
  try {
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Error getting session or not authenticated:', sessionError);
      console.log('Please sign in first.');
      return;
    }

    const userId = session.user.id;
    console.log(`Authenticated as user: ${userId}`);

    // Get the search API keys from environment variables
    // In a real application, you would get these from a secure source
    const bingApiKey = process.env.BING_SEARCH_API_KEY;
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    // Determine which search provider to use based on available API keys
    let searchProvider = SearchProvider.BING; // Default to Bing
    let apiKey = bingApiKey;

    // Check if Google API key and search engine ID are available
    if (googleApiKey && googleSearchEngineId) {
      console.log('Google Search API key and search engine ID found. Using Google as provider.');
      searchProvider = SearchProvider.GOOGLE;
      apiKey = googleApiKey;
    } else if (bingApiKey) {
      console.log('Bing Search API key found. Using Bing as provider.');
    } else {
      console.error('No search API keys found. Please set either BING_SEARCH_API_KEY or both GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.');
      return;
    }

    // Save the API key in the tool_configs table
    console.log(`Saving ${searchProvider} search tool configuration...`);
    const saveResult = await saveToolConfig({
      user_id: userId,
      tool_name: 'web_search',
      config_json: {
        provider: searchProvider,
        api_key: apiKey,
        ...(searchProvider === SearchProvider.GOOGLE ? { search_engine_id: googleSearchEngineId } : {}),
        default_result_count: 5,
        enable_caching: true,
        cache_ttl_ms: 300000, // 5 minutes
      },
    });

    if (saveResult.error) {
      console.error('Failed to save web search tool configuration:', saveResult.error);
      return;
    }

    console.log('Web search tool configuration saved successfully');

    // Create the web search tool
    console.log(`Creating web search tool with ${searchProvider} provider...`);
    const webSearchTool = createWebSearchTool({
      provider: searchProvider,
      apiKey,
      ...(searchProvider === SearchProvider.GOOGLE ? { searchEngineId: googleSearchEngineId } : {}),
      defaultResultCount: 5,
      enableCaching: true,
      cacheTtlMs: 300000, // 5 minutes
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      },
    });

    // Register the tool
    registerTool(webSearchTool);
    console.log('Web search tool registered successfully');

    // Display which provider we're using
    console.log(`\nUsing search provider: ${searchProvider}`);

    // Example 1: Basic search
    console.log('\nExample 1: Basic search');
    console.log('Searching for "TypeScript best practices"...');
    const results1 = await webSearchTool.execute({
      query: 'TypeScript best practices',
      count: 3,
    });

    console.log(`Found ${results1.results.length} results:`);
    results1.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Snippet: ${result.snippet}`);
    });

    // Example 2: Search with freshness filter
    console.log('\nExample 2: Search with freshness filter');
    console.log('Searching for "latest AI news" from the past week...');

    // Different parameters based on provider
    if (searchProvider === SearchProvider.BING) {
      const results2 = await webSearchTool.execute({
        query: 'latest AI news',
        count: 3,
        freshness: 'Week',
      });

      console.log(`Found ${results2.results.length} results:`);
      results2.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet}`);
      });
    } else if (searchProvider === SearchProvider.GOOGLE) {
      // Google uses dateRestrict parameter which is handled internally
      const results2 = await webSearchTool.execute({
        query: 'latest AI news',
        count: 3,
        freshness: 'Week', // Will be converted to appropriate Google format
      });

      console.log(`Found ${results2.results.length} results:`);
      results2.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet}`);
      });
    }

    // Example 3: Search with location/market parameter
    console.log('\nExample 3: Search with location/market parameter');

    if (searchProvider === SearchProvider.BING) {
      console.log('Searching for "local restaurants" in en-US market...');
      const results3 = await webSearchTool.execute({
        query: 'local restaurants',
        count: 3,
        market: 'en-US',
      });

      console.log(`Found ${results3.results.length} results:`);
      results3.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet}`);
      });
    } else if (searchProvider === SearchProvider.GOOGLE) {
      console.log('Searching for "local restaurants" with US geolocation...');
      // For Google, we use the gl parameter which is handled internally
      const results3 = await webSearchTool.execute({
        query: 'local restaurants',
        count: 3,
        market: 'en-US', // Will extract 'US' as the gl parameter
      });

      console.log(`Found ${results3.results.length} results:`);
      results3.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Snippet: ${result.snippet}`);
      });
    }

    console.log('\nWeb search examples completed successfully');

  } catch (error) {
    console.error('Error in web search example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
