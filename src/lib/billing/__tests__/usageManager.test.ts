// Mock the dependencies
jest.mock('../tokenUsage', () => ({
  logTokenUsage: jest.fn().mockResolvedValue({ success: true }),
  logUsageAndUpdateCost: jest.fn().mockResolvedValue({ success: true }),
  calculateCost: jest.fn().mockReturnValue(0.5),
  TokenUsage: jest.requireActual('../tokenUsage').TokenUsage,
}));

jest.mock('../creditDeduction', () => ({
  checkSufficientCredits: jest.fn(),
  deductCredits: jest.fn(),
  getSupabaseClient: jest.fn(),
  CreditTransactionType: {
    DEDUCTION: 'deduction',
    ADDITION: 'addition',
    REFUND: 'refund',
    ADJUSTMENT: 'adjustment',
  },
}));

// Import the module after mocking
import { processTokenUsage, canAffordModelUsage } from '../usageManager';
import { checkSufficientCredits, deductCredits } from '../creditDeduction';
import { logTokenUsage, logUsageAndUpdateCost } from '../tokenUsage';

describe('Usage Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processTokenUsage', () => {
    it('should process token usage successfully when user has sufficient credits', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: true,
        balance: 100,
      });

      (deductCredits as jest.Mock).mockResolvedValue({
        success: true,
        balance: 99.5, // 100 - 0.5
      });

      const result = await processTokenUsage(userId, model, usage);

      expect(result.success).toBe(true);
      expect(result.creditsBalance).toBe(99.5);

      // Check that all the functions were called with the correct parameters
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
      expect(logTokenUsage).toHaveBeenCalledWith(userId, model, usage);
      expect(logUsageAndUpdateCost).toHaveBeenCalledWith(userId, model, usage);
      expect(deductCredits).toHaveBeenCalledWith(userId, model, usage, 'Token usage');
    });

    it('should return insufficient credits error when user has insufficient credits', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: false,
        balance: 0.1,
      });

      const result = await processTokenUsage(userId, model, usage);

      expect(result.success).toBe(false);
      expect(result.insufficientCredits).toBe(true);
      expect(result.creditsBalance).toBe(0.1);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Insufficient credits');

      // Check that only checkSufficientCredits was called
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
      expect(logTokenUsage).not.toHaveBeenCalled();
      expect(logUsageAndUpdateCost).not.toHaveBeenCalled();
      expect(deductCredits).not.toHaveBeenCalled();
    });

    it('should handle errors from token usage logging', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: true,
        balance: 100,
      });

      (logTokenUsage as jest.Mock).mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      const result = await processTokenUsage(userId, model, usage);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Check that the functions were called in the correct order
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
      expect(logTokenUsage).toHaveBeenCalledWith(userId, model, usage);
      expect(logUsageAndUpdateCost).not.toHaveBeenCalled();
      expect(deductCredits).not.toHaveBeenCalled();
    });
  });

  describe('canAffordModelUsage', () => {
    it('should return true when user can afford the model usage', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: true,
        balance: 100,
      });

      const result = await canAffordModelUsage(userId, model, usage);

      expect(result.canAfford).toBe(true);
      expect(result.balance).toBe(100);

      // Check that checkSufficientCredits was called with the correct parameters
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
    });

    it('should return false when user cannot afford the model usage', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: false,
        balance: 0.1,
      });

      const result = await canAffordModelUsage(userId, model, usage);

      expect(result.canAfford).toBe(false);
      expect(result.balance).toBe(0.1);

      // Check that checkSufficientCredits was called with the correct parameters
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
    });

    it('should handle errors from credit check', async () => {
      const userId = 'test-user-id';
      const model = 'gpt-4';
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      // Mock the dependencies
      (checkSufficientCredits as jest.Mock).mockResolvedValue({
        sufficient: false,
        balance: 0,
        error: new Error('Database error'),
      });

      const result = await canAffordModelUsage(userId, model, usage);

      expect(result.canAfford).toBe(false);
      expect(result.balance).toBe(0);
      expect(result.error).toBeDefined();

      // Check that checkSufficientCredits was called with the correct parameters
      expect(checkSufficientCredits).toHaveBeenCalledWith(userId, model, usage);
    });
  });
});
