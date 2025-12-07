import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  RAZORPAY_LINK = 'RAZORPAY_LINK',
}

/**
 * DTO for recording a payment against a bill
 */
export class RecordPaymentDto {
  @IsString()
  billingId: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than 0' })
  amount: number;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  // Optional fields for different payment modes
  @IsString()
  @IsOptional()
  transactionId?: string; // For UPI/Card/Razorpay

  @IsString()
  @IsOptional()
  upiId?: string; // For UPI payments (e.g., user@paytm)

  @IsString()
  @IsOptional()
  cardLast4?: string; // For card payments (e.g., 1234)

  @IsString()
  @IsOptional()
  razorpayOrderId?: string; // Razorpay order ID

  @IsString()
  @IsOptional()
  razorpayPaymentId?: string; // Razorpay payment ID

  @IsString()
  @IsOptional()
  razorpaySignature?: string; // Razorpay signature for verification

  @IsString()
  @IsOptional()
  recordedBy?: string; // User ID who recorded payment

  @IsString()
  @IsOptional()
  remarks?: string; // Additional notes
}
