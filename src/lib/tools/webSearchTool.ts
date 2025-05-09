/**
 * Web Search Tool
 *
 * This tool implements a web search functionality using various search APIs.
 * Currently supported providers:
 * - Bing Web Search API
 * - Google Custom Search API (planned)
 *
 * It allows the agent to search the web for information and return relevant results.
 */

import { ExtendedTool, ToolCategory } from './types';

/**
 * Interface for search result items
 */
export interface SearchResultItem {
  /** The title of the search result */
  name: string;
  /** The URL of the search result */
  url: string;
  /** A snippet of text from the search result */
  snippet: string;
  /** The date the page was last crawled */
  dateLastCrawled?: string;
}

/**
 * Interface for search results
 */
export interface SearchResults {
  /** The search query */
  query: string;
  /** The search results */
  results: SearchResultItem[];
  /** Total estimated matches */
  totalEstimatedMatches?: number;
  /** Whether the results are cached */
  cached?: boolean;
  /** Timestamp when the results were cached */
  cachedAt?: string;
}

/**
 * Supported search providers
 */
export enum SearchProvider {
  BING = 'bing',
  GOOGLE = 'google',
}

/**
 * Configuration for the web search tool
 */
export interface WebSearchToolConfig {
  /** Search provider to use */
  provider?: SearchProvider;
  /** API key for the search provider */
  apiKey: string;
  /** Search engine ID (required for Google Custom Search) */
  searchEngineId?: string;
  /** Base URL for the search API */
  baseUrl?: string;
  /** Default number of results to return */
  defaultResultCount?: number;
  /** Whether to enable caching */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Rate limit settings */
  rateLimit?: {
    /** Maximum number of requests */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { results: SearchResults; timestamp: number }>();

/**
 * Perform a search using the Bing Web Search API
 */
async function searchWithBing(
  query: string,
  count: number,
  options: {
    apiKey: string;
    baseUrl?: string;
    freshness?: 'Day' | 'Week' | 'Month' | 'Year';
    market?: string;
  }
): Promise<SearchResults> {
  const baseUrl = options.baseUrl || 'https://api.bing.microsoft.com/v7.0/search';

  // Build query parameters
  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
  });

  if (options.freshness) {
    params.append('freshness', options.freshness);
  }

  if (options.market) {
    params.append('mkt', options.market);
  }

  // Make API request
  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': options.apiKey,
      'Accept': 'application/json',
    },
  });

  // Handle API errors
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bing Search API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Transform API response to our format
  return {
    query,
    results: data.webPages?.value.map((item: any) => ({
      name: item.name,
      url: item.url,
      snippet: item.snippet,
      dateLastCrawled: item.dateLastCrawled,
    })) || [],
    totalEstimatedMatches: data.webPages?.totalEstimatedMatches,
  };
}

/**
 * Perform a search using the Google Custom Search API
 */
async function searchWithGoogle(
  query: string,
  count: number,
  options: {
    apiKey: string;
    searchEngineId: string;
    baseUrl?: string;
    dateRestrict?: string;
    gl?: string; // Country code for geolocation
  }
): Promise<SearchResults> {
  const baseUrl = options.baseUrl || 'https://www.googleapis.com/customsearch/v1';

  // Build query parameters
  const params = new URLSearchParams({
    q: query,
    key: options.apiKey,
    cx: options.searchEngineId,
    num: Math.min(count, 10).toString(), // Google only allows max 10 results per request
  });

  // Add optional parameters if provided
  if (options.dateRestrict) {
    params.append('dateRestrict', options.dateRestrict);
  }

  if (options.gl) {
    params.append('gl', options.gl);
  }

  // Make API request
  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  // Handle API errors
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Search API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Transform API response to our format
  return {
    query,
    results: data.items?.map((item: any) => ({
      name: item.title,
      url: item.link,
      snippet: item.snippet,
      dateLastCrawled: null, // Google doesn't provide this information
    })) || [],
    totalEstimatedMatches: data.searchInformation?.totalResults ? parseInt(data.searchInformation.totalResults) : undefined,
  };
}

/**
 * Create a web search tool with the given configuration
 * @param config Configuration for the web search tool
 * @returns A configured web search tool
 */
