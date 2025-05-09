import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { Database } from '@/lib/types/database.types';
import { orchestrate } from '@/lib/orchestration/orchestrator';
import { combineMemoryWithInstruction } from '@/lib/orchestration/contextIntegration';
import { getToolRegistry } from '@/lib/tools/registry';

// Define the request schema using Zod
const OrchestrationRequestSchema = z.object({
  task: z.string().min(1, 'Task is required'),
  additionalContext: z.string().optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
});

/**
 * POST /api/orchestrate
 * 
 * Endpoint to send tasks to the God-Mode agent for processing.
 * 
 * Request body:
 * - task: The task to be processed by the orchestrator
 * - additionalContext: Optional additional context to include
 * - maxRetries: Optional maximum number of retries for failed tool calls (default: 2)
 * 
 * Response:
 * - response: The final response from the orchestrator
 * - toolCalls: Array of tool calls that were made
 * - errors: Any errors that occurred during orchestration
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = OrchestrationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { task, additionalContext, maxRetries } = validationResult.data;

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

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get available tools from the registry
    const toolRegistry = getToolRegistry();
    const availableTools = await toolRegistry.getAllTools(userId);

    // Combine the task with user's conversation memory
    const messages = await combineMemoryWithInstruction(userId, task);

    // Call the orchestrator
    const result = await orchestrate({
      instruction: task,
      context: {
        userId,
        memory: messages,
        additionalContext,
      },
      tools: availableTools,
      maxRetries: maxRetries ?? 2,
    });

    // Return the orchestration result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in orchestrate API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
