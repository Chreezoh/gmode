/**
 * Authentication middleware
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { AuthError } from '@/lib/utils/error';
import { logger } from '@/lib/utils/logger';

/**
 * Get the authenticated user from the request
 * @param req Next.js request
 * @returns User ID and session
 * @throws AuthError if not authenticated
 */
export async function getAuthenticatedUser(req: NextRequest) {
  try {
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
      throw new AuthError('Unauthorized');
    }

    return { userId: session.user.id, session };
  } catch (error) {
    logger.error('Authentication error', { error });
    throw new AuthError('Unauthorized');
  }
}

/**
 * Middleware to require authentication
 * @param handler API route handler
 * @returns Handler with authentication
 */
export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const { userId } = await getAuthenticatedUser(req);
      return await handler(req, userId);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }
      
      logger.error('Error in auth middleware', { error });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
