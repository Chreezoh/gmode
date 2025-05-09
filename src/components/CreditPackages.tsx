'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
}

export default function CreditPackages() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchPackages() {
      try {
        const response = await fetch('/api/stripe/packages');
        
        if (!response.ok) {
          throw new Error('Failed to fetch credit packages');
        }
        
        const data = await response.json();
        setPackages(data.packages);
      } catch (err) {
        setError('Failed to load credit packages. Please try again later.');
        console.error('Error fetching credit packages:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPackages();
  }, []);

  const handlePurchase = async (priceId: string) => {
    try {
      setPurchasing(true);
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError('Failed to initiate checkout. Please try again later.');
      console.error('Error creating checkout session:', err);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No credit packages available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {packages.map((pkg) => (
        <div key={pkg.id} className="border rounded-lg overflow-hidden shadow-lg">
          <div className="bg-gray-50 px-4 py-5 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 mb-4">{pkg.description}</p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: pkg.currency,
                }).format(pkg.price)}
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {pkg.credits} Credits
              </span>
            </div>
            <button
              onClick={() => handlePurchase(pkg.stripePriceId)}
              disabled={purchasing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {purchasing ? 'Processing...' : 'Purchase'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
