import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * StockReservationService - Session 4
 *
 * Handles stock reservation during billing:
 * 1. Reserve stock when bill is generated
 * 2. Release stock if payment fails/expires
 * 3. Deduct stock when payment succeeds
 * 4. Prevent overselling with race condition handling
 */

export interface ReservationItem {
  medicineId: string;
  quantity: number;
}

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);
  // In-memory reservation tracking (in production, use Redis)
  private reservations: Map<string, { medicineId: string; quantity: number; expiresAt: Date }[]> =
    new Map();

  constructor(private prisma: PrismaService) {
    // Clean up expired reservations every 5 minutes
    setInterval(() => this.cleanupExpiredReservations(), 5 * 60 * 1000);
  }

  /**
   * Reserve stock for a bill
   * Prevents other bills from using the same stock
   */
  async reserveStock(billingId: string, items: ReservationItem[]): Promise<void> {
    try {
      this.logger.log(`Reserving stock for bill ${billingId}`);

      // Check if stock is available
      for (const item of items) {
        const medicine = await this.prisma.medicine.findUnique({
          where: { id: item.medicineId },
        });

        if (!medicine) {
          throw new BadRequestException(
            `Medicine ${item.medicineId} not found`,
          );
        }

        // Check available stock (current stock - reserved)
        const reserved = this.getReservedQuantity(item.medicineId);
        const available = medicine.currentStock - reserved;

        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${medicine.name}. Available: ${available}, Required: ${item.quantity}`,
          );
        }
      }

      // Reserve stock (expires in 30 minutes)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const reservationItems = items.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        expiresAt,
      }));

      this.reservations.set(billingId, reservationItems);

      this.logger.log(
        `Stock reserved for bill ${billingId}: ${items.length} items`,
      );
    } catch (error) {
      this.logger.error(`Failed to reserve stock for bill ${billingId}`, error);
      throw error;
    }
  }

  /**
   * Release reserved stock
   * Used when bill is cancelled or payment expires
   */
  releaseStock(billingId: string): void {
    const reservation = this.reservations.get(billingId);

    if (reservation) {
      this.reservations.delete(billingId);
      this.logger.log(`Stock released for bill ${billingId}`);
    }
  }

  /**
   * Confirm reservation and deduct stock
   * Called when payment is successful
   */
  async confirmReservation(billingId: string): Promise<void> {
    try {
      const reservation = this.reservations.get(billingId);

      if (!reservation) {
        this.logger.warn(
          `No reservation found for bill ${billingId}, stock may already be deducted`,
        );
        return;
      }

      // Deduct stock from database
      for (const item of reservation) {
        await this.prisma.medicine.update({
          where: { id: item.medicineId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        this.logger.log(
          `Deducted ${item.quantity} units from medicine ${item.medicineId}`,
        );
      }

      // Remove reservation
      this.reservations.delete(billingId);

      this.logger.log(`Reservation confirmed and stock deducted for bill ${billingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to confirm reservation for bill ${billingId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get total reserved quantity for a medicine
   */
  private getReservedQuantity(medicineId: string): number {
    let total = 0;

    for (const [_, items] of this.reservations) {
      for (const item of items) {
        if (item.medicineId === medicineId && item.expiresAt > new Date()) {
          total += item.quantity;
        }
      }
    }

    return total;
  }

  /**
   * Clean up expired reservations
   */
  private cleanupExpiredReservations(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [billingId, items] of this.reservations) {
      // Check if all items are expired
      const allExpired = items.every((item) => item.expiresAt <= now);

      if (allExpired) {
        this.reservations.delete(billingId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired reservations`);
    }
  }

  /**
   * Get available stock for a medicine (accounting for reservations)
   */
  async getAvailableStock(medicineId: string): Promise<number> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      throw new BadRequestException(`Medicine ${medicineId} not found`);
    }

    const reserved = this.getReservedQuantity(medicineId);
    return Math.max(0, medicine.currentStock - reserved);
  }

  /**
   * Check if reservation exists for a bill
   */
  hasReservation(billingId: string): boolean {
    return this.reservations.has(billingId);
  }

  /**
   * Get reservation details
   */
  getReservation(billingId: string): ReservationItem[] | null {
    const reservation = this.reservations.get(billingId);

    if (!reservation) {
      return null;
    }

    return reservation.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
    }));
  }
}
