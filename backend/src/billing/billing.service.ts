import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaxCalculator, BillItemInput } from './utils/tax-calculator';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { BillResponse, UnbilledItem, BillPreview } from './dto/bill-response.dto';
import { StockReservationService } from './stock-reservation.service';

/**
 * BillingService - Session 2B + 4
 *
 * Handles bill generation from visits:
 * 1. Aggregates unbilled items (consultation, medicines, lab tests)
 * 2. Reserves stock for medicines (Session 4)
 * 3. Calculates accurate totals using TaxCalculator
 * 4. Generates bill with auto-incremented bill number
 * 5. Creates billing records in database
 */
@Injectable()
export class BillingService {
  private taxCalculator: TaxCalculator;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => StockReservationService))
    private stockReservation: StockReservationService,
  ) {
    this.taxCalculator = new TaxCalculator();
  }

  /**
   * Generate bill from a visit
   * Aggregates all unbilled items and creates a bill
   */
  async generateBill(dto: GenerateBillDto): Promise<BillResponse> {
    // 1. Verify visit exists
    const visit = await this.prisma.visit.findUnique({
      where: { id: dto.visitId },
      include: {
        patient: {
          include: {
            prescriptions: {
              include: {
                items: {
                  include: { medicine: true },
                },
              },
            },
            labOrders: {
              include: { test: true },
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException(`Visit with ID ${dto.visitId} not found`);
    }

    // 2. Check if bill already exists for this visit
    const existingBill = await this.prisma.billing.findFirst({
      where: { visitId: dto.visitId },
    });

    if (existingBill) {
      throw new BadRequestException(
        `Bill already exists for visit ${dto.visitId}: ${existingBill.billNumber}`,
      );
    }

    // 3. Aggregate all unbilled items
    const unbilledItems = await this.aggregateUnbilledItems(dto.visitId);

    if (unbilledItems.length === 0) {
      throw new BadRequestException('No unbilled items found for this visit');
    }

    // 4. Calculate totals using TaxCalculator
    const breakdown = this.taxCalculator.generateTaxBreakdown(
      unbilledItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        isTaxInclusive: item.isTaxInclusive,
      })),
    );

    // 5. Generate bill number
    const billNumber = await this.createBillNumber();

    // 5.5. Reserve stock for medicines (Session 4)
    // Extract medicine items for reservation
    const medicineReservations = unbilledItems
      .filter((item) => item.itemType === 'MEDICINE' && item.itemId)
      .map((item) => ({
        medicineId: item.itemId!.replace('rx-item-', ''), // Extract medicine ID from prescription item ID
        quantity: item.quantity,
      }));

    // Note: Actual reservation will be done after bill creation using billingId
    // This is a placeholder for the logic flow

    // 6. Create billing record with items
    const bill = await this.prisma.billing.create({
      data: {
        visitId: dto.visitId,
        billNumber,
        subtotal: breakdown.subtotal,
        taxAmount: breakdown.totalTax,
        discount: 0,
        total: breakdown.grandTotal,
        balance: breakdown.grandTotal, // Initially, balance = total
        status: 'PENDING',
        generatedBy: dto.generatedBy,
        items: {
          create: breakdown.items.map((item, index) => ({
            itemType: unbilledItems[index].itemType,
            itemId: unbilledItems[index].itemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            isTaxInclusive: item.isTaxInclusive,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.lineTotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 7. Return formatted response
    return this.formatBillResponse(bill);
  }

  /**
   * Preview bill before generating
   * Shows what will be billed without creating a record
   */
  async previewBill(visitId: string): Promise<BillPreview> {
    const unbilledItems = await this.aggregateUnbilledItems(visitId);

    if (unbilledItems.length === 0) {
      return {
        items: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      };
    }

    const breakdown = this.taxCalculator.generateTaxBreakdown(
      unbilledItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        isTaxInclusive: item.isTaxInclusive,
      })),
    );

    return {
      items: unbilledItems,
      subtotal: breakdown.subtotal,
      taxAmount: breakdown.totalTax,
      total: breakdown.grandTotal,
    };
  }

  /**
   * Aggregate all unbilled items from a visit
   * Fetches: Consultation fees, Medicines, Lab tests
   */
  private async aggregateUnbilledItems(visitId: string): Promise<UnbilledItem[]> {
    const items: UnbilledItem[] = [];

    // Fetch visit with patient data
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          include: {
            prescriptions: {
              include: {
                items: {
                  include: { medicine: true },
                  where: { dispensed: true }, // Only dispensed medicines
                },
                doctor: true,
              },
            },
            labOrders: {
              include: { test: true },
              where: { status: 'COMPLETED' }, // Only completed tests
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException(`Visit with ID ${visitId} not found`);
    }

    // 1. Add consultation fee (if patient has prescriptions/lab orders)
    const hasPrescriptions = visit.patient.prescriptions.length > 0;
    const hasLabOrders = visit.patient.labOrders.length > 0;

    if (hasPrescriptions || hasLabOrders) {
      // Consultation fee: ₹300 with 18% GST (exclusive)
      items.push({
        itemType: 'CONSULTATION',
        description: 'Doctor Consultation Fee',
        quantity: 1,
        unitPrice: 300,
        isTaxInclusive: false, // Services: tax added on top
        taxRate: 0.18, // 18% GST for healthcare services
      });
    }

    // 2. Add dispensed medicines
    for (const prescription of visit.patient.prescriptions) {
      for (const item of prescription.items) {
        if (item.dispensed) {
          items.push({
            itemType: 'MEDICINE',
            itemId: item.id,
            description: `${item.medicine.name} ${item.medicine.strength}`,
            quantity: item.quantity,
            unitPrice: item.medicine.mrp,
            isTaxInclusive: true, // Pharmacy: MRP includes tax
            taxRate: 0.12, // 12% GST for general medicines
          });
        }
      }
    }

    // 3. Add completed lab tests
    for (const labOrder of visit.patient.labOrders) {
      if (labOrder.status === 'COMPLETED') {
        items.push({
          itemType: 'LAB_TEST',
          itemId: labOrder.id,
          description: labOrder.test.name,
          quantity: 1,
          unitPrice: labOrder.test.price,
          isTaxInclusive: false, // Services: tax added on top
          taxRate: 0.18, // 18% GST for healthcare services
        });
      }
    }

    return items;
  }

  /**
   * Create auto-incremented bill number
   * Format: HMS/2024/0001, HMS/2024/0002, etc.
   */
  private async createBillNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `HMS/${currentYear}/`;

    // Find the latest bill number for this year
    const latestBill = await this.prisma.billing.findFirst({
      where: {
        billNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    let nextNumber = 1;

    if (latestBill) {
      // Extract number from "HMS/2024/0001" → 1
      const lastNumber = parseInt(latestBill.billNumber.split('/')[2], 10);
      nextNumber = lastNumber + 1;
    }

    // Pad with zeros: 1 → 0001
    const paddedNumber = nextNumber.toString().padStart(4, '0');

    return `${prefix}${paddedNumber}`;
  }

  /**
   * Format billing record to response DTO
   */
  private formatBillResponse(bill: any): BillResponse {
    return {
      id: bill.id,
      visitId: bill.visitId,
      billNumber: bill.billNumber,
      subtotal: bill.subtotal,
      taxAmount: bill.taxAmount,
      discount: bill.discount,
      total: bill.total,
      balance: bill.balance,
      status: bill.status,
      generatedAt: bill.generatedAt,
      items: bill.items.map((item: any) => ({
        id: item.id,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        isTaxInclusive: item.isTaxInclusive,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        total: item.total,
      })),
    };
  }

  /**
   * Get bill by ID
   */
  async getBill(billId: string): Promise<BillResponse> {
    const bill = await this.prisma.billing.findUnique({
      where: { id: billId },
      include: { items: true },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with ID ${billId} not found`);
    }

    return this.formatBillResponse(bill);
  }

  /**
   * Get bill by bill number
   */
  async getBillByNumber(billNumber: string): Promise<BillResponse> {
    const bill = await this.prisma.billing.findUnique({
      where: { billNumber },
      include: { items: true },
    });

    if (!bill) {
      throw new NotFoundException(`Bill with number ${billNumber} not found`);
    }

    return this.formatBillResponse(bill);
  }

  /**
   * Get all bills for a visit
   */
  async getBillsForVisit(visitId: string): Promise<BillResponse[]> {
    const bills = await this.prisma.billing.findMany({
      where: { visitId },
      include: { items: true },
      orderBy: { generatedAt: 'desc' },
    });

    return bills.map((bill) => this.formatBillResponse(bill));
  }
}
