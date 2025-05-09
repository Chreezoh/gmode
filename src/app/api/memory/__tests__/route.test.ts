import { NextRequest } from 'next/server';

// Mock dependencies before importing modules that use them
jest.mock('@/lib/memories');
jest.mock('@/lib/supabase');

// Import the modules after mocking
import { getRecentMessages, saveMessage } from '@/lib/memories';
import { GET, POST } from '../route';

// Mock Next.js cookies
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

describe('/api/memory endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/memory', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory');

      // Call the endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return memory entries for authenticated user', async () => {
      // Mock authenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      // Mock memory entries
      const mockMemoryEntries = [
        {
          id: '1',
          user_id: 'test-user-id',
          role: 'user',
          content: 'Hello',
          created_at: '2023-05-01T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'test-user-id',
          role: 'assistant',
          content: 'Hi there!',
          created_at: '2023-05-01T10:01:00Z',
        },
      ];

      // Mock getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValueOnce({
        data: mockMemoryEntries,
        error: null,
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory');

      // Call the endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data).toEqual(mockMemoryEntries);
      expect(getRecentMessages).toHaveBeenCalledWith('test-user-id', 10);
    });

    it('should respect the limit parameter', async () => {
      // Mock authenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      // Mock memory entries
      const mockMemoryEntries = [
        {
          id: '1',
          user_id: 'test-user-id',
          role: 'user',
          content: 'Hello',
          created_at: '2023-05-01T10:00:00Z',
        },
      ];

      // Mock getRecentMessages function
      (getRecentMessages as jest.Mock).mockResolvedValueOnce({
        data: mockMemoryEntries,
        error: null,
      });

      // Create request with limit parameter
      const request = new NextRequest('http://localhost:3000/api/memory?limit=5');

      // Call the endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data).toEqual(mockMemoryEntries);
      expect(getRecentMessages).toHaveBeenCalledWith('test-user-id', 5);
    });

    it('should handle errors from getRecentMessages', async () => {
      // Mock authenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      // Mock getRecentMessages function to return an error
      (getRecentMessages as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory');

      // Call the endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch memory entries' });
    });
  });

  describe('POST /api/memory', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test message',
          role: 'user',
        }),
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

      // Create request with invalid body (missing content)
      const request = new NextRequest('http://localhost:3000/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
        }),
      });

      // Call the endpoint
      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.details).toBeDefined();
    });

    it('should save memory entry for authenticated user', async () => {
      // Mock authenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      // Mock memory entry
      const mockMemoryEntry = {
        id: '1',
        user_id: 'test-user-id',
        role: 'user',
        content: 'Test message',
        created_at: '2023-05-01T10:00:00Z',
      };

      // Mock saveMessage function
      (saveMessage as jest.Mock).mockResolvedValueOnce({
        data: mockMemoryEntry,
        error: null,
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test message',
          role: 'user',
        }),
      });

      // Call the endpoint
      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data).toEqual(mockMemoryEntry);
      expect(saveMessage).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        role: 'user',
        content: 'Test message',
      });
    });

    it('should handle errors from saveMessage', async () => {
      // Mock authenticated session
      mockGetSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      // Mock saveMessage function to return an error
      (saveMessage as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test message',
          role: 'user',
        }),
      });

      // Call the endpoint
      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to save memory entry' });
    });
  });
});
