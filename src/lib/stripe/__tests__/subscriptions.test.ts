import {
  createSubscription,
  cancelSubscription,
  getUserSubscriptions,
  handleSubscriptionRenewal,
  _stripeClientForTesting,
  _supabaseClientForTesting,
  SubscriptionStatus
} from '../index';

// Mock Stripe client
const mockStripeClient = {
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
};

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockImplementation((table) => {
    return {
      insert: jest.fn().mockReturnValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnValue({
          data: {
            credits_amount: 100,
            recurring_interval: 'month',
            stripe_products: {
              name: 'Test Product',
              description: 'Test Description',
            },
          },
          error: null
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({ error: null })
      }),
      eq: jest.fn().mockReturnThis(),
    };
  }),
  auth: {
    admin: {
      getUserById: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              stripe_customer_id: 'cus_test123',
            },
          },
        },
        error: null,
      }),
      updateUserById: jest.fn().mockResolvedValue({ error: null }),
    },
  },
};

// Mock addCredits function
jest.mock('../../billing/creditDeduction', () => ({
  addCredits: jest.fn().mockResolvedValue({ success: true }),
  CreditTransactionType: {
    ADDITION: 'addition',
    DEDUCTION: 'deduction',
  },
  getSupabaseClient: jest.fn(),
}));

describe('Subscription Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up the testing clients
    _stripeClientForTesting = mockStripeClient as any;
    _supabaseClientForTesting = mockSupabaseClient as any;
  });

  afterEach(() => {
    // Clean up
    _stripeClientForTesting = null;
    _supabaseClientForTesting = null;
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      // Mock Stripe subscription creation
      mockStripeClient.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        status: SubscriptionStatus.ACTIVE,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days later
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: {
                id: 'price_test123',
              },
            },
          ],
        },
      });

      const result = await createSubscription('test-user-id', 'price_test123');

      expect(result.subscriptionId).toBe('sub_test123');
      expect(result.error).toBeUndefined();
      expect(mockStripeClient.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test123',
          items: [{ price: 'price_test123' }],
        })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription at period end', async () => {
      // Mock Stripe subscription update
      mockStripeClient.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        status: SubscriptionStatus.ACTIVE,
        cancel_at_period_end: true,
      });

      const result = await cancelSubscription('test-user-id', 'sub_test123', true);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockStripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        expect.objectContaining({
          cancel_at_period_end: true,
        })
      );
    });

    it('should cancel a subscription immediately', async () => {
      // Mock Stripe subscription cancel
      mockStripeClient.subscriptions.cancel.mockResolvedValue({
        id: 'sub_test123',
        status: SubscriptionStatus.CANCELED,
        cancel_at_period_end: false,
      });

      const result = await cancelSubscription('test-user-id', 'sub_test123', false);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
    });
  });
});
