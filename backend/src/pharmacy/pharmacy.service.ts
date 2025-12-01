import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService, StockInfo } from './stock.service';
import { SearchMedicineDto } from './dto/search-medicine.dto';
import { DispenseMedicineDto } from './dto/dispense-medicine.dto';

@Injectable()
export class PharmacyService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  /**
   * Search medicines with autocomplete and stock status
   */
  async searchMedicines(
    searchDto: SearchMedicineDto,
  ): Promise<StockInfo[]> {
    const { q, limit } = searchDto;

    // Search by name (case-insensitive, partial match)
    const medicines = await this.prisma.medicine.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    // Get stock status for each medicine (Redis-cached)
    const medicinesWithStock = await Promise.all(
      medicines.map((medicine) => this.stockService.getStockStatus(medicine.id)),
    );

    return medicinesWithStock;
  }

  /**
   * Get medicine by ID with stock status
   */
  async getMedicineById(medicineId: string): Promise<StockInfo> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine ${medicineId} not found`);
    }

    return this.stockService.getStockStatus(medicineId);
  }

  /**
   * Get all medicines with stock status
   */
  async getAllMedicines(): Promise<StockInfo[]> {
    const medicines = await this.prisma.medicine.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return Promise.all(
      medicines.map((medicine) => this.stockService.getStockStatus(medicine.id)),
    );
  }

  /**
   * ⭐ FIFO Batch Dispensing (First-Expiry, First-Out)
   */
  async dispenseMedicine(
    dispenseDto: DispenseMedicineDto,
  ): Promise<{
    success: boolean;
    dispensed: number;
    remaining: number;
    batchesUsed: string[];
  }> {
    const { medicineId, quantity, patientId, prescriptionId, dispensedBy } =
      dispenseDto;

    // 1. Check sufficient stock
    const stockCheck = await this.stockService.hasSufficientStock(
      medicineId,
      quantity,
    );

    if (!stockCheck.sufficient) {
      throw new BadRequestException(
        `Insufficient stock. Required: ${quantity}, Available: ${stockCheck.available}`,
      );
    }

    // 2. Get batches sorted by expiry (FIFO)
    const batches = await this.prisma.medicineStock.findMany({
      where: {
        medicineId,
        quantity: {
          gt: 0,
        },
      },
      orderBy: {
        expiryDate: 'asc', // First expiry first
      },
    });

    let remainingToDispense = quantity;
    const batchesUsed: string[] = [];

    // 3. Dispense from batches (FIFO)
    for (const batch of batches) {
      if (remainingToDispense === 0) break;

      const quantityFromBatch = Math.min(batch.quantity, remainingToDispense);

      // Update batch quantity
      await this.prisma.medicineStock.update({
        where: { id: batch.id },
        data: {
          quantity: batch.quantity - quantityFromBatch,
        },
      });

      batchesUsed.push(batch.batchNumber);
      remainingToDispense -= quantityFromBatch;
    }

    // 4. Update medicine currentStock (denormalized field)
    const medicine = await this.prisma.medicine.update({
      where: { id: medicineId },
      data: {
        currentStock: {
          decrement: quantity,
        },
      },
    });

    // 5. Invalidate Redis cache
    await this.stockService.invalidateCache(medicineId);

    // 6. Log transaction (optional - for audit)
    console.log(
      `✅ Dispensed ${quantity} units of ${medicine.name} from batches: ${batchesUsed.join(', ')}`,
    );

    return {
      success: true,
      dispensed: quantity,
      remaining: medicine.currentStock,
      batchesUsed,
    };
  }

  /**
   * Validate prescription can be fulfilled (all medicines in stock)
   */
  async validatePrescriptionStock(
    items: { medicineId: string; quantity: number }[],
  ): Promise<{
    canFulfill: boolean;
    insufficientItems: {
      medicineId: string;
      required: number;
      available: number;
    }[];
  }> {
    const insufficientItems: {
      medicineId: string;
      required: number;
      available: number;
    }[] = [];

    for (const item of items) {
      const stockCheck = await this.stockService.hasSufficientStock(
        item.medicineId,
        item.quantity,
      );

      if (!stockCheck.sufficient) {
        insufficientItems.push({
          medicineId: item.medicineId,
          required: item.quantity,
          available: stockCheck.available,
        });
      }
    }

    return {
      canFulfill: insufficientItems.length === 0,
      insufficientItems,
    };
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<StockInfo[]> {
    return this.stockService.getLowStockMedicines();
  }

  /**
   * Get out-of-stock alerts
   */
  async getOutOfStockAlerts(): Promise<StockInfo[]> {
    return this.stockService.getOutOfStockMedicines();
  }

  /**
   * Bulk stock check (for prescription builder)
   */
  async bulkStockCheck(medicineIds: string[]): Promise<StockInfo[]> {
    return this.stockService.bulkStockCheck(medicineIds);
  }

  /**
   * Add new medicine (admin only)
   */
  async createMedicine(data: {
    name: string;
    genericName?: string;
    manufacturer?: string;
    unitPrice: number;
  }) {
    const medicine = await this.prisma.medicine.create({
      data: {
        ...data,
        currentStock: 0, // Initially no stock
      },
    });

    return medicine;
  }

  /**
   * Add stock batch (when new stock arrives)
   */
  async addStockBatch(data: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: Date;
    costPrice: number;
    supplierId?: string;
  }) {
    // 1. Create batch
    const batch = await this.prisma.medicineStock.create({
      data,
    });

    // 2. Update medicine currentStock
    await this.prisma.medicine.update({
      where: { id: data.medicineId },
      data: {
        currentStock: {
          increment: data.quantity,
        },
      },
    });

    // 3. Invalidate cache
    await this.stockService.invalidateCache(data.medicineId);

    console.log(
      `✅ Added ${data.quantity} units to medicine ${data.medicineId} (Batch: ${data.batchNumber})`,
    );

    return batch;
  }

  /**
   * Get medicine batches (for inventory management)
   */
  async getMedicineBatches(medicineId: string) {
    return this.prisma.medicineStock.findMany({
      where: { medicineId },
      orderBy: {
        expiryDate: 'asc',
      },
      include: {
        supplier: true,
      },
    });
  }
}
