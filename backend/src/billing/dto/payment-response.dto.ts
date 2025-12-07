/**
 * Response DTOs for payment operations
 */

export class PaymentResponse {
  id: string;
  billingId: string;
  amount: number;
  mode: string;
  status: string;
  transactionId?: string;
  upiId?: string;
  cardLast4?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  recordedBy?: string;
  recordedAt: Date;
  remarks?: string;
}

export class PaymentSummary {
  billId: string;
  billNumber: string;
  billTotal: number;
  paidAmount: number;
  balance: number;
  status: string; // PENDING, PARTIAL, PAID
  payments: PaymentResponse[];
}

export class PaymentRecordedResponse {
  payment: PaymentResponse;
  billStatus: {
    billNumber: string;
    total: number;
    paidAmount: number;
    balance: number;
    status: string;
  };
}
