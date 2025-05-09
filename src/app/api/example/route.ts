/**
 * Example API Route with Logging and Error Handling
 * 
 * This route demonstrates the use of the logging and error handling middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLoggingAndErrorHandling } from '@/lib/middleware/error-middleware';
import { ValidationError } from '@/lib/utils/error';
import { z } from 'zod';

// Define request schema
const requestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  message: z.string().optional(),
});

/**
 * Handler for the example API route
 * @param req Next.js request
 * @returns Next.js response
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }
  
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.format());
    }
    
    // Process the validated data
    const { name, email, message } = result.data;
    
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        name,
        email,
        message: message || 'No message provided',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Let the error middleware handle the error
    throw error;
  }
}

// Export the handler with logging and error handling middleware
export const POST = withLoggingAndErrorHandling(handler);
