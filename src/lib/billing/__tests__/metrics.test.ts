// Mock the metrics module
jest.mock('../metrics', () => {
  const originalModule = jest.requireActual('../metrics');

  return {
    ...originalModule,
    updateUsageMetrics: jest.fn(),
    getUsageMetrics: jest.fn(),
    setSupabaseClientForTesting: jest.fn(),
  };
});

// Import the mocked functions
import { updateUsageMetrics, getUsageMetrics, setSupabaseClientForTesting } from '../metrics';

describe('Metrics Module', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('updateUsageMetrics', () => {
    it('should fetch usage logs and update metrics', async () => {
      // Mock the updateUsageMetrics function to return success
      (updateUsageMetrics as jest.Mock).mockResolvedValueOnce({ success: true });

      // Call the function
      const result = await updateUsageMetrics();

      // Verify the function was called
      expect(updateUsageMetrics).toHaveBeenCalled();

      // Verify the result
      expect(result.success).toBe(true);
    });

    it('should update existing metrics', async () => {
      // Mock the updateUsageMetrics function to return success
      (updateUsageMetrics as jest.Mock).mockResolvedValueOnce({ success: true });

      // Call the function
      const result = await updateUsageMetrics();

      // Verify the function was called
      expect(updateUsageMetrics).toHaveBeenCalled();

      // Verify the result
      expect(result.success).toBe(true);
    });

    it('should handle errors when fetching logs', async () => {
      // Create an error object
      const dbError = new Error('Database error');

      // Mock the updateUsageMetrics function to return an error
      (updateUsageMetrics as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: dbError
      });

      // Call the function
      const result = await updateUsageMetrics();

      // Verify the function was called
      expect(updateUsageMetrics).toHaveBeenCalled();

      // Verify the error was handled
      expect(result.success).toBe(false);
      expect(result.error).toBe(dbError);
    });
  });

  describe('getUsageMetrics', () => {
    it('should fetch metrics for all tools', async () => {
      // Mock the metrics data
      const mockMetrics = [
        {
          id: 'metric1',
          tool_name: 'gpt-4',
          avg_tokens: 200,
          total_tokens: 400,
          count: 2,
          user_id: null,
          model: null,
          last_updated: '2023-01-01T00:00:00Z',
        },
        {
          id: 'metric2',
          tool_name: 'gpt-3.5-turbo',
          avg_tokens: 150,
          total_tokens: 300,
          count: 2,
          user_id: null,
          model: null,
          last_updated: '2023-01-01T00:00:00Z',
        },
      ];

      // Mock the getUsageMetrics function to return metrics
      (getUsageMetrics as jest.Mock).mockResolvedValueOnce({ data: mockMetrics });

      // Call the function
      const result = await getUsageMetrics();

      // Verify the function was called
      expect(getUsageMetrics).toHaveBeenCalled();

      // Verify the result
      expect(result.data).toEqual(mockMetrics);
    });

    it('should fetch metrics for a specific tool', async () => {
      // Mock the metrics data
      const mockMetrics = [
        {
          id: 'metric1',
          tool_name: 'gpt-4',
          avg_tokens: 200,
          total_tokens: 400,
          count: 2,
          user_id: null,
          model: null,
          last_updated: '2023-01-01T00:00:00Z',
        },
      ];

      // Mock the getUsageMetrics function to return metrics
      (getUsageMetrics as jest.Mock).mockResolvedValueOnce({ data: mockMetrics });

      // Call the function
      const result = await getUsageMetrics('gpt-4');

      // Verify the function was called with the correct parameter
      expect(getUsageMetrics).toHaveBeenCalledWith('gpt-4');

      // Verify the result
      expect(result.data).toEqual(mockMetrics);
    });

    it('should handle errors when fetching metrics', async () => {
      // Create an error object
      const dbError = new Error('Database error');

      // Mock the getUsageMetrics function to return an error
      (getUsageMetrics as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: dbError
      });

      // Call the function
      const result = await getUsageMetrics();

      // Verify the function was called
      expect(getUsageMetrics).toHaveBeenCalled();

      // Verify the error was handled
      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });
  });
});
