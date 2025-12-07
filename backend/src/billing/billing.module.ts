import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import { StockReservationService } from './stock-reservation.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    PaymentService,
    RazorpayService,
    StockReservationService,
  ],
  exports: [
    BillingService,
    PaymentService,
    RazorpayService,
    StockReservationService,
  ],
})
export class BillingModule {}
