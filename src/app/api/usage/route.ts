import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { getUsageMetrics } from '@/lib/billing/metrics';

/**
 * GET endpoint to retrieve user's usage statistics and remaining credits
 * 
 * Query parameters:
 * - startDate: Optional start date for filtering usage data (ISO format)
 * - endDate: Optional end date for filtering usage data (ISO format)
 * - page: Optional page number for pagination (default: 1)
 * - limit: Optional limit for pagination (default: 10, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    
    // Parse dates if provided
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    
    // Calculate pagination offset
    const offset = (page - 1) * limit;

    // Get the user session
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's credit balance
    const { data: creditData, error: creditError } = await supabase
      .from('user_credits')
      .select('credits_balance, last_updated')
      .eq('user_id', userId)
      .single();

    if (creditError && creditError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching credit balance:', creditError);
      return NextResponse.json(
        { error: 'Failed to fetch credit balance' },
        { status: 500 }
      );
    }

    // Get total token usage
    let usageQuery = supabase
      .from('usage_logs')
      .select('model, prompt_tokens, completion_tokens, total_tokens, timestamp', { count: 'exact' })
      .eq('user_id', userId);

    // Apply date filters if provided
    if (startDate) {
      usageQuery = usageQuery.gte('timestamp', startDate.toISOString());
    }
    
    if (endDate) {
      usageQuery = usageQuery.lte('timestamp', endDate.toISOString());
    }

    // Get total count first
    const { count: totalCount, error: countError } = await usageQuery;

    if (countError) {
      console.error('Error counting usage logs:', countError);
      return NextResponse.json(
        { error: 'Failed to count usage logs' },
        { status: 500 }
      );
    }

    // Then get paginated data
    const { data: usageData, error: usageError } = await usageQuery
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usageError) {
      console.error('Error fetching usage logs:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage logs' },
        { status: 500 }
      );
    }

    // Get usage metrics
    const { data: metricsData, error: metricsError } = await getUsageMetrics(undefined, userId);

    if (metricsError) {
      console.error('Error fetching usage metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch usage metrics' },
        { status: 500 }
      );
    }

    // Get active subscriptions
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select(`
        id, 
        stripe_subscription_id, 
        status, 
        current_period_start, 
        current_period_end, 
        cancel_at_period_end,
        stripe_prices:stripe_price_id (
          id,
          stripe_price_id,
          unit_amount,
          currency,
          credits_amount,
          stripe_products:stripe_product_id (
            name,
            description
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (subscriptionError) {
      console.error('Error fetching subscriptions:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Calculate total tokens used
    const totalTokensUsed = usageData.reduce((sum, log) => sum + log.total_tokens, 0);
    
    // Group usage by model
    const usageByModel = usageData.reduce((acc: Record<string, any>, log) => {
      if (!acc[log.model]) {
        acc[log.model] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0
        };
      }
      
      acc[log.model].promptTokens += log.prompt_tokens;
      acc[log.model].completionTokens += log.completion_tokens;
      acc[log.model].totalTokens += log.total_tokens;
      acc[log.model].count += 1;
      
      return acc;
    }, {});

    // Format the response
    const response = {
      credits: {
        balance: creditData?.credits_balance || 0,
        lastUpdated: creditData?.last_updated || null
      },
      usage: {
        totalTokensUsed,
        recentLogs: usageData,
        pagination: {
          page,
          limit,
          totalCount: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      },
      metrics: {
        byModel: usageByModel,
        byTool: metricsData || []
      },
      subscription: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0] : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in usage API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
