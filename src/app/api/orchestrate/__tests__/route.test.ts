import { NextRequest } from 'next/server';

// Mock dependencies before importing modules that use them
jest.mock('@/lib/orchestration/orchestrator');
jest.mock('@/lib/orchestration/contextIntegration');
jest.mock('@/lib/tools/registry');
jest.mock('@/lib/memories');
jest.mock('@/lib/supabase');

// Import the modules after mocking
import { orchestrate } from '@/lib/orchestration/orchestrator';
import { combineMemoryWithInstruction } from '@/lib/orchestration/contextIntegration';
import { getToolRegistry } from '@/lib/tools/registry';
import { POST } from '../route';

// Mock Next.js cookies and Supabase client
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
    set: jest.fn(),
  })),
}));

// Mock Supabase client
const mockGetSession = jest.fn();
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));



describe('/api/orchestrate endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    // Mock unauthenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ task: 'Test task' }),
    });

    // Call the endpoint
    const response = await POST(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if request body is invalid', async () => {
    // Mock authenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    });

    // Create request with invalid body (missing task)
    const request = new NextRequest('http://localhost:3000/api/orchestrate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    // Call the endpoint
    const response = await POST(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
    expect(data.details).toBeDefined();
  });

  it('should call orchestrator and return result for valid request', async () => {
    // Mock authenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    });

    // Mock tool registry
    const mockTools = [{ name: 'test-tool', execute: jest.fn() }];
    (getToolRegistry as jest.Mock).mockReturnValue({
      getAllTools: jest.fn().mockResolvedValue(mockTools),
    });

    // Mock memory integration
    (combineMemoryWithInstruction as jest.Mock).mockResolvedValue([
      { role: 'user', content: 'Test task' },
    ]);

    // Mock orchestrator response
    const mockOrchestrationResult = {
      response: 'Task completed successfully',
      toolCalls: [{ toolName: 'test-tool', result: 'test result' }],
    };
    (orchestrate as jest.Mock).mockResolvedValue(mockOrchestrationResult);

    // Create request
    const request = new NextRequest('http://localhost:3000/api/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        task: 'Test task',
        additionalContext: 'Some context',
        maxRetries: 3
      }),
    });

    // Call the endpoint
    const response = await POST(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toEqual(mockOrchestrationResult);

    // Verify orchestrator was called with correct parameters
    expect(orchestrate).toHaveBeenCalledWith({
      instruction: 'Test task',
      context: {
        userId: 'test-user-id',
        memory: [{ role: 'user', content: 'Test task' }],
        additionalContext: 'Some context',
      },
      tools: mockTools,
      maxRetries: 3,
    });
  });

  it('should handle errors and return 500', async () => {
    // Mock authenticated session
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    });

    // Mock tool registry to throw error
    (getToolRegistry as jest.Mock).mockReturnValue({
      getAllTools: jest.fn().mockRejectedValue(new Error('Test error')),
    });

    // Create request
    const request = new NextRequest('http://localhost:3000/api/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ task: 'Test task' }),
    });

    // Call the endpoint
    const response = await POST(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Test error');
  });
});
