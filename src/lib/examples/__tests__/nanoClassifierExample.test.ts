import { classifySentiment, classifyUrgency, categorizeMessage } from '../nanoClassifierExample';
import * as nanoClassifier from '../../orchestration/nanoClassifier';

// Mock the nanoClassifier module
jest.mock('../../orchestration/nanoClassifier');

describe('nanoClassifierExample', () => {
  // Mock console.log and console.error
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.resetAllMocks();
  });

  describe('classifySentiment', () => {
    it('should classify sentiment correctly', async () => {
      // Mock the classifyText function
      const mockClassifyText = nanoClassifier.classifyText as jest.Mock;
      mockClassifyText.mockResolvedValue({
        label: 'Positive',
        usage: {
          promptTokens: 20,
          completionTokens: 1,
          totalTokens: 21,
        },
      });

      // Call the function
      const result = await classifySentiment('I love this product!');

      // Check the result
      expect(result).toBe('Positive');
      expect(console.log).toHaveBeenCalledWith('Token usage:', {
        promptTokens: 20,
        completionTokens: 1,
        totalTokens: 21,
      });
    });

    it('should handle errors and return Neutral', async () => {
      // Mock the classifyText function to throw an error
      const mockClassifyText = nanoClassifier.classifyText as jest.Mock;
      mockClassifyText.mockRejectedValue(new Error('API error'));

      // Call the function
      const result = await classifySentiment('I love this product!');

      // Check the result
      expect(result).toBe('Neutral');
      expect(console.error).toHaveBeenCalledWith(
        'Sentiment classification error:',
        expect.any(Error)
      );
    });
  });

  describe('classifyUrgency', () => {
    it('should classify urgency correctly', async () => {
      // Mock the classifyWithFunctionCalling function
      const mockClassifyWithFunctionCalling = nanoClassifier.classifyWithFunctionCalling as jest.Mock;
      mockClassifyWithFunctionCalling.mockResolvedValue({
        label: 'Urgent',
        usage: {
          promptTokens: 25,
          completionTokens: 10,
          totalTokens: 35,
        },
      });

      // Call the function
      const result = await classifyUrgency('URGENT: System down!');

      // Check the result
      expect(result).toBe('Urgent');
      expect(console.log).toHaveBeenCalledWith('Token usage:', {
        promptTokens: 25,
        completionTokens: 10,
        totalTokens: 35,
      });
    });

    it('should handle errors and return Normal', async () => {
      // Mock the classifyWithFunctionCalling function to throw an error
      const mockClassifyWithFunctionCalling = nanoClassifier.classifyWithFunctionCalling as jest.Mock;
      mockClassifyWithFunctionCalling.mockRejectedValue(new Error('API error'));

      // Call the function
      const result = await classifyUrgency('URGENT: System down!');

      // Check the result
      expect(result).toBe('Normal');
      expect(console.error).toHaveBeenCalledWith(
        'Urgency classification error:',
        expect.any(Error)
      );
    });
  });

  describe('categorizeMessage', () => {
    it('should categorize messages correctly', async () => {
      // Mock the classifyText function
      const mockClassifyText = nanoClassifier.classifyText as jest.Mock;
      mockClassifyText.mockResolvedValue({
        label: 'Bug Report',
        usage: {
          promptTokens: 30,
          completionTokens: 2,
          totalTokens: 32,
        },
      });

      // Call the function
      const result = await categorizeMessage('I found a bug in the application.');

      // Check the result
      expect(result).toBe('Bug Report');
      expect(console.log).toHaveBeenCalledWith('Token usage:', {
        promptTokens: 30,
        completionTokens: 2,
        totalTokens: 32,
      });
    });

    it('should handle errors and return Other', async () => {
      // Mock the classifyText function to throw an error
      const mockClassifyText = nanoClassifier.classifyText as jest.Mock;
      mockClassifyText.mockRejectedValue(new Error('API error'));

      // Call the function
      const result = await categorizeMessage('I found a bug in the application.');

      // Check the result
      expect(result).toBe('Other');
      expect(console.error).toHaveBeenCalledWith(
        'Message categorization error:',
        expect.any(Error)
      );
    });
  });
});