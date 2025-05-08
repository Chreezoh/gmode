'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-6">
          <div className="rounded-md bg-gray-100 p-4 border border-gray-300">
            <h2 className="text-lg font-medium text-gray-900">User Information</h2>
            <div className="mt-2 space-y-2">
              <p className="text-gray-900">
                <span className="font-medium text-black">Email:</span> {user.email}
              </p>
              <p className="text-gray-900">
                <span className="font-medium text-black">User ID:</span> {user.id}
              </p>
              <p className="text-gray-900">
                <span className="font-medium text-black">Last Sign In:</span>{' '}
                {new Date(user.last_sign_in_at || '').toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900">Welcome to Your Dashboard</h2>
          <p className="mt-2 text-gray-900">
            This is a protected page that only authenticated users can access. You have successfully
            signed in using Supabase authentication.
          </p>
        </div>
      </div>
    </div>
  );
}