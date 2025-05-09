// Mock dependencies
jest.mock('../metrics', () => ({
  getUsageMetrics: jest.fn(),
  UsageMetric: jest.requireActual('../metrics').UsageMetric,
}));

jest.mock('../../tools/registry', () => ({
  getTool: jest.fn(),
}));

jest.mock('../tokenUsage', () => ({
  calculateCost: jest.fn((model, usage) => {
    // Simple mock implementation for testing
    const rates: Record<string, { promptRate: number; completionRate: number }> = {
      'gpt-4': { promptRate: 0.03, completionRate: 0.06 },
      'gpt-3.5-turbo': { promptRate: 0.0015, completionRate: 0.002 },
    };
    
    const modelRates = rates[model] || rates['gpt-3.5-turbo'];
    return (usage.promptTokens / 1000) * modelRates.promptRate + 
           (usage.completionTokens / 1000) * modelRates.completionRate;
  }),
  TokenUsage: jest.requireActual('../tokenUsage').TokenUsage,
}));

// Import after mocking
import { estimateToolCost, estimateModelCost } from '../costEstimator';
import { getUsageMetrics } from '../metrics';
import { getTool } from '../../tools/registry';
import { calculateCost } from '../tokenUsage';

describe('Cost Estimator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for getTool
    (getTool as jest.Mock).mockReturnValue({
      name: 'test_tool',
      description: 'A test tool',
      parameters: {},
      execute: jest.fn(),
    });
  });

  describe('estimateToolCost', () => {
    it('should use metrics when available', async () => {
      // Mock metrics data
      (getUsageMetrics as jest.Mock).mockResolvedValue({
        data: [
          {
            tool_name: 'test_tool',
            avg_tokens: 1000,
            total_tokens: 5000,
            count: 5,
            user_id: null,
          }
        ],
        error: null,
      });

      const result = await estimateToolCost('test_tool');

      expect(getUsageMetrics).toHaveBeenCalledWith('test_tool', undefined);
      expect(result.isBasedOnMetrics).toBe(true);
      expect(result.estimatedUsage.totalTokens).toBe(1000);
      expect(calculateCost).toHaveBeenCalled();
    });

    it('should use user-specific metrics when available', async () => {
      // Mock metrics data with both user-specific and global metrics
      (getUsageMetrics as jest.Mock).mockResolvedValue({
        data: [
          {
            tool_name: 'test_tool',
            avg_tokens: 800,
            total_tokens: 4000,
            count: 5,
            user_id: null, // Global metric
          },
          {
            tool_name: 'test_tool',
            avg_tokens: 1200,
            total_tokens: 6000,
            count: 5,
            user_id: 'test-user-id', // User-specific metric
          }
        ],
        error: null,
      });

      const result = await estimateToolCost('test_tool', 'test-user-id');

      expect(getUsageMetrics).toHaveBeenCalledWith('test_tool', 'test-user-id');
      expect(result.isBasedOnMetrics).toBe(true);
      expect(result.estimatedUsage.totalTokens).toBe(1200); // Should use user-specific metric
      expect(calculateCost).toHaveBeenCalled();
    });

    it('should use default values when no metrics are available', async () => {
      // Mock empty metrics data
      (getUsageMetrics as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await estimateToolCost('test_tool');

      expect(getUsageMetrics).toHaveBeenCalledWith('test_tool', undefined);
      expect(result.isBasedOnMetrics).toBe(false);
      expect(result.estimatedUsage.totalTokens).toBeGreaterThan(0); // Should use default values
      expect(calculateCost).toHaveBeenCalled();
    });

    it('should use default values when metrics fetch fails', async () => {
      // Mock metrics fetch error
      (getUsageMetrics as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await estimateToolCost('test_tool');

      expect(getUsageMetrics).toHaveBeenCalledWith('test_tool', undefined);
      expect(result.isBasedOnMetrics).toBe(false);
      expect(result.estimatedUsage.totalTokens).toBeGreaterThan(0); // Should use default values
      expect(calculateCost).toHaveBeenCalled();
    });

    it('should throw an error when tool is not found', async () => {
      // Mock tool not found
      (getTool as jest.Mock).mockReturnValue(null);

      await expect(estimateToolCost('nonexistent_tool')).rejects.toThrow(
        "Tool 'nonexistent_tool' not found"
      );
    });

    it('should use the specified model for cost calculation', async () => {
      // Mock metrics data
      (getUsageMetrics as jest.Mock).mockResolvedValue({
        data: [
          {
            tool_name: 'test_tool',
            avg_tokens: 1000,
            total_tokens: 5000,
            count: 5,
            user_id: null,
          }
        ],
        error: null,
      });

      const result = await estimateToolCost('test_tool', undefined, 'gpt-4');

      expect(result.model).toBe('gpt-4');
      expect(calculateCost).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
  });

  describe('estimateModelCost', () => {
    it('should calculate cost based on context and completion length', () => {
      const result = estimateModelCost('gpt-4', 2000, 500);

      expect(result.estimatedUsage.promptTokens).toBe(2000);
      expect(result.estimatedUsage.completionTokens).toBe(500);
      expect(result.estimatedUsage.totalTokens).toBe(2500);
      expect(calculateCost).toHaveBeenCalledWith('gpt-4', result.estimatedUsage);
    });

    it('should use default values when not specified', () => {
      const result = estimateModelCost('gpt-3.5-turbo');

      expect(result.estimatedUsage.promptTokens).toBe(1000); // Default context length
      expect(result.estimatedUsage.completionTokens).toBe(300); // Default completion length
      expect(result.estimatedUsage.totalTokens).toBe(1300);
      expect(calculateCost).toHaveBeenCalledWith('gpt-3.5-turbo', result.estimatedUsage);
    });
  });
});
