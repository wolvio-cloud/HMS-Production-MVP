import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PdfService } from './pdf.service';
import { PharmacyModule } from '../pharmacy/pharmacy.module';

@Module({
  imports: [PharmacyModule], // Import for StockService
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PdfService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
