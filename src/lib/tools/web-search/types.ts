/**
 * Web search tool type definitions
 */

/**
 * Search provider types
 */
export enum SearchProvider {
  BING = 'bing',
  GOOGLE = 'google',
}

/**
 * Search result interface
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position?: number;
  source: SearchProvider;
}

/**
 * Search response interface
 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults?: number;
  searchTime?: number;
  error?: string;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  numResults?: number;
  safeSearch?: boolean;
  market?: string;
  freshness?: 'Day' | 'Week' | 'Month' | 'Year';
  responseFilter?: 'Computation' | 'News' | 'Places' | 'TimeZone' | 'WebPages';
}

/**
 * Search provider configuration
 */
export interface SearchProviderConfig {
  apiKey: string;
  endpoint?: string;
  defaultOptions?: SearchOptions;
}

/**
 * Search provider interface
 */
export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
  name: string;
  isConfigured(): boolean;
}
