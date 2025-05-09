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
const mockGetSession = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
  })),
}));

describe('/api/credits endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up the mock chain
    mockFrom.mockImplementation((table) => {
      if (table === 'user_credits') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          single: mockSingle,
        };
      } else if (table === 'user_subscriptions') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          order: mockOrder.mockReturnThis(),
          limit: mockLimit.mockReturnValue({
            data: [
              {
                id: 'sub-123',
                user_id: 'test-user-id',
                stripe_subscription_id: 'sub_123',
                status: 'active',
                plan_name: 'Pro',
                current_period_start: '2023-01-01T00:00:00Z',
                current_period_end: '2023-02-01T00:00:00Z',
                created_at: '2023-01-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        };
      }
      return {
        select: mockSelect.mockReturnThis(),
        eq: mockEq.mockReturnThis(),
      };
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    // Mock unauthenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/credits');

    // Call the endpoint
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return credit balance and subscription for authenticated user', async () => {
    // Mock authenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { 
        session: { 
          user: { 
            id: 'test-user-id' 
          } 
        } 
      },
      error: null,
    });

    // Mock credit data
    mockSingle.mockResolvedValueOnce({
      data: {
        credits_balance: 100.50,
        last_updated: '2023-05-01T12:00:00Z',
      },
      error: null,
    });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/credits');

    // Call the endpoint
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('credits');
    expect(data).toHaveProperty('subscription');
    expect(data.credits.balance).toBe(100.50);
    expect(data.credits.lastUpdated).toBe('2023-05-01T12:00:00Z');
    expect(data.subscription).toHaveProperty('plan_name', 'Pro');
  });

  it('should handle database errors gracefully', async () => {
    // Mock authenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { 
        session: { 
          user: { 
            id: 'test-user-id' 
          } 
        } 
      },
      error: null,
    });

    // Mock credit data error
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Database error',
        code: 'INTERNAL_ERROR'
      },
    });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/credits');

    // Call the endpoint
    const response = await GET(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to fetch credit balance');
  });
});
