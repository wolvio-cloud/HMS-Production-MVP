import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import {
  PaymentResponse,
  PaymentSummary,
  PaymentRecordedResponse,
} from './dto/payment-response.dto';

/**
 * PaymentService - Session 2C
 *
 * Handles payment recording and management:
 * 1. Record payments (Cash/UPI/Card/Razorpay)
 * 2. Support partial payments
 * 3. Auto-update bill balance and status
 * 4. Payment validation and overpayment prevention
 * 5. Razorpay integration groundwork
 */
@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a payment against a bill
   * Supports partial payments and auto-updates bill status
   */
  async recordPayment(dto: RecordPaymentDto): Promise<PaymentRecordedResponse> {
    // 1. Verify bill exists
    const bill = await this.prisma.billing.findUnique({
      where: { id: dto.billingId },
      include: { payments: true },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${dto.billingId} not found`);
    }

    // 2. Validate payment amount
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // 3. Check for overpayment
    const currentBalance = bill.balance;
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `Payment amount ₹${dto.amount} exceeds outstanding balance ₹${currentBalance}`,
      );
    }

    // 4. Validate payment mode-specific fields
    this.validatePaymentModeFields(dto);

    // 5. Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        billingId: dto.billingId,
        amount: dto.amount,
        mode: dto.mode,
        transactionId: dto.transactionId,
        upiId: dto.upiId,
        cardLast4: dto.cardLast4,
        razorpayOrderId: dto.razorpayOrderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        status: 'SUCCESS', // Default to SUCCESS for manual payments
        recordedBy: dto.recordedBy,
        remarks: dto.remarks,
      },
    });

    // 6. Calculate new balance
    const newBalance = currentBalance - dto.amount;

    // 7. Determine new bill status
    let newStatus: 'PENDING' | 'PARTIAL' | 'PAID';
    if (newBalance === 0) {
      newStatus = 'PAID';
    } else if (newBalance < bill.total) {
      newStatus = 'PARTIAL';
    } else {
      newStatus = 'PENDING';
    }

    // 8. Update bill balance and status
    const updatedBill = await this.prisma.billing.update({
      where: { id: dto.billingId },
      data: {
        balance: newBalance,
        status: newStatus,
        paidAt: newBalance === 0 ? new Date() : null, // Set paidAt when fully paid
      },
    });

    // 9. If fully paid and OutstandingBill exists, mark it as SETTLED
    if (newBalance === 0) {
      await this.prisma.outstandingBill.updateMany({
        where: { billingId: dto.billingId },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
        },
      });
    } else {
      // Create or update OutstandingBill if balance remains
      await this.upsertOutstandingBill(dto.billingId, newBalance);
    }

    // 10. Return payment details with bill status
    return {
      payment: this.formatPaymentResponse(payment),
      billStatus: {
        billNumber: updatedBill.billNumber,
        total: updatedBill.total,
        paidAmount: updatedBill.total - newBalance,
        balance: newBalance,
        status: newStatus,
      },
    };
  }

  /**
   * Get payment summary for a bill
   * Shows all payments and current balance
   */
  async getPaymentSummary(billingId: string): Promise<PaymentSummary> {
    const bill = await this.prisma.billing.findUnique({
      where: { id: billingId },
      include: {
        payments: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${billingId} not found`);
    }

    // Calculate total paid amount
    const paidAmount = bill.payments.reduce(
      (sum, payment) => sum + (payment.status === 'SUCCESS' ? payment.amount : 0),
      0,
    );

    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      billTotal: bill.total,
      paidAmount,
      balance: bill.balance,
      status: bill.status,
      payments: bill.payments.map((p) => this.formatPaymentResponse(p)),
    };
  }

  /**
   * Get all payments for a bill
   */
  async getPaymentsForBill(billingId: string): Promise<PaymentResponse[]> {
    const payments = await this.prisma.payment.findMany({
      where: { billingId },
      orderBy: { recordedAt: 'desc' },
    });

    return payments.map((p) => this.formatPaymentResponse(p));
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return this.formatPaymentResponse(payment);
  }

  /**
   * Validate Razorpay payment signature
   * (Placeholder for Razorpay integration)
   */
  validateRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    // TODO: Implement Razorpay signature verification in Session 4
    // const crypto = require('crypto');
    // const secret = process.env.RAZORPAY_KEY_SECRET;
    // const generatedSignature = crypto
    //   .createHmac('sha256', secret)
    //   .update(orderId + '|' + paymentId)
    //   .digest('hex');
    // return generatedSignature === signature;

    // For now, return true (will be implemented in Session 4)
    return true;
  }

  /**
   * Get outstanding bills
   * Returns all bills with pending balance
   */
  async getOutstandingBills(): Promise<any[]> {
    const outstandingBills = await this.prisma.outstandingBill.findMany({
      where: {
        status: { in: ['ACTIVE', 'PARTIAL'] },
      },
      include: {
        billing: {
          include: {
            visit: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return outstandingBills.map((ob) => ({
      id: ob.id,
      billId: ob.billing.id,
      billNumber: ob.billing.billNumber,
      patientId: ob.patientId,
      patientName: ob.billing.visit.patient.name,
      patientMobile: ob.billing.visit.patient.mobile,
      outstandingAmount: ob.outstandingAmount,
      dueDate: ob.dueDate,
      status: ob.status,
      createdAt: ob.createdAt,
    }));
  }

  // Private helper methods

  /**
   * Validate payment mode-specific fields
   */
  private validatePaymentModeFields(dto: RecordPaymentDto): void {
    switch (dto.mode) {
      case 'UPI':
        if (!dto.transactionId) {
          throw new BadRequestException('Transaction ID is required for UPI payments');
        }
        break;

      case 'CARD':
        if (!dto.transactionId) {
          throw new BadRequestException('Transaction ID is required for card payments');
        }
        break;

      case 'RAZORPAY_LINK':
        if (!dto.razorpayOrderId || !dto.razorpayPaymentId) {
          throw new BadRequestException(
            'Razorpay order ID and payment ID are required for Razorpay payments',
          );
        }
        // Validate signature
        if (dto.razorpaySignature) {
          const isValid = this.validateRazorpaySignature(
            dto.razorpayOrderId,
            dto.razorpayPaymentId,
            dto.razorpaySignature,
          );
          if (!isValid) {
            throw new BadRequestException('Invalid Razorpay signature');
          }
        }
        break;

      case 'CASH':
        // No additional validation needed for cash
        break;

      default:
        throw new BadRequestException(`Invalid payment mode: ${dto.mode}`);
    }
  }

  /**
   * Create or update OutstandingBill record
   */
  private async upsertOutstandingBill(
    billingId: string,
    outstandingAmount: number,
  ): Promise<void> {
    // Get bill with visit info
    const bill = await this.prisma.billing.findUnique({
      where: { id: billingId },
      include: { visit: true },
    });

    if (!bill) return;

    // Check if OutstandingBill already exists
    const existing = await this.prisma.outstandingBill.findUnique({
      where: { billingId },
    });

    if (existing) {
      // Update existing record
      await this.prisma.outstandingBill.update({
        where: { billingId },
        data: {
          outstandingAmount,
          status: outstandingAmount === 0 ? 'SETTLED' : 'PARTIAL',
        },
      });
    } else {
      // Create new record
      await this.prisma.outstandingBill.create({
        data: {
          billingId,
          patientId: bill.visit.patientId,
          outstandingAmount,
          status: 'ACTIVE',
        },
      });
    }
  }

  /**
   * Format payment record to response DTO
   */
  private formatPaymentResponse(payment: any): PaymentResponse {
    return {
      id: payment.id,
      billingId: payment.billingId,
      amount: payment.amount,
      mode: payment.mode,
      status: payment.status,
      transactionId: payment.transactionId,
      upiId: payment.upiId,
      cardLast4: payment.cardLast4,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      recordedBy: payment.recordedBy,
      recordedAt: payment.recordedAt,
      remarks: payment.remarks,
    };
  }
}
