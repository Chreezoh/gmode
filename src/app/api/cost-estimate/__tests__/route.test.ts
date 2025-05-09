import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock the cost estimator functions
jest.mock('@/lib/billing/costEstimator', () => ({
  estimateToolCost: jest.fn().mockResolvedValue({
    estimatedUsage: {
      promptTokens: 700,
      completionTokens: 300,
      totalTokens: 1000,
    },
    estimatedCost: 0.0025,
    isBasedOnMetrics: true,
    toolName: 'test_tool',
    model: 'gpt-3.5-turbo',
  }),
  estimateModelCost: jest.fn().mockReturnValue({
    estimatedUsage: {
      promptTokens: 1000,
      completionTokens: 300,
      totalTokens: 1300,
    },
    estimatedCost: 0.0035,
    isBasedOnMetrics: false,
    toolName: 'direct_model_call',
    model: 'gpt-3.5-turbo',
  }),
}));

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
            },
          },
        },
      }),
    },
  })),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('Cost Estimate API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET endpoint', () => {
    it('should return tool cost estimate when tool parameter is provided', async () => {
      // Create a mock request with tool parameter
      const request = new NextRequest('http://localhost:3000/api/cost-estimate?tool=test_tool');

      // Call the GET handler
      const response = await GET(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(200);
      expect(data).toEqual({
        toolName: 'test_tool',
        model: 'gpt-3.5-turbo',
        estimatedTokens: 1000,
        promptTokens: 700,
        completionTokens: 300,
        estimatedCost: 0.0025,
        isBasedOnMetrics: true,
      });
    });

    it('should return model cost estimate when no tool parameter is provided', async () => {
      // Create a mock request with model parameter
      const request = new NextRequest('http://localhost:3000/api/cost-estimate?model=gpt-4&contextLength=2000&completionLength=500');

      // Call the GET handler
      const response = await GET(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(200);
      expect(data).toEqual({
        model: 'gpt-3.5-turbo',
        estimatedTokens: 1300,
        promptTokens: 1000,
        completionTokens: 300,
        estimatedCost: 0.0035,
        contextLength: 2000,
        completionLength: 500,
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock the estimateToolCost function to throw an error
      const { estimateToolCost } = require('@/lib/billing/costEstimator');
      (estimateToolCost as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/cost-estimate?tool=error_tool');

      // Call the GET handler
      const response = await GET(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Test error',
      });
    });
  });

  describe('POST endpoint', () => {
    it('should return tool cost estimate when tool parameter is provided', async () => {
      // Create a mock request with tool parameter
      const request = new NextRequest('http://localhost:3000/api/cost-estimate', {
        method: 'POST',
        body: JSON.stringify({
          tool: 'test_tool',
          model: 'gpt-4',
        }),
      });

      // Call the POST handler
      const response = await POST(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(200);
      expect(data).toEqual({
        toolName: 'test_tool',
        model: 'gpt-3.5-turbo',
        estimatedTokens: 1000,
        promptTokens: 700,
        completionTokens: 300,
        estimatedCost: 0.0025,
        isBasedOnMetrics: true,
      });
    });

    it('should return model cost estimate when no tool parameter is provided', async () => {
      // Create a mock request with model parameter
      const request = new NextRequest('http://localhost:3000/api/cost-estimate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          contextLength: 2000,
          completionLength: 500,
        }),
      });

      // Call the POST handler
      const response = await POST(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(200);
      expect(data).toEqual({
        model: 'gpt-3.5-turbo',
        estimatedTokens: 1300,
        promptTokens: 1000,
        completionTokens: 300,
        estimatedCost: 0.0035,
        contextLength: 2000,
        completionLength: 500,
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock the estimateToolCost function to throw an error
      const { estimateToolCost } = require('@/lib/billing/costEstimator');
      (estimateToolCost as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/cost-estimate', {
        method: 'POST',
        body: JSON.stringify({
          tool: 'error_tool',
        }),
      });

      // Call the POST handler
      const response = await POST(request);
      const data = await response.json();

      // Check the response
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Test error',
      });
    });
  });
});
