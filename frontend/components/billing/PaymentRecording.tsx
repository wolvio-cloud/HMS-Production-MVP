'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function PaymentRecording() {
  const [billNumber, setBillNumber] = useState('');
  const [bill, setBill] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment form state
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'RAZORPAY_LINK'>('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);

  const searchBill = async () => {
    if (!billNumber.trim()) {
      setError('Please enter a bill number');
      return;
    }

    setLoading(true);
    setError('');
    setBill(null);
    setPayments([]);

    try {
      // Fetch bill details
      const billData = await api.getBillByNumber(billNumber);
      setBill(billData);

      // Fetch payment summary
      const paymentSummary = await api.getPaymentSummary(billData.id);
      setPayments(paymentSummary.payments || []);

      setSuccess('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bill not found');
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async () => {
    if (!bill) return;

    const paymentAmount = parseFloat(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > bill.balance) {
      setError(`Payment amount cannot exceed balance (₹${bill.balance})`);
      return;
    }

    // Validation for payment modes
    if ((paymentMode === 'UPI' || paymentMode === 'CARD') && !transactionId.trim()) {
      setError(`Transaction ID is required for ${paymentMode} payments`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const paymentData: any = {
        billingId: bill.id,
        amount: paymentAmount,
        mode: paymentMode,
        remarks,
      };

      if (transactionId) paymentData.transactionId = transactionId;
      if (upiId) paymentData.upiId = upiId;
      if (cardLast4) paymentData.cardLast4 = cardLast4;

      const response = await api.recordPayment(paymentData);

      setSuccess(`Payment recorded successfully! Balance: ₹${response.billStatus.balance}`);

      // Update bill
      setBill({
        ...bill,
        balance: response.billStatus.balance,
        status: response.billStatus.status,
      });

      // Add payment to list
      setPayments([response.payment, ...payments]);

      // Reset form
      setAmount('');
      setTransactionId('');
      setUpiId('');
      setCardLast4('');
      setRemarks('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentLink = async () => {
    if (!bill) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.createPaymentLink({
        billingId: bill.id,
        customerName: '', // Can be filled from a form
        customerMobile: '',
      });

      setSuccess(`Payment link created: ${response.shortUrl}`);
      setShowPaymentLinkModal(false);

      // Copy to clipboard
      navigator.clipboard.writeText(response.shortUrl);
      alert('Payment link copied to clipboard!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>

      {/* Search Bill */}
      <div className="bg-white/80 rounded-xl p-6 shadow-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Bill by Bill Number
        </label>
        <div className="flex space-x-3">
          <input
            type="text"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
            placeholder="HMS/2024/0001"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && searchBill()}
          />
          <button
            onClick={searchBill}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Bill Details */}
      {bill && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Bill Info */}
          <div className="bg-white/80 rounded-xl p-6 shadow-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Bill Details</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Bill Number:</span>
                <span className="font-semibold">{bill.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span>₹{bill.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span>₹{bill.discount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{bill.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold">
                <span>Balance:</span>
                <span>₹{bill.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bill.status === 'PAID' ? 'bg-green-100 text-green-700' :
                  bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {bill.status}
                </span>
              </div>
            </div>

            {bill.balance > 0 && (
              <button
                onClick={() => setShowPaymentLinkModal(true)}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                📱 Generate Payment Link
              </button>
            )}
          </div>

          {/* Right: Payment Form */}
          {bill.balance > 0 && (
            <div className="bg-white/80 rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Record New Payment</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={bill.balance}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₹{bill.balance.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI</option>
                    <option value="CARD">💳 Card</option>
                  </select>
                </div>

                {(paymentMode === 'UPI' || paymentMode === 'CARD') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID *
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="TXN123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {paymentMode === 'UPI' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="user@paytm"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {paymentMode === 'CARD' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Last 4 Digits (Optional)
                    </label>
                    <input
                      type="text"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={recordPayment}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Recording...' : '✓ Record Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white/80 rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(payment.recordedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      ₹{payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {payment.mode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {payment.transactionId || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                        payment.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Payment Link</h3>
            <p className="text-gray-600 mb-4">
              Create a Razorpay payment link for bill {bill.billNumber}
            </p>
            <p className="text-2xl font-bold text-indigo-600 mb-6">
              Amount: ₹{bill.balance.toFixed(2)}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentLinkModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generatePaymentLink}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Generate Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
