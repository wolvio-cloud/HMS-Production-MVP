'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import PaymentRecording from '@/components/billing/PaymentRecording';
import OutstandingBills from '@/components/billing/OutstandingBills';
import BillSearch from '@/components/billing/BillSearch';

export default function BillingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'payment' | 'outstanding' | 'search'>('payment');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('hms_token');
    const userData = localStorage.getItem('hms_user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Check if user has billing access
    if (!['BILLING', 'ADMIN', 'RECEPTIONIST'].includes(parsedUser.role)) {
      alert('Access denied. Billing access required.');
      router.push('/');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">₹</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Billing Dashboard</h1>
                  <p className="text-xs text-gray-500">{user?.name} • {user?.role}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 inline-flex space-x-2 shadow-lg">
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'payment'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              💰 Record Payment
            </button>
            <button
              onClick={() => setActiveTab('outstanding')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'outstanding'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              📋 Outstanding Bills
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              🔍 Search Bills
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl p-6 min-h-[600px]">
          {activeTab === 'payment' && <PaymentRecording />}
          {activeTab === 'outstanding' && <OutstandingBills />}
          {activeTab === 'search' && <BillSearch />}
        </div>
      </div>
    </div>
  );
}
