// Mock Supabase client for testing
export const supabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  },
};

// Mock authentication functions
export const signInWithEmail = jest.fn();
export const signUpWithEmail = jest.fn();
export const signOut = jest.fn();
export const getCurrentSession = jest.fn();
export const resetPassword = jest.fn();
