import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreatePaymentLinkDto, PaymentLinkResponse } from './dto/razorpay.dto';
import { BillResponse, BillPreview } from './dto/bill-response.dto';
import {
  PaymentResponse,
  PaymentSummary,
  PaymentRecordedResponse,
} from './dto/payment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * BillingController - Session 2B & 2C
 *
 * Bill Endpoints:
 * - POST /api/billing/generate - Generate bill from visit
 * - GET /api/billing/preview/:visitId - Preview bill without creating
 * - GET /api/billing/:billId - Get bill by ID
 * - GET /api/billing/number/:billNumber - Get bill by bill number
 * - GET /api/billing/visit/:visitId - Get all bills for a visit
 *
 * Payment Endpoints (Session 2C):
 * - POST /api/billing/payment/record - Record payment
 * - GET /api/billing/payment/summary/:billingId - Get payment summary
 * - GET /api/billing/payment/:paymentId - Get payment by ID
 * - GET /api/billing/payment/bill/:billingId - Get all payments for bill
 * - GET /api/billing/payment/outstanding - Get outstanding bills
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly paymentService: PaymentService,
    private readonly razorpayService: RazorpayService,
  ) {}

  /**
   * Generate bill from a visit
   * POST /api/billing/generate
   *
   * Body:
   * {
   *   "visitId": "visit-123"
   * }
   *
   * Response:
   * {
   *   "id": "bill-1",
   *   "billNumber": "HMS/2024/0001",
   *   "subtotal": 2139.35,
   *   "taxAmount": 304.65,
   *   "total": 2444,
   *   "balance": 2444,
   *   "status": "PENDING",
   *   "items": [...]
   * }
   */
  @Post('generate')
  @Roles('BILLING', 'ADMIN')
  async generateBill(
    @Body() dto: GenerateBillDto,
    @Request() req: any,
  ): Promise<BillResponse> {
    // Auto-fill generatedBy from authenticated user
    dto.generatedBy = dto.generatedBy || req.user.userId;
    return this.billingService.generateBill(dto);
  }

  /**
   * Preview bill without creating it
   * GET /api/billing/preview/:visitId
   *
   * Response:
   * {
   *   "items": [...],
   *   "subtotal": 2139.35,
   *   "taxAmount": 304.65,
   *   "total": 2444
   * }
   */
  @Get('preview/:visitId')
  @Roles('BILLING', 'ADMIN', 'DOCTOR')
  async previewBill(@Param('visitId') visitId: string): Promise<BillPreview> {
    return this.billingService.previewBill(visitId);
  }

  /**
   * Get bill by ID
   * GET /api/billing/:billId
   */
  @Get(':billId')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getBill(@Param('billId') billId: string): Promise<BillResponse> {
    return this.billingService.getBill(billId);
  }

  /**
   * Get bill by bill number
   * GET /api/billing/number/:billNumber
   *
   * Example: GET /api/billing/number/HMS/2024/0001
   */
  @Get('number/:billNumber')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getBillByNumber(@Param('billNumber') billNumber: string): Promise<BillResponse> {
    return this.billingService.getBillByNumber(billNumber);
  }

  /**
   * Get all bills for a visit
   * GET /api/billing/visit/:visitId
   */
  @Get('visit/:visitId')
  @Roles('BILLING', 'ADMIN', 'DOCTOR', 'RECEPTIONIST')
  async getBillsForVisit(@Param('visitId') visitId: string): Promise<BillResponse[]> {
    return this.billingService.getBillsForVisit(visitId);
  }

  // ========== PAYMENT ENDPOINTS (Session 2C) ==========

  /**
   * Record a payment against a bill
   * POST /api/billing/payment/record
   *
   * Body:
   * {
   *   "billingId": "bill-123",
   *   "amount": 1000,
   *   "mode": "CASH",
   *   "transactionId": "TXN123" (optional, required for UPI/Card),
   *   "upiId": "user@paytm" (optional),
   *   "cardLast4": "1234" (optional),
   *   "remarks": "Partial payment" (optional)
   * }
   *
   * Response:
   * {
   *   "payment": { id, amount, mode, ... },
   *   "billStatus": {
   *     "billNumber": "HMS/2024/0001",
   *     "total": 2444,
   *     "paidAmount": 1000,
   *     "balance": 1444,
   *     "status": "PARTIAL"
   *   }
   * }
   */
  @Post('payment/record')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @Request() req: any,
  ): Promise<PaymentRecordedResponse> {
    // Auto-fill recordedBy from authenticated user
    dto.recordedBy = dto.recordedBy || req.user.userId;
    return this.paymentService.recordPayment(dto);
  }

  /**
   * Get payment summary for a bill
   * GET /api/billing/payment/summary/:billingId
   *
   * Shows all payments and current balance
   */
  @Get('payment/summary/:billingId')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getPaymentSummary(@Param('billingId') billingId: string): Promise<PaymentSummary> {
    return this.paymentService.getPaymentSummary(billingId);
  }

  /**
   * Get payment by ID
   * GET /api/billing/payment/:paymentId
   */
  @Get('payment/:paymentId')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getPayment(@Param('paymentId') paymentId: string): Promise<PaymentResponse> {
    return this.paymentService.getPayment(paymentId);
  }

  /**
   * Get all payments for a bill
   * GET /api/billing/payment/bill/:billingId
   */
  @Get('payment/bill/:billingId')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getPaymentsForBill(
    @Param('billingId') billingId: string,
  ): Promise<PaymentResponse[]> {
    return this.paymentService.getPaymentsForBill(billingId);
  }

  /**
   * Get all outstanding bills
   * GET /api/billing/payment/outstanding
   *
   * Returns bills with pending balance
   */
  @Get('payment/outstanding')
  @Roles('BILLING', 'ADMIN')
  async getOutstandingBills(): Promise<any[]> {
    return this.paymentService.getOutstandingBills();
  }

  // ========== RAZORPAY ENDPOINTS (Session 4) ==========

  /**
   * Create Razorpay payment link
   * POST /api/billing/payment/razorpay/create-link
   *
   * Body:
   * {
   *   "billingId": "bill-123",
   *   "customerName": "John Doe" (optional),
   *   "customerEmail": "john@example.com" (optional),
   *   "customerMobile": "9876543210" (optional)
   * }
   *
   * Response:
   * {
   *   "id": "plink_xxx",
   *   "shortUrl": "https://rzp.io/i/xxx",
   *   "amount": 2444,
   *   "currency": "INR",
   *   "status": "created",
   *   "billNumber": "HMS/2024/0001"
   * }
   */
  @Post('payment/razorpay/create-link')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto): Promise<PaymentLinkResponse> {
    return this.razorpayService.createPaymentLink(dto);
  }

  /**
   * Razorpay webhook handler
   * POST /api/billing/payment/razorpay/webhook
   *
   * Receives payment notifications from Razorpay
   * Auto-records payments when payment.captured event is received
   */
  @Post('payment/razorpay/webhook')
  @Public() // No authentication required for webhooks
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Request() req: any,
  ): Promise<{ status: string }> {
    const signature = req.headers['x-razorpay-signature'];
    await this.razorpayService.handleWebhook(payload, signature);
    return { status: 'ok' };
  }
}
