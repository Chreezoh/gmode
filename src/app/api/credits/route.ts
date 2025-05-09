import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';

/**
 * GET endpoint to retrieve user's current credit balance and subscription tier
 * 
 * Returns:
 * - credits: Current credit balance and last update time
 * - subscription: Current subscription information (if any)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get user's subscription information
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptionError) {
      console.error('Error fetching subscription data:', subscriptionError);
      // Continue without subscription data
    }

    // Format the response
    const response = {
      credits: {
        balance: creditData?.credits_balance || 0,
        lastUpdated: creditData?.last_updated || null
      },
      subscription: subscriptionData && subscriptionData.length > 0 ? subscriptionData[0] : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in credits API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
