/**
 * Tests for the Web Search Tool
 */

import { createWebSearchTool, SearchProvider } from '../webSearchTool';
import { ExtendedTool } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('Web Search Tool', () => {
  let webSearchTool: ExtendedTool;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new instance of the tool for each test
    webSearchTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      defaultResultCount: 5,
      enableCaching: true,
      cacheTtlMs: 1000, // 1 second for faster testing
    });

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        webPages: {
          value: [
            {
              name: 'Test Result 1',
              url: 'https://example.com/result1',
              snippet: 'This is test result 1',
              dateLastCrawled: '2023-01-01T00:00:00Z',
            },
            {
              name: 'Test Result 2',
              url: 'https://example.com/result2',
              snippet: 'This is test result 2',
              dateLastCrawled: '2023-01-02T00:00:00Z',
            },
          ],
          totalEstimatedMatches: 100,
        },
      }),
    });
  });

  test('should have the correct name and description', () => {
    expect(webSearchTool.name).toBe('web_search');
    expect(webSearchTool.description).toBe('Search the web for information using Bing Web Search API');
    expect(webSearchTool.category).toBe('external_api');
  });

  test('should have the correct parameters', () => {
    expect(webSearchTool.parameters).toHaveProperty('query');
    expect(webSearchTool.parameters).toHaveProperty('count');
    expect(webSearchTool.parameters).toHaveProperty('freshness');
    expect(webSearchTool.parameters).toHaveProperty('market');
  });

  test('should make a request to the Bing Search API with the correct parameters', async () => {
    await webSearchTool.execute({
      query: 'test query',
      count: 3,
      freshness: 'Week',
      market: 'en-US',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchUrl).toContain('https://api.bing.microsoft.com/v7.0/search');
    // The URL encoding might be different (+ vs %20), so we check for both possibilities
    const decodedUrl = decodeURIComponent(fetchUrl);
    expect(decodedUrl.includes('q=test query') || decodedUrl.includes('q=test+query')).toBe(true);
    expect(fetchUrl).toContain('count=3');
    expect(fetchUrl).toContain('freshness=Week');
    expect(fetchUrl).toContain('mkt=en-US');

    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(fetchOptions.headers).toHaveProperty('Ocp-Apim-Subscription-Key', mockApiKey);
    expect(fetchOptions.headers).toHaveProperty('Accept', 'application/json');
  });

  test('should return the correct search results', async () => {
    const results = await webSearchTool.execute({
      query: 'test query',
    });

    expect(results).toHaveProperty('query', 'test query');
    expect(results).toHaveProperty('results');
    expect(results.results).toHaveLength(2);
    expect(results.results[0]).toHaveProperty('name', 'Test Result 1');
    expect(results.results[0]).toHaveProperty('url', 'https://example.com/result1');
    expect(results.results[0]).toHaveProperty('snippet', 'This is test result 1');
    expect(results.results[0]).toHaveProperty('dateLastCrawled', '2023-01-01T00:00:00Z');
    expect(results).toHaveProperty('totalEstimatedMatches', 100);
  });

  test('should use default count when not specified', async () => {
    // Reset mocks and create a new tool to avoid caching issues
    jest.clearAllMocks();

    // Create a new tool with caching disabled
    const freshTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      defaultResultCount: 5,
      enableCaching: false,
    });

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        webPages: {
          value: [
            {
              name: 'Test Result 1',
              url: 'https://example.com/result1',
              snippet: 'This is test result 1',
              dateLastCrawled: '2023-01-01T00:00:00Z',
            },
          ],
          totalEstimatedMatches: 100,
        },
      }),
    });

    await freshTool.execute({
      query: 'default count query',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchUrl).toContain('count=5'); // Default count
  });

  test('should handle API errors', async () => {
    // Reset mocks and cache
    jest.clearAllMocks();
    // Clear the cache by recreating the tool
    webSearchTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      defaultResultCount: 5,
      enableCaching: false, // Disable caching for this test
    });

    // Mock API error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    });

    await expect(webSearchTool.execute({
      query: 'test query',
    })).rejects.toThrow('Web search failed: Bing Search API error: 401 Unauthorized');
  });

  test('should cache results and return cached results on subsequent calls', async () => {
    // Reset mocks and create a new tool with caching enabled
    jest.clearAllMocks();
    const cachingTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      defaultResultCount: 5,
      enableCaching: true,
      cacheTtlMs: 1000, // 1 second for faster testing
    });

    // First call
    const results1 = await cachingTool.execute({
      query: 'cache test query',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results1).not.toHaveProperty('cached');

    // Second call with the same query
    const results2 = await cachingTool.execute({
      query: 'cache test query',
    });

    // Should not make a second API call
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results2).toHaveProperty('cached', true);
    expect(results2).toHaveProperty('cachedAt');
  });

  test('should make a new API call when cache expires', async () => {
    // Reset mocks and create a new tool with short cache TTL
    jest.clearAllMocks();
    const cachingTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      defaultResultCount: 5,
      enableCaching: true,
      cacheTtlMs: 100, // Very short TTL for faster testing
    });

    // First call
    await cachingTool.execute({
      query: 'expiring cache query',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 200));

    // Second call with the same query
    await cachingTool.execute({
      query: 'expiring cache query',
    });

    // Should make a second API call
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('should respect rate limits', async () => {
    // Create a tool with rate limiting
    const rateLimitedTool = createWebSearchTool({
      provider: SearchProvider.BING,
      apiKey: mockApiKey,
      rateLimit: {
        maxRequests: 2,
        windowMs: 1000,
      },
    });

    // First call
    await rateLimitedTool.execute({
      query: 'test query 1',
    });

    // Second call
    await rateLimitedTool.execute({
      query: 'test query 2',
    });

    // Third call should fail due to rate limit
    await expect(rateLimitedTool.execute({
      query: 'test query 3',
    })).rejects.toThrow('Web search failed: Rate limit exceeded: 2 requests per 1 seconds');
  });

  test('should make a request to the Google Custom Search API with the correct parameters', async () => {
    // Create a tool with Google provider
    const googleSearchTool = createWebSearchTool({
      provider: SearchProvider.GOOGLE,
      apiKey: mockApiKey,
      searchEngineId: 'test-search-engine-id',
    });

    // Mock successful Google API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          {
            title: 'Google Result 1',
            link: 'https://example.com/google1',
            snippet: 'This is Google test result 1',
          },
          {
            title: 'Google Result 2',
            link: 'https://example.com/google2',
            snippet: 'This is Google test result 2',
          },
        ],
        searchInformation: {
          totalResults: '1000',
        },
      }),
    });

    // Execute search
    await googleSearchTool.execute({
      query: 'google test query',
      count: 5,
    });

    // Verify the request
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchUrl).toContain('https://www.googleapis.com/customsearch/v1');
    // The URL encoding might be different (+ vs %20), so we check for both possibilities
    const decodedUrl = decodeURIComponent(fetchUrl);
    expect(decodedUrl.includes('q=google test query') || decodedUrl.includes('q=google+test+query')).toBe(true);
    expect(fetchUrl).toContain('key=test-api-key');
    expect(fetchUrl).toContain('cx=test-search-engine-id');
    expect(fetchUrl).toContain('num=5');
  });

  test('should correctly parse Google Custom Search API response', async () => {
    // Create a tool with Google provider
    const googleSearchTool = createWebSearchTool({
      provider: SearchProvider.GOOGLE,
      apiKey: mockApiKey,
      searchEngineId: 'test-search-engine-id',
    });

    // Mock successful Google API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        items: [
          {
            title: 'Google Result 1',
            link: 'https://example.com/google1',
            snippet: 'This is Google test result 1',
          },
          {
            title: 'Google Result 2',
            link: 'https://example.com/google2',
            snippet: 'This is Google test result 2',
          },
        ],
        searchInformation: {
          totalResults: '1000',
        },
      }),
    });

    // Execute search
    const results = await googleSearchTool.execute({
      query: 'google test query',
    });

    // Verify the results
    expect(results).toHaveProperty('query', 'google test query');
    expect(results).toHaveProperty('results');
    expect(results.results).toHaveLength(2);
    expect(results.results[0]).toHaveProperty('name', 'Google Result 1');
    expect(results.results[0]).toHaveProperty('url', 'https://example.com/google1');
    expect(results.results[0]).toHaveProperty('snippet', 'This is Google test result 1');
    expect(results).toHaveProperty('totalEstimatedMatches', 1000);
  });

  test('should throw error when Google provider is used without searchEngineId', () => {
    // Should throw error when creating tool without searchEngineId
    expect(() => {
      createWebSearchTool({
        provider: SearchProvider.GOOGLE,
        apiKey: mockApiKey,
      });
    }).toThrow('searchEngineId is required for Google Custom Search');
  });

  test('should handle Google API errors', async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a tool with Google provider and disable caching
    const googleSearchTool = createWebSearchTool({
      provider: SearchProvider.GOOGLE,
      apiKey: mockApiKey,
      searchEngineId: 'test-search-engine-id',
      enableCaching: false, // Disable caching for this test
    });

    // Mock API error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue('Daily Limit Exceeded'),
    });

    // Should throw error
    await expect(googleSearchTool.execute({
      query: 'google test query',
    })).rejects.toThrow('Web search failed: Google Search API error: 403 Daily Limit Exceeded');
  });

  test('should handle missing items in Google response', async () => {
    // Create a tool with Google provider
    const googleSearchTool = createWebSearchTool({
      provider: SearchProvider.GOOGLE,
      apiKey: mockApiKey,
      searchEngineId: 'test-search-engine-id',
    });

    // Mock empty response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        // No items property
        searchInformation: {
          totalResults: '0',
        },
      }),
    });

    // Should return empty results array
    const results = await googleSearchTool.execute({
      query: 'no results query',
    });

    expect(results.results).toHaveLength(0);
  });
});
