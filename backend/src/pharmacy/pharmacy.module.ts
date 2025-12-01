import { Module } from '@nestjs/common';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { StockService } from './stock.service';

@Module({
  controllers: [PharmacyController],
  providers: [PharmacyService, StockService],
  exports: [PharmacyService, StockService],
})
export class PharmacyModule {}
