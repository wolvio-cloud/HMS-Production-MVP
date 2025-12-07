'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function BillSearch() {
  const [searchType, setSearchType] = useState<'billNumber' | 'visitId'>('billNumber');
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchBills = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setBills([]);
    setSelectedBill(null);

    try {
      if (searchType === 'billNumber') {
        const bill = await api.getBillByNumber(searchTerm.trim());
        setBills([bill]);
      } else {
        const visitBills = await api.getBillsForVisit(searchTerm.trim());
        setBills(visitBills);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search bills');
    } finally {
      setLoading(false);
    }
  };

  const viewBillDetails = async (billId: string) => {
    try {
      const bill = await api.getBill(billId);
      setSelectedBill(bill);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bill details');
    }
  };

  const closeBillDetails = () => {
    setSelectedBill(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Bill Search</h2>
      </div>

      {/* Search Section */}
      <div className="bg-white/80 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'billNumber' | 'visitId')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="billNumber">Bill Number</option>
              <option value="visitId">Visit ID</option>
            </select>
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'billNumber' ? 'Bill Number' : 'Visit ID'}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchBills()}
              placeholder={searchType === 'billNumber' ? 'e.g., HMS/2024/0001' : 'e.g., visit-123'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={searchBills}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Search Results */}
      {bills.length > 0 && (
        <div className="bg-white/80 rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({bills.length} {bills.length === 1 ? 'bill' : 'bills'} found)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bill.billNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{bill.total.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${
                        bill.balance === 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₹{bill.balance.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bill.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewBillDetails(bill.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">{selectedBill.billNumber}</h3>
                <p className="text-sm opacity-90">
                  Generated on {new Date(selectedBill.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={closeBillDetails}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Bill Information */}
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                  <p className="text-sm opacity-90">Total Amount</p>
                  <p className="text-3xl font-bold mt-1">₹{selectedBill.total.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                  <p className="text-sm opacity-90">Paid Amount</p>
                  <p className="text-3xl font-bold mt-1">
                    ₹{(selectedBill.total - selectedBill.balance).toFixed(2)}
                  </p>
                </div>
                <div className={`bg-gradient-to-br rounded-xl p-4 text-white ${
                  selectedBill.balance === 0
                    ? 'from-gray-500 to-gray-600'
                    : 'from-red-500 to-pink-600'
                }`}>
                  <p className="text-sm opacity-90">Balance</p>
                  <p className="text-3xl font-bold mt-1">₹{selectedBill.balance.toFixed(2)}</p>
                </div>
              </div>

              {/* Bill Items */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Bill Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tax
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedBill.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.itemType}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {(item.taxRate * 100).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ₹{item.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Tax Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      ₹{selectedBill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax Amount:</span>
                    <span className="font-semibold text-gray-900">
                      ₹{selectedBill.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between text-base">
                      <span className="font-semibold text-gray-900">Grand Total:</span>
                      <span className="font-bold text-indigo-600 text-lg">
                        ₹{selectedBill.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${
                  selectedBill.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  selectedBill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedBill.status}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedBill.billNumber);
                    alert(`Bill number ${selectedBill.billNumber} copied to clipboard!`);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  📋 Copy Bill Number
                </button>
                <button
                  onClick={closeBillDetails}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
