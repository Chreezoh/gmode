import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the Supabase client
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
    from: jest.fn().mockImplementation((table) => {
      if (table === 'user_credits') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              credits_balance: 100.50,
              last_updated: '2023-05-01T12:00:00Z',
            },
            error: null,
          }),
        };
      } else if (table === 'usage_logs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [
              {
                model: 'gpt-4',
                prompt_tokens: 500,
                completion_tokens: 200,
                total_tokens: 700,
                timestamp: '2023-05-01T10:00:00Z',
              },
              {
                model: 'gpt-3.5-turbo',
                prompt_tokens: 300,
                completion_tokens: 100,
                total_tokens: 400,
                timestamp: '2023-05-01T09:00:00Z',
              },
            ],
            error: null,
          }),
          count: jest.fn().mockResolvedValue({
            count: 2,
            error: null,
          }),
        };
      } else if (table === 'stripe_subscriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'sub-id',
                stripe_subscription_id: 'stripe-sub-id',
                status: 'active',
                current_period_start: '2023-05-01T00:00:00Z',
                current_period_end: '2023-06-01T00:00:00Z',
                cancel_at_period_end: false,
                stripe_prices: {
                  id: 'price-id',
                  stripe_price_id: 'stripe-price-id',
                  unit_amount: 1000,
                  currency: 'usd',
                  credits_amount: 50,
                  stripe_products: {
                    name: 'Monthly Subscription',
                    description: 'Monthly subscription with 50 credits',
                  },
                },
              },
            ],
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
    }),
  })),
}));

// Mock the metrics function
jest.mock('@/lib/billing/metrics', () => ({
  getUsageMetrics: jest.fn().mockResolvedValue({
    data: [
      {
        tool_name: 'web-search',
        avg_tokens: 450,
        total_tokens: 4500,
        count: 10,
        user_id: 'test-user-id',
        model: 'gpt-4',
        last_updated: '2023-05-01T12:00:00Z',
      },
      {
        tool_name: 'calculator',
        avg_tokens: 200,
        total_tokens: 1000,
        count: 5,
        user_id: 'test-user-id',
        model: 'gpt-3.5-turbo',
        last_updated: '2023-05-01T12:00:00Z',
      },
    ],
    error: null,
  }),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('Usage API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return usage statistics for authenticated user', async () => {
    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/usage');

    // Call the GET handler
    const response = await GET(request);
    const data = await response.json();

    // Check the response
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('credits');
    expect(data).toHaveProperty('usage');
    expect(data).toHaveProperty('metrics');
    expect(data.credits.balance).toBe(100.50);
    expect(data.usage.totalTokensUsed).toBe(1100); // 700 + 400
    expect(data.usage.recentLogs).toHaveLength(2);
    expect(data.metrics.byTool).toHaveLength(2);
  });

  // Add more tests as needed
});
