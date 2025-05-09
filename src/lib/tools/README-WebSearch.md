# Web Search Tool

This tool allows the agent to search the web for information using various search APIs. It provides a simple interface for making search queries and retrieving relevant results.

## Supported Search Providers

- **Bing Web Search API** (default): Microsoft's search engine with a generous free tier
- **Google Custom Search API**: Google's search engine with more comprehensive results

## Features

- Search the web with customizable parameters
- Cache search results to reduce API calls
- Rate limiting to prevent API quota exhaustion
- Configurable result count, freshness, and market parameters

## Prerequisites

To use this tool, you need:

### For Bing Web Search API (default)
1. A Bing Web Search API key from [Microsoft Azure](https://portal.azure.com/)
2. The tool configuration stored in the `tool_configs` table

### For Google Custom Search API
1. A Google API key from [Google Cloud Console](https://console.cloud.google.com/)
2. A Custom Search Engine ID from [Programmable Search Engine](https://programmablesearchengine.google.com/)
3. The tool configuration stored in the `tool_configs` table

## Installation

The web search tool is included in the tools module. To use it, you need to:

1. Save the API key in the `tool_configs` table
2. Create and register the tool with the appropriate configuration

## Usage

### Saving the API Key

#### For Bing Web Search API

```typescript
import { saveToolConfig } from '../lib/toolConfigs';
import { SearchProvider } from '../lib/tools/webSearchTool';

// Save the API key for a specific user
await saveToolConfig({
  user_id: 'user-id',
  tool_name: 'web_search',
  config_json: {
    provider: SearchProvider.BING,
    api_key: 'your-bing-search-api-key',
    default_result_count: 5,
    enable_caching: true,
    cache_ttl_ms: 300000, // 5 minutes
  },
});
```

#### For Google Custom Search API

```typescript
import { saveToolConfig } from '../lib/toolConfigs';
import { SearchProvider } from '../lib/tools/webSearchTool';

// Save the API key for a specific user
await saveToolConfig({
  user_id: 'user-id',
  tool_name: 'web_search',
  config_json: {
    provider: SearchProvider.GOOGLE,
    api_key: 'your-google-api-key',
    search_engine_id: 'your-custom-search-engine-id',
    default_result_count: 5,
    enable_caching: true,
    cache_ttl_ms: 300000, // 5 minutes
  },
});
```

### Creating and Registering the Tool

#### For Bing Web Search API

```typescript
import { createWebSearchTool, SearchProvider } from '../lib/tools/webSearchTool';
import { registerTool } from '../lib/tools/registry';

// Create the web search tool
const webSearchTool = createWebSearchTool({
  provider: SearchProvider.BING,
  apiKey: 'your-bing-search-api-key',
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
```

#### For Google Custom Search API

```typescript
import { createWebSearchTool, SearchProvider } from '../lib/tools/webSearchTool';
import { registerTool } from '../lib/tools/registry';

// Create the web search tool
const webSearchTool = createWebSearchTool({
  provider: SearchProvider.GOOGLE,
  apiKey: 'your-google-api-key',
  searchEngineId: 'your-custom-search-engine-id',
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
```

### Using the Tool Factory

```typescript
import { registerToolFactory, createToolForUser } from '../lib/tools/factory';
import { SearchProvider } from '../lib/tools/webSearchTool';

// Register the web search tool factory
registerToolFactory('web_search', (config) => {
  return createWebSearchTool({
    provider: config.provider || SearchProvider.BING,
    apiKey: config.apiKey,
    searchEngineId: config.searchEngineId, // Required for Google
    defaultResultCount: config.defaultResultCount || 5,
    enableCaching: config.enableCaching !== false,
    cacheTtlMs: config.cacheTtlMs || 300000,
    rateLimit: config.rateLimit || {
      maxRequests: 10,
      windowMs: 60000,
    },
  });
});

// Create a tool for a specific user
const webSearchTool = await createToolForUser('user-id', 'web_search');
```

### Executing Searches

```typescript
// Basic search
const results = await webSearchTool.execute({
  query: 'TypeScript best practices',
  count: 5,
});

// Search with freshness filter
const newsResults = await webSearchTool.execute({
  query: 'latest AI news',
  count: 3,
  freshness: 'Week',
});

// Search with market parameter
const localResults = await webSearchTool.execute({
  query: 'local restaurants',
  count: 3,
  market: 'en-US',
});
```

## Configuration Options

The web search tool accepts the following configuration options:

| Option | Type | Description | Default | Required For |
|--------|------|-------------|---------|-------------|
| `provider` | enum | Search provider to use (BING or GOOGLE) | BING | All |
| `apiKey` | string | API key for the search provider | - | All |
| `searchEngineId` | string | Custom Search Engine ID | - | Google only |
| `baseUrl` | string | Base URL for the search API | Provider-specific | - |
| `defaultResultCount` | number | Default number of results to return | 5 | - |
| `enableCaching` | boolean | Whether to enable caching | true | - |
| `cacheTtlMs` | number | Cache TTL in milliseconds | 300000 (5 minutes) | - |
| `rateLimit.maxRequests` | number | Maximum number of requests in the time window | - | - |
| `rateLimit.windowMs` | number | Time window in milliseconds | - | - |

### Provider-Specific Base URLs

- **Bing**: `https://api.bing.microsoft.com/v7.0/search`
- **Google**: `https://www.googleapis.com/customsearch/v1`

## Search Parameters

The `execute` method accepts the following parameters:

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `query` | string | The search query | Yes |
| `count` | number | Number of results to return (max 50) | No |
| `freshness` | string | Filter results by age ('Day', 'Week', 'Month', 'Year') | No |
| `market` | string | The market where the results come from (e.g., 'en-US') | No |

## Response Format

The tool returns search results in the following format:

```typescript
{
  query: string;
  results: {
    name: string;
    url: string;
    snippet: string;
    dateLastCrawled?: string;
  }[];
  totalEstimatedMatches?: number;
  cached?: boolean;
  cachedAt?: string;
}
```

## Error Handling

The tool includes error handling for:

- API errors (e.g., invalid API key, rate limit exceeded)
- Network errors
- Invalid parameters

When an error occurs, the tool throws an error with a descriptive message that can be caught and handled by the calling code.

## Examples

See the following files for examples of how to use the web search tool:

- `src/lib/tools/examples/webSearchExample.ts`: Example implementation
- `src/examples/webSearchExample.ts`: Example usage script

## Best Practices

1. **Store API Keys Securely**: Always store API keys in the `tool_configs` table, never hardcode them.
2. **Enable Caching**: Use caching to reduce API calls and improve performance.
3. **Implement Rate Limiting**: Set appropriate rate limits to prevent API quota exhaustion.
4. **Handle Errors**: Always handle errors properly to provide a good user experience.
5. **Use Specific Queries**: More specific queries tend to yield better results.
