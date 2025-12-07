import { IsString, IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for creating Razorpay payment link
 */
export class CreatePaymentLinkDto {
  @IsString()
  billingId: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerMobile?: string;
}

/**
 * DTO for Razorpay webhook payload
 */
export class RazorpayWebhookDto {
  @IsString()
  event: string; // payment.captured, payment.failed, etc.

  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

/**
 * DTO for verifying Razorpay payment
 */
export class VerifyRazorpayPaymentDto {
  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}

/**
 * Response for payment link creation
 */
export class PaymentLinkResponse {
  id: string;
  shortUrl: string;
  amount: number;
  currency: string;
  status: string;
  billNumber: string;
}
