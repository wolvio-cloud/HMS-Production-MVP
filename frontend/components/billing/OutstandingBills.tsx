'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function OutstandingBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOutstandingBills();
  }, []);

  const fetchOutstandingBills = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getOutstandingBills();
      setBills(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch outstanding bills');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patientMobile.includes(searchTerm)
  );

  const totalOutstanding = filteredBills.reduce((sum, bill) => sum + bill.outstandingAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Outstanding Bills</h2>
        <button
          onClick={fetchOutstandingBills}
          className="px-4 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Total Outstanding</p>
          <p className="text-3xl font-bold mt-2">₹{totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Number of Bills</p>
          <p className="text-3xl font-bold mt-2">{filteredBills.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90">Avg. Amount</p>
          <p className="text-3xl font-bold mt-2">
            ₹{filteredBills.length > 0 ? (totalOutstanding / filteredBills.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 rounded-xl p-4 shadow-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by bill number, patient name, or mobile..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white/80 rounded-xl shadow-md overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">✨ No outstanding bills found!</p>
            <p className="text-sm mt-2">All bills are paid</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bill.billNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bill.patientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{bill.patientMobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">
                        ₹{bill.outstandingAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bill.status === 'ACTIVE' ? 'bg-red-100 text-red-800' :
                        bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(bill.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`tel:${bill.patientMobile}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        📞 Call
                      </a>
                      <button
                        onClick={() => {
                          // Copy bill number to clipboard for searching
                          navigator.clipboard.writeText(bill.billNumber);
                          alert(`Bill number ${bill.billNumber} copied to clipboard!`);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        📋 Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
