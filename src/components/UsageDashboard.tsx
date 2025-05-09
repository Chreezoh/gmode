'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface UsageStats {
  credits: {
    balance: number;
    lastUpdated: string | null;
  };
  usage: {
    totalTokensUsed: number;
    recentLogs: Array<{
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      timestamp: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
  metrics: {
    byModel: Record<string, {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    }>;
    byTool: Array<{
      tool_name: string;
      avg_tokens: number;
      total_tokens: number;
      count: number;
      user_id: string | null;
      model: string | null;
      last_updated: string;
    }>;
  };
  subscription: {
    id: string;
    stripe_subscription_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    stripe_prices: {
      id: string;
      stripe_price_id: string;
      unit_amount: number;
      currency: string;
      credits_amount: number;
      stripe_products: {
        name: string;
        description: string;
      };
    };
  } | null;
}

export default function UsageDashboard() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchUsageStats() {
      if (!user) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/usage?page=${currentPage}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching usage stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        setUsageStats(data);
      } catch (err) {
        console.error('Error fetching usage stats:', err);
        setError('Failed to load usage statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchUsageStats();
  }, [user, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!usageStats) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-gray-500">No usage data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credits Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Balance</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-blue-600">{usageStats.credits.balance.toFixed(2)}</span>
            <span className="ml-2 text-gray-500">credits remaining</span>
          </div>
          {usageStats.credits.lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {new Date(usageStats.credits.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Usage Summary Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">Total Tokens Used</div>
            <div className="text-2xl font-semibold">{usageStats.usage.totalTokensUsed.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">Models Used</div>
            <div className="text-2xl font-semibold">{Object.keys(usageStats.metrics.byModel).length}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">Tools Used</div>
            <div className="text-2xl font-semibold">{usageStats.metrics.byTool.length}</div>
          </div>
        </div>
      </div>

      {/* Usage by Model Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by Model</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(usageStats.metrics.byModel).map(([model, stats]) => (
                <tr key={model}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.promptTokens.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.completionTokens.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.totalTokens.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Usage Logs Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Usage</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageStats.usage.recentLogs.map((log, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.total_tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {usageStats.usage.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Page {usageStats.usage.pagination.page} of {usageStats.usage.pagination.totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(usageStats.usage.pagination.totalPages, currentPage + 1))}
                disabled={currentPage === usageStats.usage.pagination.totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === usageStats.usage.pagination.totalPages 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Section */}
      {usageStats.subscription && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Plan:</span>
              <span>{usageStats.subscription.stripe_prices.stripe_products.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Status:</span>
              <span className="capitalize">{usageStats.subscription.status}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Current Period:</span>
              <span>
                {new Date(usageStats.subscription.current_period_start).toLocaleDateString()} to {new Date(usageStats.subscription.current_period_end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Auto Renew:</span>
              <span>{usageStats.subscription.cancel_at_period_end ? 'No' : 'Yes'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Credits per Period:</span>
              <span>{usageStats.subscription.stripe_prices.credits_amount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
