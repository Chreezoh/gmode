import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';

/**
 * GET endpoint to retrieve user's transaction history
 *
 * Query parameters:
 * - startDate: Optional start date for filtering transactions (ISO format)
 * - endDate: Optional end date for filtering transactions (ISO format)
 * - page: Optional page number for pagination (default: 1)
 * - limit: Optional limit for pagination (default: 10, max: 100)
 * - type: Optional transaction type filter (addition, deduction, refund, adjustment)
 *
 * Returns:
 * - transactions: Array of transaction records
 * - pagination: Pagination information
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const typeParam = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
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

    // Build the base query
    let query = supabase
      .from('credit_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply date filters if provided
    if (startDateParam) {
      query = query.gte('created_at', startDateParam);
    }

    if (endDateParam) {
      query = query.lte('created_at', endDateParam);
    }

    // Apply transaction type filter if provided
    if (typeParam) {
      query = query.eq('transaction_type', typeParam);
    }

    // Apply sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute the query
    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Format the response
    const response = {
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in transactions API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
