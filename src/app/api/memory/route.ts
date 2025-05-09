import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { Database } from '@/lib/types/database.types';
import { getRecentMessages, saveMessage } from '@/lib/memories';

// Define the request schema for POST requests using Zod
const MemoryRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  role: z.enum(['user', 'assistant', 'system']),
});

/**
 * GET /api/memory
 * 
 * Retrieves the most recent memory entries for the authenticated user.
 * 
 * Query parameters:
 * - limit: Optional number of entries to retrieve (default: 10, max: 50)
 * 
 * Response:
 * - Array of memory entries
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    
    // Parse and validate the limit parameter
    const limit = limitParam 
      ? Math.min(parseInt(limitParam, 10), 50) // Cap at 50 entries
      : 10; // Default to 10 entries

    // Get the user session from Supabase
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

    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get the recent messages for the user
    const { data, error } = await getRecentMessages(userId, limit);

    if (error) {
      console.error('Error fetching memory entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memory entries' },
        { status: 500 }
      );
    }

    // Return the memory entries
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in memory API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory
 * 
 * Adds a new memory entry for the authenticated user.
 * 
 * Request body:
 * - content: The content of the memory entry
 * - role: The role of the sender ('user', 'assistant', or 'system')
 * 
 * Response:
 * - The newly created memory entry
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = MemoryRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { content, role } = validationResult.data;

    // Get the user session from Supabase
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

    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Save the new message
    const { data, error } = await saveMessage({
      user_id: userId,
      role,
      content,
    });

    if (error) {
      console.error('Error saving memory entry:', error);
      return NextResponse.json(
        { error: 'Failed to save memory entry' },
        { status: 500 }
      );
    }

    // Return the newly created memory entry
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in memory API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
