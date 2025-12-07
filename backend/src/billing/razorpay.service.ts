import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreatePaymentLinkDto,
  PaymentLinkResponse,
  VerifyRazorpayPaymentDto,
} from './dto/razorpay.dto';

/**
 * RazorpayService - Session 4
 *
 * Handles Razorpay integration:
 * 1. Generate payment links for bills
 * 2. Verify payment signatures
 * 3. Handle webhook notifications
 * 4. Auto-record payments from Razorpay
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly razorpayKeyId: string;
  private readonly razorpayKeySecret: string;
  private readonly razorpayEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get Razorpay credentials from environment
    this.razorpayKeyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'TEST_KEY';
    this.razorpayKeySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'TEST_SECRET';
    this.razorpayEnabled =
      this.configService.get<string>('RAZORPAY_ENABLED') === 'true';

    if (!this.razorpayEnabled) {
      this.logger.warn('Razorpay is disabled. Set RAZORPAY_ENABLED=true to enable.');
    }
  }

  /**
   * Create Razorpay payment link for a bill
   * Generates a payment link that can be sent to patient via SMS/Email
   */
  async createPaymentLink(dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
    // 1. Verify bill exists and has outstanding balance
    const bill = await this.prisma.billing.findUnique({
      where: { id: dto.billingId },
      include: {
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${dto.billingId} not found`);
    }

    if (bill.balance <= 0) {
      throw new BadRequestException('Bill is already fully paid');
    }

    // 2. Check if Razorpay is enabled
    if (!this.razorpayEnabled) {
      // Return mock payment link for testing
      return this.createMockPaymentLink(bill);
    }

    // 3. Create Razorpay payment link (actual implementation)
    try {
      const paymentLinkData = {
        amount: Math.round(bill.balance * 100), // Convert to paise
        currency: 'INR',
        description: `Payment for Bill ${bill.billNumber}`,
        customer: {
          name: dto.customerName || bill.visit.patient.name,
          email: dto.customerEmail || '',
          contact: dto.customerMobile || bill.visit.patient.mobile,
        },
        notify: {
          sms: true,
          email: dto.customerEmail ? true : false,
        },
        reminder_enable: true,
        notes: {
          billingId: bill.id,
          billNumber: bill.billNumber,
        },
        callback_url: `${this.configService.get('APP_URL')}/billing/payment/razorpay/callback`,
        callback_method: 'get',
      };

      // TODO: Integrate actual Razorpay SDK in production
      // const Razorpay = require('razorpay');
      // const razorpay = new Razorpay({
      //   key_id: this.razorpayKeyId,
      //   key_secret: this.razorpayKeySecret,
      // });
      // const paymentLink = await razorpay.paymentLink.create(paymentLinkData);

      // For now, return mock data
      return this.createMockPaymentLink(bill);
    } catch (error) {
      this.logger.error('Failed to create Razorpay payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }
  }

  /**
   * Verify Razorpay payment signature
   * Ensures payment is authentic and not tampered
   */
  verifyPaymentSignature(dto: VerifyRazorpayPaymentDto): boolean {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

      // Generate expected signature
      const generatedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      // Compare signatures
      const isValid = generatedSignature === razorpaySignature;

      if (!isValid) {
        this.logger.warn('Invalid Razorpay signature detected', {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying Razorpay signature', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * Ensures webhook is from Razorpay
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

      if (!webhookSecret) {
        this.logger.warn('Razorpay webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Handle Razorpay webhook
   * Auto-records payment when Razorpay confirms payment
   */
  async handleWebhook(payload: any, signature: string): Promise<void> {
    try {
      // 1. Verify webhook signature
      const isValid = this.verifyWebhookSignature(JSON.stringify(payload), signature);

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // 2. Extract event and payment details
      const event = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;

      if (!paymentEntity) {
        this.logger.warn('Webhook payload missing payment entity');
        return;
      }

      // 3. Handle different events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(paymentEntity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(paymentEntity);
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      this.logger.error('Error handling webhook', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   * Auto-creates payment record
   */
  private async handlePaymentCaptured(paymentEntity: any): Promise<void> {
    try {
      const { id: paymentId, order_id: orderId, amount, notes } = paymentEntity;
      const billingId = notes?.billingId;

      if (!billingId) {
        this.logger.warn('Payment captured but billingId not found in notes');
        return;
      }

      // Check if payment already recorded
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          razorpayPaymentId: paymentId,
        },
      });

      if (existingPayment) {
        this.logger.log(`Payment ${paymentId} already recorded`);
        return;
      }

      // Get bill details
      const bill = await this.prisma.billing.findUnique({
        where: { id: billingId },
      });

      if (!bill) {
        this.logger.error(`Bill ${billingId} not found for payment ${paymentId}`);
        return;
      }

      // Create payment record
      const paymentAmount = amount / 100; // Convert from paise to rupees

      await this.prisma.payment.create({
        data: {
          billingId,
          amount: paymentAmount,
          mode: 'RAZORPAY_LINK',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          status: 'SUCCESS',
          remarks: 'Auto-recorded from Razorpay webhook',
        },
      });

      // Update bill balance and status
      const newBalance = bill.balance - paymentAmount;
      const newStatus = newBalance === 0 ? 'PAID' : newBalance < bill.total ? 'PARTIAL' : 'PENDING';

      await this.prisma.billing.update({
        where: { id: billingId },
        data: {
          balance: newBalance,
          status: newStatus,
          paidAt: newBalance === 0 ? new Date() : null,
        },
      });

      // Update OutstandingBill if exists
      if (newBalance === 0) {
        await this.prisma.outstandingBill.updateMany({
          where: { billingId },
          data: {
            status: 'SETTLED',
            settledAt: new Date(),
          },
        });
      }

      this.logger.log(`Payment ${paymentId} recorded successfully for bill ${bill.billNumber}`);
    } catch (error) {
      this.logger.error('Error handling payment captured', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   * Logs failure for tracking
   */
  private async handlePaymentFailed(paymentEntity: any): Promise<void> {
    const { id: paymentId, order_id: orderId, notes } = paymentEntity;
    const billingId = notes?.billingId;

    this.logger.warn('Payment failed', {
      paymentId,
      orderId,
      billingId,
    });

    // Create failed payment record for audit
    if (billingId) {
      await this.prisma.payment.create({
        data: {
          billingId,
          amount: 0,
          mode: 'RAZORPAY_LINK',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          status: 'FAILED',
          remarks: 'Payment failed - recorded from webhook',
        },
      });
    }
  }

  /**
   * Create mock payment link for testing
   */
  private createMockPaymentLink(bill: any): PaymentLinkResponse {
    const mockId = `plink_${Date.now()}`;
    const mockUrl = `https://razorpay.com/payment-link/${mockId}`;

    return {
      id: mockId,
      shortUrl: mockUrl,
      amount: bill.balance,
      currency: 'INR',
      status: 'created',
      billNumber: bill.billNumber,
    };
  }

  /**
   * Get payment link status
   * Fetches status from Razorpay API
   */
  async getPaymentLinkStatus(paymentLinkId: string): Promise<any> {
    if (!this.razorpayEnabled) {
      return {
        id: paymentLinkId,
        status: 'created',
        message: 'Razorpay is disabled in test mode',
      };
    }

    // TODO: Integrate actual Razorpay SDK
    // const Razorpay = require('razorpay');
    // const razorpay = new Razorpay({
    //   key_id: this.razorpayKeyId,
    //   key_secret: this.razorpayKeySecret,
    // });
    // return razorpay.paymentLink.fetch(paymentLinkId);

    return {
      id: paymentLinkId,
      status: 'created',
      message: 'Mock response - Razorpay SDK not integrated',
    };
  }
}
