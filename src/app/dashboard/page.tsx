'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CreditBalance from '@/components/CreditBalance';
import CreditPackages from '@/components/CreditPackages';
import UsageDashboard from '@/components/UsageDashboard';

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }

    // Check for payment status in URL
    const payment = searchParams.get('payment');
    if (payment) {
      setPaymentStatus(payment);
    }
  }, [user, isLoading, router, searchParams]);

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="mt-2">
              <CreditBalance />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>

        {paymentStatus && (
          <div className={`mt-4 p-4 rounded-md ${paymentStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {paymentStatus === 'success' ? (
              <p>Payment successful! Your credits have been added to your account.</p>
            ) : (
              <p>Payment was canceled. No charges were made.</p>
            )}
          </div>
        )}

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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Dashboard</h2>
          <UsageDashboard />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase Credits</h2>
          <CreditPackages />
        </div>
      </div>
    </div>
  );
}