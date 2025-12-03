import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { DispenseMedicineDto } from './dto/dispense-medicine.dto';
import { BulkStockCheckDto } from './dto/bulk-stock-check.dto';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
    private readonly stockService: StockService,
  ) {}

  /**
   * ⭐ Search medicines with autocomplete and stock indicators
   * GET /api/pharmacy/medicines/search?q=para&limit=10
   */
  @Get('medicines/search')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  async searchMedicines(@Query() searchDto: SearchMedicineDto) {
    return this.pharmacyService.searchMedicines(searchDto);
  }

  /**
   * ⭐ Bulk stock check for prescription builder
   * POST /api/pharmacy/stock/bulk
   * Body: { medicineIds: ["id1", "id2", "id3"] }
   */
  @Post('stock/bulk')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  async bulkStockCheck(@Body() bulkDto: BulkStockCheckDto) {
    return this.pharmacyService.bulkStockCheck(bulkDto.medicineIds);
  }

  /**
   * ⭐ Real-time stock check for single medicine (<10ms)
   * GET /api/pharmacy/medicines/:id/stock
   */
  @Get('medicines/:id/stock')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  async getStockStatus(@Param('id') medicineId: string) {
    return this.stockService.getStockStatus(medicineId);
  }

  /**
   * Get medicine details with stock
   * GET /api/pharmacy/medicines/:id
   */
  @Get('medicines/:id')
  async getMedicine(@Param('id') medicineId: string) {
    return this.pharmacyService.getMedicineById(medicineId);
  }

  /**
   * Get all medicines with stock status
   * GET /api/pharmacy/medicines
   */
  @Get('medicines')
  async getAllMedicines() {
    return this.pharmacyService.getAllMedicines();
  }

  /**
   * ⭐ Dispense medicine (FIFO batch logic)
   * POST /api/pharmacy/dispense
   */
  @Post('dispense')
  @Roles(UserRole.PHARMACIST)
  async dispenseMedicine(@Body() dispenseDto: DispenseMedicineDto) {
    return this.pharmacyService.dispenseMedicine(dispenseDto);
  }

  /**
   * Validate prescription stock (all items available?)
   * POST /api/pharmacy/validate-prescription
   */
  @Post('validate-prescription')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  async validatePrescriptionStock(
    @Body() data: { items: { medicineId: string; quantity: number }[] },
  ) {
    return this.pharmacyService.validatePrescriptionStock(data.items);
  }

  /**
   * Get low stock alerts
   * GET /api/pharmacy/alerts/low-stock
   */
  @Get('alerts/low-stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async getLowStockAlerts() {
    return this.pharmacyService.getLowStockAlerts();
  }

  /**
   * Get out-of-stock alerts
   * GET /api/pharmacy/alerts/out-of-stock
   */
  @Get('alerts/out-of-stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async getOutOfStockAlerts() {
    return this.pharmacyService.getOutOfStockAlerts();
  }

  /**
   * Get medicine batches (inventory management)
   * GET /api/pharmacy/medicines/:id/batches
   */
  @Get('medicines/:id/batches')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async getMedicineBatches(@Param('id') medicineId: string) {
    return this.pharmacyService.getMedicineBatches(medicineId);
  }

  /**
   * Create new medicine (admin only)
   * POST /api/pharmacy/medicines
   */
@Post('medicines')
@Roles(UserRole.ADMIN)
async createMedicine(
  @Body()
  data: {
    name: string;
    genericName?: string;
    manufacturer?: string;
    unitPrice: number;

    type: string;         // REQUIRED
    strength: string;     // REQUIRED
    mrp: number;          // REQUIRED
    sellingPrice: number; // REQUIRED
  },
) {
  return this.pharmacyService.createMedicine(data);
}


  /**
   * Add stock batch (when new stock arrives)
   * POST /api/pharmacy/stock/add-batch
   */
  @Post('stock/add-batch')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async addStockBatch(
    @Body()
    data: {
      medicineId: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      costPrice: number;
      supplierId?: string;
    },
  ) {
    return this.pharmacyService.addStockBatch({
      ...data,
      expiryDate: new Date(data.expiryDate),
    });
  }

  /**
   * Refresh cache manually (on-demand)
   * POST /api/pharmacy/medicines/:id/refresh-cache
   */
  @Post('medicines/:id/refresh-cache')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async refreshCache(@Param('id') medicineId: string) {
    return this.stockService.refreshCache(medicineId);
  }
}
