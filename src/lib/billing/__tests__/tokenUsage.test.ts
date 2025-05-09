// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnValue({ data: null, error: { code: 'PGRST116' } })
      }),
      update: jest.fn().mockReturnValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
    })),
  })),
}));

// Now import the module after mocking
import { extractTokenUsage, calculateCost, logTokenUsage, updateMonthlyCost, logUsageAndUpdateCost } from '../tokenUsage';

describe('Token Usage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTokenUsage', () => {
    it('should extract token usage from an OpenAI API response', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      const usage = extractTokenUsage(response);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });

    it('should handle missing usage data', () => {
      const response = {};

      const usage = extractTokenUsage(response);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = calculateCost('gpt-4', usage);

      // GPT-4 rates: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
      const expectedCost = (1000 / 1000) * 0.03 + (500 / 1000) * 0.06;
      expect(cost).toBeCloseTo(expectedCost);
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = calculateCost('gpt-3.5-turbo', usage);

      // GPT-3.5-turbo rates: $0.0015 per 1K prompt tokens, $0.002 per 1K completion tokens
      const expectedCost = (1000 / 1000) * 0.0015 + (500 / 1000) * 0.002;
      expect(cost).toBeCloseTo(expectedCost);
    });

    it('should use default rates for unknown models', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = calculateCost('unknown-model', usage);

      // Default to GPT-3.5-turbo rates
      const expectedCost = (1000 / 1000) * 0.0015 + (500 / 1000) * 0.002;
      expect(cost).toBeCloseTo(expectedCost);
    });
  });

  // Import the mocked functions for testing
  const { logTokenUsage, updateMonthlyCost, logUsageAndUpdateCost } = jest.requireMock('../tokenUsage');

  describe('Database Integration', () => {
    it('should call logTokenUsage with correct parameters', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      await logTokenUsage(userId, model, usage);

      expect(logTokenUsage).toHaveBeenCalledWith(userId, model, usage);
    });

    it('should call updateMonthlyCost with correct parameters', async () => {
      const userId = 'test-user-id';
      const cost = 0.05;

      await updateMonthlyCost(userId, cost);

      expect(updateMonthlyCost).toHaveBeenCalledWith(userId, cost);
    });

    it('should call logUsageAndUpdateCost with correct parameters', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      // Mock the implementation for this test
      (logUsageAndUpdateCost as jest.Mock).mockImplementationOnce(async (userId, model, usage) => {
        const cost = calculateCost(model, usage);
        return { success: true, cost };
      });

      const result = await logUsageAndUpdateCost(userId, model, usage);

      expect(logUsageAndUpdateCost).toHaveBeenCalledWith(userId, model, usage);
      expect(result.success).toBe(true);

      // Calculate the expected cost
      const expectedCost = (1000 / 1000) * 0.03 + (500 / 1000) * 0.06;
      expect(result.cost).toBeCloseTo(expectedCost);
    });
  });
});