export function createWebSearchTool(config: WebSearchToolConfig): ExtendedTool {
  const provider = config.provider || SearchProvider.BING;
  const defaultResultCount = config.defaultResultCount || 5;
  const enableCaching = config.enableCaching !== false;
  const cacheTtlMs = config.cacheTtlMs || 5 * 60 * 1000; // Default: 5 minutes

  // Track API calls for rate limiting
  const apiCalls: number[] = [];

  // Validate configuration based on provider
  if (provider === SearchProvider.GOOGLE && !config.searchEngineId) {
    throw new Error('searchEngineId is required for Google Custom Search');
  }

  // Get provider-specific metadata
  const providerMetadata = {
    [SearchProvider.BING]: {
      name: 'Bing Web Search API',
      documentation: 'https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/overview',
    },
    [SearchProvider.GOOGLE]: {
      name: 'Google Custom Search API',
      documentation: 'https://developers.google.com/custom-search/v1/overview',
    },
  };

  return {
    name: 'web_search',
    description: `Search the web for information using ${providerMetadata[provider].name}`,
    category: ToolCategory.EXTERNAL_API,
    version: '1.0.0',
    requiresAuth: true,
    parameters: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      count: {
        type: 'number',
        description: 'Number of results to return (max 50)',
        optional: true,
        default: defaultResultCount,
      },
      freshness: {
        type: 'string',
        enum: ['Day', 'Week', 'Month', 'Year'],
        description: 'Filter results by age',
        optional: true,
      },
      market: {
        type: 'string',
        description: 'The market where the results come from (e.g., en-US)',
        optional: true,
      },
    },
    execute: async (args: {
      query: string;
      count?: number;
      freshness?: 'Day' | 'Week' | 'Month' | 'Year';
      market?: string;
    }) => {
      try {
        const { query, count = defaultResultCount, freshness, market } = args;

        // Check rate limits if configured
        if (config.rateLimit) {
          const now = Date.now();
          // Remove expired timestamps
          while (apiCalls.length > 0 && apiCalls[0] < now - config.rateLimit.windowMs) {
            apiCalls.shift();
          }

          // Check if rate limit is exceeded
          if (apiCalls.length >= config.rateLimit.maxRequests) {
            throw new Error(`Rate limit exceeded: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000} seconds`);
          }
        }

        // Check cache if enabled
        const cacheKey = JSON.stringify({ provider, query, count, freshness, market });
        if (enableCaching && searchCache.has(cacheKey)) {
          const cached = searchCache.get(cacheKey)!;
          const now = Date.now();

          // Return cached results if they're still valid
          if (now - cached.timestamp < cacheTtlMs) {
            return {
              ...cached.results,
              cached: true,
              cachedAt: new Date(cached.timestamp).toISOString(),
            };
          }

          // Remove expired cache entry
          searchCache.delete(cacheKey);
        }

        // Perform search based on provider
        let results: SearchResults;

        if (provider === SearchProvider.BING) {
          results = await searchWithBing(query, count, {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            freshness,
            market,
          });
        } else if (provider === SearchProvider.GOOGLE) {
          if (!config.searchEngineId) {
            throw new Error('searchEngineId is required for Google Custom Search');
          }

          results = await searchWithGoogle(query, count, {
            apiKey: config.apiKey,
            searchEngineId: config.searchEngineId,
            baseUrl: config.baseUrl,
            dateRestrict: freshness?.toLowerCase(), // Convert to Google format
            gl: market?.split('-')[1], // Extract country code from market
          });
        } else {
          throw new Error(`Unsupported search provider: ${provider}`);
        }

        // Track API call for rate limiting
        if (config.rateLimit) {
          apiCalls.push(Date.now());
        }

        // Cache results if enabled
        if (enableCaching) {
          searchCache.set(cacheKey, {
            results,
            timestamp: Date.now(),
          });
        }

        return results;
      } catch (error) {
        console.error('Error performing web search:', error);
        throw new Error(`Web search failed: ${(error as Error).message}`);
      }
    },
    rateLimit: config.rateLimit,
    metadata: {
      provider: providerMetadata[provider].name,
      documentation: providerMetadata[provider].documentation,
    },
  };
}
