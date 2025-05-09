import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { estimateToolCost, estimateModelCost } from '@/lib/billing/costEstimator';

/**
 * GET endpoint to estimate the cost of a tool or model usage
 * 
 * Query parameters:
 * - tool: The name of the tool to estimate (optional if model is provided)
 * - model: The model to use for cost calculation (defaults to gpt-3.5-turbo)
 * - contextLength: The estimated context length in tokens (for direct model calls)
 * - completionLength: The estimated completion length in tokens (for direct model calls)
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const toolName = searchParams.get('tool');
    const model = searchParams.get('model') || 'gpt-3.5-turbo';
    const contextLength = parseInt(searchParams.get('contextLength') || '1000', 10);
    const completionLength = parseInt(searchParams.get('completionLength') || '300', 10);

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
    const userId = session?.user?.id;

    // If a tool name is provided, estimate the cost for that tool
    if (toolName) {
      const estimate = await estimateToolCost(toolName, userId, model);
      
      return NextResponse.json({
        toolName: estimate.toolName,
        model: estimate.model,
        estimatedTokens: estimate.estimatedUsage.totalTokens,
        promptTokens: estimate.estimatedUsage.promptTokens,
        completionTokens: estimate.estimatedUsage.completionTokens,
        estimatedCost: estimate.estimatedCost,
        isBasedOnMetrics: estimate.isBasedOnMetrics,
      });
    } 
    // Otherwise, estimate the cost for a direct model call
    else {
      const estimate = estimateModelCost(model, contextLength, completionLength);
      
      return NextResponse.json({
        model: estimate.model,
        estimatedTokens: estimate.estimatedUsage.totalTokens,
        promptTokens: estimate.estimatedUsage.promptTokens,
        completionTokens: estimate.estimatedUsage.completionTokens,
        estimatedCost: estimate.estimatedCost,
        contextLength,
        completionLength,
      });
    }
  } catch (error) {
    console.error('Error in cost estimate API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to estimate the cost of a tool or model usage
 * 
 * Request body:
 * - tool: The name of the tool to estimate (optional if model is provided)
 * - model: The model to use for cost calculation (defaults to gpt-3.5-turbo)
 * - contextLength: The estimated context length in tokens (for direct model calls)
 * - completionLength: The estimated completion length in tokens (for direct model calls)
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { tool: toolName, model = 'gpt-3.5-turbo', contextLength = 1000, completionLength = 300 } = body;

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
    const userId = session?.user?.id;

    // If a tool name is provided, estimate the cost for that tool
    if (toolName) {
      const estimate = await estimateToolCost(toolName, userId, model);
      
      return NextResponse.json({
        toolName: estimate.toolName,
        model: estimate.model,
        estimatedTokens: estimate.estimatedUsage.totalTokens,
        promptTokens: estimate.estimatedUsage.promptTokens,
        completionTokens: estimate.estimatedUsage.completionTokens,
        estimatedCost: estimate.estimatedCost,
        isBasedOnMetrics: estimate.isBasedOnMetrics,
      });
    } 
    // Otherwise, estimate the cost for a direct model call
    else {
      const estimate = estimateModelCost(model, contextLength, completionLength);
      
      return NextResponse.json({
        model: estimate.model,
        estimatedTokens: estimate.estimatedUsage.totalTokens,
        promptTokens: estimate.estimatedUsage.promptTokens,
        completionTokens: estimate.estimatedUsage.completionTokens,
        estimatedCost: estimate.estimatedCost,
        contextLength,
        completionLength,
      });
    }
  } catch (error) {
    console.error('Error in cost estimate API route:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
