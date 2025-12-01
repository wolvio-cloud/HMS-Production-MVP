import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, RedisClientType } from 'redis';

export enum StockStatus {
  IN_STOCK = 'IN_STOCK',       // > 10 units
  LOW_STOCK = 'LOW_STOCK',     // 1-10 units
  OUT_OF_STOCK = 'OUT_OF_STOCK', // 0 units
}

export interface StockInfo {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  status: StockStatus;
  indicator: '🟢' | '🟡' | '🔴';
  batches?: {
    batchNumber: string;
    quantity: number;
    expiryDate: Date;
  }[];
}

@Injectable()
export class StockService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;
  private readonly CACHE_TTL = 30; // 30 seconds cache
  private readonly CACHE_PREFIX = 'stock:';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize Redis connection
    const redisUrl = this.config.get('REDIS_URL') || 'redis://localhost:6379';

    this.redisClient = createClient({
      url: redisUrl,
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Redis connected for Stock Service');
    });

    await this.redisClient.connect();
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    console.log('🔌 Redis disconnected');
  }

  /**
   * ⭐ CRITICAL: Get stock status with <10ms response (Redis-cached)
   */
  async getStockStatus(medicineId: string): Promise<StockInfo> {
    // 1. Try Redis cache first (<10ms)
    const cacheKey = `${this.CACHE_PREFIX}${medicineId}`;
    const cached = await this.redisClient.get(cacheKey);

    if (cached) {
      console.log(`✅ Cache HIT for medicine ${medicineId}`);
      return JSON.parse(cached);
    }

    console.log(`⚠️ Cache MISS for medicine ${medicineId} - Calculating...`);

    // 2. Calculate from database
    const stockInfo = await this.calculateStockFromDB(medicineId);

    // 3. Cache for 30 seconds
    await this.redisClient.setEx(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(stockInfo),
    );

    return stockInfo;
  }

  /**
   * Bulk stock check for prescription builder (checks cache for all)
   */
  async bulkStockCheck(medicineIds: string[]): Promise<StockInfo[]> {
    const results = await Promise.all(
      medicineIds.map((id) => this.getStockStatus(id)),
    );
    return results;
  }

  /**
   * Calculate stock from database (sum all batches)
   */
  private async calculateStockFromDB(medicineId: string): Promise<StockInfo> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
      include: {
        stockBatches: {
          orderBy: { expiryDate: 'asc' }, // FIFO by expiry
        },
      },
    });

    if (!medicine) {
      throw new Error(`Medicine ${medicineId} not found`);
    }

    // Sum all batches (accurate stock)
    const totalStock = medicine.stockBatches.reduce(
      (sum, batch) => sum + batch.quantity,
      0,
    );

    // Determine status and indicator
    let status: StockStatus;
    let indicator: '🟢' | '🟡' | '🔴';

    if (totalStock === 0) {
      status = StockStatus.OUT_OF_STOCK;
      indicator = '🔴';
    } else if (totalStock <= 10) {
      status = StockStatus.LOW_STOCK;
      indicator = '🟡';
    } else {
      status = StockStatus.IN_STOCK;
      indicator = '🟢';
    }

    return {
      medicineId: medicine.id,
      medicineName: medicine.name,
      currentStock: totalStock,
      status,
      indicator,
      batches: medicine.stockBatches.map((batch) => ({
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        expiryDate: batch.expiryDate,
      })),
    };
  }

  /**
   * Invalidate cache when stock changes
   */
  async invalidateCache(medicineId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${medicineId}`;
    await this.redisClient.del(cacheKey);
    console.log(`🗑️ Cache invalidated for medicine ${medicineId}`);
  }

  /**
   * Refresh cache manually (on-demand)
   */
  async refreshCache(medicineId: string): Promise<StockInfo> {
    await this.invalidateCache(medicineId);
    return this.getStockStatus(medicineId);
  }

  /**
   * Get low stock medicines (for alerts)
   */
  async getLowStockMedicines(): Promise<StockInfo[]> {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        currentStock: {
          lte: 10,
          gt: 0,
        },
      },
      include: {
        stockBatches: true,
      },
    });

    return Promise.all(
      medicines.map((med) => this.getStockStatus(med.id)),
    );
  }

  /**
   * Get out-of-stock medicines
   */
  async getOutOfStockMedicines(): Promise<StockInfo[]> {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        currentStock: 0,
      },
    });

    return Promise.all(
      medicines.map((med) => this.getStockStatus(med.id)),
    );
  }

  /**
   * Check if medicine has sufficient stock
   */
  async hasSufficientStock(
    medicineId: string,
    requiredQuantity: number,
  ): Promise<{ sufficient: boolean; available: number }> {
    const stockInfo = await this.getStockStatus(medicineId);

    return {
      sufficient: stockInfo.currentStock >= requiredQuantity,
      available: stockInfo.currentStock,
    };
  }
}
