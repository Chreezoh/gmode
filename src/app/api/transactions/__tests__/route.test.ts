import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
    set: jest.fn(),
  })),
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
    from: jest.fn().mockImplementation((table) => {
      if (table === 'credit_ledger') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'tx-1',
                user_id: 'test-user-id',
                amount: 10.00,
                balance_after: 110.50,
                description: 'Initial credits for new user',
                transaction_type: 'addition',
                created_at: '2023-01-01T00:00:00Z',
              },
              {
                id: 'tx-2',
                user_id: 'test-user-id',
                amount: -0.50,
                balance_after: 110.00,
                description: 'Token usage: gpt-3.5-turbo (500 tokens)',
                transaction_type: 'deduction',
                created_at: '2023-01-02T00:00:00Z',
              },
            ],
            error: null,
            count: 2,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
    }),
  })),
}));

describe('/api/transactions endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return transaction history for authenticated user', async () => {
    // Create request
    const request = new NextRequest('http://localhost:3000/api/transactions');

    // Call the endpoint
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('pagination');
    expect(data.transactions).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      totalCount: 2,
      totalPages: 1
    });
  });
});
