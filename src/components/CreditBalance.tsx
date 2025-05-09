'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';

export default function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    async function fetchBalance() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('You must be logged in to view your credit balance');
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_credits')
          .select('credits_balance')
          .eq('user_id', session.user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        setBalance(data?.credits_balance || 0);
      } catch (err) {
        console.error('Error fetching credit balance:', err);
        setError('Failed to load credit balance');
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [supabase]);

  if (loading) {
    return <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>;
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="font-medium text-gray-700">Credit Balance:</span>
      <span className="font-bold text-blue-600">{balance?.toFixed(2)}</span>
    </div>
  );
}
