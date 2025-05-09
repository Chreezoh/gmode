import { combineMemoryWithInstruction, createOrchestrationPrompt } from '../orchestration/contextIntegration';
import { getRecentMessages } from '../memories';
import { Message } from '../orchestration/types';

// Mock the getRecentMessages function
jest.mock('../memories', () => ({
  getRecentMessages: jest.fn(),
}));

describe('Context Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('combineMemoryWithInstruction', () => {
    it('should combine memory with a new instruction', async () => {
      // Mock data
      const userId = 'test-user';
      const newInstruction = 'What is the capital of France?';
      const mockMessages = [
        {
          id: '1',
          user_id: userId,
          role: 'user',
          content: 'Hello',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: userId,
          role: 'assistant',
          content: 'Hi there! How can I help you?',
          created_at: '2023-01-01T00:00:01Z',
        },
        {
          id: '3',
          user_id: userId,
          role: 'user',
          content: 'I have a question about geography.',
          created_at: '2023-01-01T00:00:02Z',
        },
        {
          id: '4',
          user_id: userId,
          role: 'assistant',
          content: 'Sure, I can help with geography questions. What would you like to know?',
          created_at: '2023-01-01T00:00:03Z',
        },
      ];

      // Mock the getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      // Call the function
      const result = await combineMemoryWithInstruction(userId, newInstruction);

      // Check that getRecentMessages was called with the correct parameters
      expect(getRecentMessages).toHaveBeenCalledWith(userId, 5);

      // Check the result
      expect(result).toHaveLength(5); // 4 memory messages + 1 new instruction
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
      expect(result[4].role).toBe('user');
      expect(result[4].content).toBe(newInstruction);
    });

    it('should handle errors when fetching memory', async () => {
      // Mock data
      const userId = 'test-user';
      const newInstruction = 'What is the capital of France?';

      // Mock the getRecentMessages function to return an error
      (getRecentMessages as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      // Call the function
      const result = await combineMemoryWithInstruction(userId, newInstruction);

      // Check that getRecentMessages was called
      expect(getRecentMessages).toHaveBeenCalled();

      // Check the result - should just include the new instruction
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe(newInstruction);
    });

    it('should trim memory to fit within token limit', async () => {
      // Mock data
      const userId = 'test-user';
      const newInstruction = 'What is the capital of France?';
      
      // Create a very long message that would exceed token limits
      const longContent = 'A'.repeat(100000); // This should be long enough to trigger trimming
      
      const mockMessages = [
        {
          id: '1',
          user_id: userId,
          role: 'user',
          content: longContent,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: userId,
          role: 'assistant',
          content: 'Hi there! How can I help you?',
          created_at: '2023-01-01T00:00:01Z',
        },
      ];

      // Mock the getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      // Call the function with a small token limit
      const result = await combineMemoryWithInstruction(userId, newInstruction, 5, 1000);

      // Check the result - should not include the long message
      expect(result.length).toBeLessThan(3);
      
      // The last message should always be the new instruction
      expect(result[result.length - 1].role).toBe('user');
      expect(result[result.length - 1].content).toBe(newInstruction);
    });
  });

  describe('createOrchestrationPrompt', () => {
    it('should create a complete prompt with system message', async () => {
      // Mock data
      const userId = 'test-user';
      const newInstruction = 'What is the capital of France?';
      const systemMessage = 'You are a helpful assistant.';
      const mockMessages = [
        {
          id: '1',
          user_id: userId,
          role: 'user',
          content: 'Hello',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: userId,
          role: 'assistant',
          content: 'Hi there! How can I help you?',
          created_at: '2023-01-01T00:00:01Z',
        },
      ];

      // Mock the getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      // Call the function
      const result = await createOrchestrationPrompt(userId, newInstruction, systemMessage);

      // Check the result
      expect(result).toHaveLength(4); // 1 system + 2 memory + 1 new instruction
      expect(result[0].role).toBe('system');
      expect(result[0].content).toBe(systemMessage);
      expect(result[3].role).toBe('user');
      expect(result[3].content).toBe(newInstruction);
    });

    it('should create a prompt without system message if not provided', async () => {
      // Mock data
      const userId = 'test-user';
      const newInstruction = 'What is the capital of France?';
      const mockMessages = [
        {
          id: '1',
          user_id: userId,
          role: 'user',
          content: 'Hello',
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      // Mock the getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValue({
        data: mockMessages,
        error: null,
      });

      // Call the function without a system message
      const result = await createOrchestrationPrompt(userId, newInstruction);

      // Check the result
      expect(result).toHaveLength(2); // 1 memory + 1 new instruction
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
      expect(result[1].role).toBe('user');
      expect(result[1].content).toBe(newInstruction);
    });
  });
});
